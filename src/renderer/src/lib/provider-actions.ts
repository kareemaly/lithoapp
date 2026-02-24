import type { OpencodeClient, PingResult } from '../lib/opencode-client-types';

export interface OAuthStartResult {
  url: string;
  instructions: string;
  method: 'auto' | 'code';
}

export async function connectWithApiKey(
  client: OpencodeClient,
  providerId: string,
  apiKey: string,
): Promise<void> {
  const { error } = await client.auth.set({
    path: { id: providerId },
    body: { type: 'api', key: apiKey.trim() },
  });
  if (error) throw new Error('Failed to set API key');
  await client.instance.dispose();
}

export async function disconnectProvider(
  client: OpencodeClient,
  baseUrl: string,
  providerId: string,
): Promise<void> {
  await fetch(`${baseUrl}/auth/${providerId}`, { method: 'DELETE' });
  await client.instance.dispose();
}

export async function startOAuth(
  client: OpencodeClient,
  providerId: string,
  method: number,
): Promise<OAuthStartResult> {
  const { data, error } = await client.provider.oauth.authorize({
    path: { id: providerId },
    body: { method },
  });
  if (error || !data) throw new Error('Failed to start OAuth');
  return { url: data.url, instructions: data.instructions, method: data.method };
}

export async function completeOAuth(
  client: OpencodeClient,
  providerId: string,
  method: number,
  code?: string,
): Promise<void> {
  const { error } = await client.provider.oauth.callback({
    path: { id: providerId },
    body: { method, code: code?.trim() },
  });
  if (error) throw new Error('Failed to complete OAuth');
  await client.instance.dispose();
}

export async function pingProvider(
  client: OpencodeClient,
  providerId: string,
  modelId: string,
): Promise<PingResult> {
  const { data: session, error: sessionErr } = await client.session.create({ body: {} });
  if (sessionErr || !session) throw new Error('Failed to create session');

  const sessionId = session.id;
  try {
    const { data: response, error: msgErr } = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: 'text', text: 'Reply with only the word Pong. Nothing else.' }],
        model: { providerID: providerId, modelID: modelId },
      },
    });
    if (msgErr || !response) throw new Error('Failed to send message');

    const text =
      response.parts
        .filter((p) => p.type === 'text')
        .map((p) => ('text' in p ? String(p.text) : ''))
        .join('') || '(empty)';

    return {
      text,
      modelID: response.info.modelID,
      latencyMs: (response.info.time.completed ?? Date.now()) - response.info.time.created,
      tokens: response.info.tokens,
      cost: response.info.cost,
      finish: response.info.finish ?? 'unknown',
    };
  } finally {
    void client.session.delete({ path: { id: sessionId } }).catch(() => {
      /* Session cleanup — best-effort */
    });
  }
}
