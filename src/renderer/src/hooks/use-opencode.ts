import { createOpencodeClient } from '@opencode-ai/sdk/client';
import { useEffect, useMemo, useState } from 'react';

type ConnectionStatus = 'waiting' | 'connected' | 'error';

interface OpencodeConnection {
  client: ReturnType<typeof createOpencodeClient> | null;
  baseUrl: string | null;
  status: ConnectionStatus;
}

function deriveConnection(info: { status: string; port?: number }): {
  status: ConnectionStatus;
  baseUrl: string | null;
} {
  if (info.status === 'running' && info.port) {
    return { status: 'connected', baseUrl: `http://127.0.0.1:${info.port}` };
  }
  if (info.status === 'failed') {
    return { status: 'error', baseUrl: null };
  }
  return { status: 'waiting', baseUrl: null };
}

export function useOpencode(): OpencodeConnection {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('waiting');

  useEffect(() => {
    void (async () => {
      try {
        const info = await window.litho.opencode.getStatus();
        const conn = deriveConnection(info);
        setStatus(conn.status);
        setBaseUrl(conn.baseUrl);
      } catch {
        setStatus('error');
      }
    })();

    const unsubscribe = window.litho.opencode.onStatusChange((info) => {
      const conn = deriveConnection(info);
      setStatus(conn.status);
      setBaseUrl(conn.baseUrl);
    });

    return unsubscribe;
  }, []);

  const client = useMemo(() => {
    if (!baseUrl) return null;
    return createOpencodeClient({ baseUrl });
  }, [baseUrl]);

  return { client, baseUrl, status };
}
