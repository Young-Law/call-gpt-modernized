import { toolDefinitions } from './tool-definitions.js';
import type { ToolManifest } from '../types/index.js';

export const tools: ToolManifest[] = toolDefinitions.map((definition) => ({
  type: 'function' as const,
  function: {
    name: definition.name,
    say: definition.say,
    description: definition.description,
    parameters: definition.parameters,
    returns: definition.returns,
  },
}));

export default tools;
