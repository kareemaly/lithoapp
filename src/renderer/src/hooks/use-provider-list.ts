import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  OpencodeClient,
  ProviderAuthMethod,
  ProviderInfo,
  ProviderListData,
} from '../lib/opencode-client-types';

export interface ProviderListState {
  providers: ProviderListData | null;
  authMethods: Record<string, ProviderAuthMethod[]>;
  connectedProviders: ProviderInfo[];
  availableProviders: ProviderInfo[];
  loading: boolean;
  error: string;
  refetch(): void;
}

export function useProviderList(client: OpencodeClient): ProviderListState {
  const [providers, setProviders] = useState<ProviderListData | null>(null);
  const [authMethods, setAuthMethods] = useState<Record<string, ProviderAuthMethod[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listResult, authResult] = await Promise.all([
        client.provider.list(),
        client.provider.auth(),
      ]);
      if (listResult.error || !listResult.data) throw new Error('Provider list failed');
      if (authResult.error || !authResult.data) throw new Error('Auth methods failed');
      setProviders(listResult.data);
      setAuthMethods(authResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const connectedProviders = useMemo(
    () => providers?.all.filter((p) => providers.connected.includes(p.id)) ?? [],
    [providers],
  );

  const availableProviders = useMemo(
    () => providers?.all.filter((p) => !providers.connected.includes(p.id)) ?? [],
    [providers],
  );

  return {
    providers,
    authMethods,
    connectedProviders,
    availableProviders,
    loading,
    error,
    refetch: fetchData,
  };
}
