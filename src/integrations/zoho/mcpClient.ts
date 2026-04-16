import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: JsonRpcError;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export interface ZohoMcpCall {
  tool: string;
  arguments: Record<string, unknown>;
}

function createMcpError(message: string, details?: unknown): Error {
  const detailString = details ? ` (${JSON.stringify(details)})` : '';
  return new Error(`[Zoho MCP] ${message}${detailString}`);
}

class ZohoMcpClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private buffer = '';
  private started = false;

  private serverCommand(): { command: string; args: string[] } {
    const explicitCommand = process.env.ZOHO_MCP_COMMAND;
    if (explicitCommand && explicitCommand.trim()) {
      return { command: explicitCommand.trim(), args: [] };
    }

    const pythonBin = process.env.ZOHO_MCP_PYTHON_BIN?.trim() || 'python3';
    const serverPath = process.env.ZOHO_MCP_SERVER_PATH?.trim() || 'mcp/zoho_server/server.py';
    return { command: pythonBin, args: [serverPath] };
  }

  private ensureProcess(): ChildProcessWithoutNullStreams {
    if (this.process) {
      return this.process;
    }

    const { command, args } = this.serverCommand();
    const child = spawn(command, args, {
      stdio: 'pipe',
      cwd: process.cwd(),
      env: process.env,
    });

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => this.handleStdout(chunk));

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      const text = chunk.trim();
      if (text.length > 0) {
        console.warn(`[Zoho MCP stderr] ${text}`);
      }
    });

    child.on('exit', (code, signal) => {
      const reason = `Zoho MCP process exited (code=${code}, signal=${signal})`;
      const error = createMcpError(reason);
      for (const [, pending] of this.pending.entries()) {
        pending.reject(error);
      }
      this.pending.clear();
      this.process = null;
      this.started = false;
      this.buffer = '';
    });

    this.process = child;
    return child;
  }

  private handleStdout(chunk: string): void {
    this.buffer += chunk;

    while (true) {
      const newline = this.buffer.indexOf('\n');
      if (newline < 0) {
        return;
      }

      const line = this.buffer.slice(0, newline).trim();
      this.buffer = this.buffer.slice(newline + 1);
      if (!line) {
        continue;
      }

      let message: JsonRpcResponse;
      try {
        message = JSON.parse(line) as JsonRpcResponse;
      } catch {
        continue;
      }

      if (typeof message.id !== 'number') {
        continue;
      }

      const pending = this.pending.get(message.id);
      if (!pending) {
        continue;
      }

      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(createMcpError(message.error.message, message.error.data));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const child = this.ensureProcess();
    const id = this.nextId;
    this.nextId += 1;

    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const serialized = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      child.stdin.write(`${serialized}\n`, (error) => {
        if (!error) {
          return;
        }
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'call-gpt-modernized', version: '2.0.0' },
    });
    this.started = true;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    await this.ensureInitialized();
    const result = await this.send('tools/call', {
      name,
      arguments: args,
    });

    return result;
  }
}

const singletonClient = new ZohoMcpClient();

export async function callZohoMcpTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  return singletonClient.callTool(name, args);
}

export function normalizeMcpToolResult<T>(result: unknown): T {
  if (typeof result === 'object' && result && 'content' in (result as Record<string, unknown>)) {
    const content = (result as { content?: Array<{ type?: string; text?: string }> }).content;
    const textBlock = Array.isArray(content) ? content.find((item) => item?.type === 'text' && typeof item.text === 'string') : undefined;

    if (textBlock?.text) {
      return JSON.parse(textBlock.text) as T;
    }
  }

  return result as T;
}
