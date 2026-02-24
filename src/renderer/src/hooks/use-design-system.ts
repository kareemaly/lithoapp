import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { DesignSystem } from '@/lib/design-system-types';

export interface UseDesignSystemReturn {
  designSystem: DesignSystem | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTokens: (updates: Array<{ variable: string; value: string }>) => Promise<void>;
}

export function useDesignSystem(serverUrl: string | null): UseDesignSystemReturn {
  const [designSystem, setDesignSystem] = useState<DesignSystem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchDesignSystem = useCallback(async () => {
    if (!serverUrl) return;
    // Only show loading spinner on initial fetch, not refetches
    if (!hasFetched.current) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/design-system`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDesignSystem(data);
      hasFetched.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch design system');
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  useEffect(() => {
    if (!serverUrl) {
      setDesignSystem(null);
      hasFetched.current = false;
      return;
    }
    setDesignSystem(null);
    setError(null);
    hasFetched.current = false;
    fetchDesignSystem();
  }, [serverUrl, fetchDesignSystem]);

  const updateTokens = useCallback(
    async (updates: Array<{ variable: string; value: string }>) => {
      if (!serverUrl) return;
      try {
        const res = await fetch(`${serverUrl}/api/design-system`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        await fetchDesignSystem();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update tokens';
        toast.error(message);
      }
    },
    [serverUrl, fetchDesignSystem],
  );

  return { designSystem, loading, error, refetch: fetchDesignSystem, updateTokens };
}
