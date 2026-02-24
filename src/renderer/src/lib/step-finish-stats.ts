import type { Part } from '@opencode-ai/sdk/client';
import type { ChatMessage } from './opencode-types';

export interface StepFinishStats {
  cost: number;
  tokens: { input: number; output: number; reasoning: number };
}

/**
 * Extracts cost and token counts from a single step-finish part.
 * Returns null if the part is not a step-finish part.
 */
export function extractStepFinishStats(part: Part): StepFinishStats | null {
  if (part.type !== 'step-finish') return null;

  const stepPart = part as unknown as Record<string, unknown>;
  const cost = typeof stepPart.cost === 'number' ? stepPart.cost : 0;

  const tokens = stepPart.tokens as
    | { input?: number; output?: number; reasoning?: number }
    | undefined;

  return {
    cost,
    tokens: {
      input: typeof tokens?.input === 'number' ? tokens.input : 0,
      output: typeof tokens?.output === 'number' ? tokens.output : 0,
      reasoning: typeof tokens?.reasoning === 'number' ? tokens.reasoning : 0,
    },
  };
}

/**
 * Accumulates cost and token stats across all step-finish parts in messages.
 */
export function accumulateStepFinishStats(messages: ChatMessage[]): StepFinishStats {
  const totals: StepFinishStats = {
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0 },
  };

  for (const msg of messages) {
    for (const part of msg.parts) {
      const stats = extractStepFinishStats(part);
      if (stats) {
        totals.cost += stats.cost;
        totals.tokens.input += stats.tokens.input;
        totals.tokens.output += stats.tokens.output;
        totals.tokens.reasoning += stats.tokens.reasoning;
      }
    }
  }

  return totals;
}
