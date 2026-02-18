import { toolDefinitions } from '../src/tools/tool-definitions.js';
import { toolRegistry, getToolHandler } from '../src/tools/registry.js';
import tools from '../src/tools/manifest.js';

describe('Tool Definitions', () => {
  it('should have valid tool definitions', () => {
    expect(toolDefinitions).toBeDefined();
    expect(toolDefinitions.length).toBeGreaterThan(0);
  });

  it('each tool should have required properties', () => {
    toolDefinitions.forEach((tool) => {
      expect(tool.name).toBeDefined();
      expect(tool.handlerPath).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
      expect(tool.returns).toBeDefined();
    });
  });

  it('each tool should have a registered handler', () => {
    toolDefinitions.forEach((tool) => {
      expect(toolRegistry[tool.name]).toBeDefined();
    });
  });
});

describe('Tool Registry', () => {
  it('should throw for unregistered tools', () => {
    expect(() => getToolHandler('nonExistentTool')).toThrow();
  });

  it('should return handler for registered tools', () => {
    toolDefinitions.forEach((tool) => {
      const handler = getToolHandler(tool.name);
      expect(typeof handler).toBe('function');
    });
  });
});

describe('Tool Manifest', () => {
  it('should generate OpenAI-compatible tool definitions', () => {
    expect(tools).toBeDefined();
    expect(Array.isArray(tools)).toBe(true);
    
    tools.forEach((tool) => {
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBeDefined();
      expect(tool.function.description).toBeDefined();
      expect(tool.function.parameters).toBeDefined();
    });
  });

  it('should have matching tool names between definitions and manifest', () => {
    const definitionNames = toolDefinitions.map(t => t.name).sort();
    const manifestNames = tools.map(t => t.function.name).sort();
    
    expect(definitionNames).toEqual(manifestNames);
  });
});
