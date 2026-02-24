import { designSystemConfig } from './design-system/config';
import designSystemPrompt from './design-system/prompt.md?raw';
import { documentConfig } from './document/config';
import documentPrompt from './document/prompt.md?raw';

export const agentConfigs = {
  'design-system': { ...designSystemConfig, prompt: designSystemPrompt },
  document: { ...documentConfig, prompt: documentPrompt },
};
