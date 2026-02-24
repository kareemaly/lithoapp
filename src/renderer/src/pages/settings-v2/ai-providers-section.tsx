import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOpencode } from '@/hooks/use-opencode';
import { loadChatPrefs, saveChatPrefs } from '@/lib/chat-prefs';
import type { OpencodeClient, ProviderInfo } from '@/lib/opencode-client-types';
import { ProviderList } from '@/pages/settings/provider-list';

function DefaultModelSelector({ client }: { client: OpencodeClient }): React.JSX.Element {
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const prefs = loadChatPrefs();
    setProviderId(prefs.providerId);
    setModelId(prefs.modelId);
  }, []);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const { data } = await client.provider.list();
      if (data) {
        setProviders(data.all);
        setConnectedIds(data.connected);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  const connectedProviders = providers.filter((p) => connectedIds.includes(p.id));
  const selectedProvider = connectedProviders.find((p) => p.id === providerId);
  const models = selectedProvider ? Object.values(selectedProvider.models) : [];

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Failed to load providers
        <Button variant="outline" size="sm" onClick={() => void fetchProviders()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading providers...</p>;
  }

  function handleProviderChange(newProviderId: string): void {
    setProviderId(newProviderId);
    setModelId('');
    saveChatPrefs({ providerId: newProviderId, modelId: '' });
  }

  function handleModelChange(newModelId: string): void {
    setModelId(newModelId);
    saveChatPrefs({ providerId, modelId: newModelId });
  }

  if (connectedProviders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Connect a provider above to set a default model.
      </p>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Provider</span>
        <select
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={providerId}
          onChange={(e) => handleProviderChange(e.target.value)}
        >
          <option value="">-- select --</option>
          {connectedProviders.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Model</span>
        <select
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={modelId}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={!providerId}
        >
          <option value="">-- select --</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function AiProvidersSection(): React.JSX.Element {
  const { client, baseUrl, status } = useOpencode();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">AI Providers</h2>
        <p className="text-sm text-muted-foreground">
          Connect AI providers and set your default model.
        </p>
      </div>

      {status === 'connected' && client && baseUrl && (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Default model</h3>
            <DefaultModelSelector client={client} />
          </div>

          <ProviderList client={client} baseUrl={baseUrl} />
        </>
      )}
    </div>
  );
}
