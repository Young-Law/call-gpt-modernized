import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toolDefinitions } from './tool-definitions.js';
import type { ToolRegistry, ToolHandler } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function lazyHandler(handlerPath: string): ToolHandler {
  const modulePath = path.join(__dirname, handlerPath);
  return async (...args: Parameters<ToolHandler>) => {
    const handler = await import(modulePath);
    return handler.default(...args);
  };
}

export const toolRegistry: ToolRegistry = toolDefinitions.reduce<ToolRegistry>(
  (registry, definition) => {
    registry[definition.name] = lazyHandler(definition.handlerPath);
    return registry;
  },
  {}
);

export function getToolHandler(name: string): ToolHandler {
  const handler = toolRegistry[name];
  if (!handler) {
    throw new Error(`No handler registered for tool: ${name}`);
  }
  return handler;
}
