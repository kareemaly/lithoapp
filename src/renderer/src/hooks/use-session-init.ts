import { useEffect, useState } from 'react';
import type { OpencodeClient } from '../lib/opencode-client-types';

interface UseSessionInitOptions {
  client: OpencodeClient | null;
  storageKey: string;
  sessionTitle: string;
  resetKey: number;
}

interface UseSessionInitResult {
  sessionId: string | null;
  creating: boolean;
  createError: string | null;
}

export function useSessionInit({
  client,
  storageKey,
  sessionTitle,
  resetKey,
}: UseSessionInitOptions): UseSessionInitResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: storageKey/sessionTitle trigger on context change; resetKey is an intentional user-initiated reset trigger
  useEffect(() => {
    if (!client) return;

    let cancelled = false;

    const init = async () => {
      setCreating(true);
      setCreateError(null);
      setSessionId(null);

      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSessionId(stored);
        setCreating(false);
        return;
      }

      try {
        const { data, error } = await client.session.create({
          body: { title: sessionTitle },
        });
        if (cancelled) return;
        if (error || !data) throw new Error('Failed to create session');
        localStorage.setItem(storageKey, data.id);
        setSessionId(data.id);
      } catch (e) {
        if (!cancelled) {
          setCreateError(e instanceof Error ? e.message : 'Failed to create session');
        }
      } finally {
        if (!cancelled) setCreating(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [client, storageKey, sessionTitle, resetKey]);

  return { sessionId, creating, createError };
}
