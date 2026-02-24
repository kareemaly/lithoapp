import type { createOpencodeClient } from '@opencode-ai/sdk/client';

export type { ProviderAuthMethod } from '@opencode-ai/sdk/client';

export type OpencodeClient = ReturnType<typeof createOpencodeClient>;

export interface ProviderInfo {
  id: string;
  name: string;
  models: Record<string, { id: string; name: string }>;
}

export interface ProviderListData {
  all: ProviderInfo[];
  default: Record<string, string>;
  connected: string[];
}

export interface PingResult {
  text: string;
  modelID: string;
  latencyMs: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  cost: number;
  finish: string;
}
