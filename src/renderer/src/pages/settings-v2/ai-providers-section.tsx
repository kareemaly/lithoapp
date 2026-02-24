import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load providers
        <Button
          variant="outline"
          className="h-10 px-4 text-sm"
          onClick={() => void fetchProviders()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading providers...
      </div>
    );
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
        Connect a provider below to set a default model.
      </p>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Provider</span>
        <Select value={providerId} onValueChange={handleProviderChange}>
          <SelectTrigger className="h-11 w-full text-sm">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            {connectedProviders.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Model</span>
        <Select value={modelId} onValueChange={handleModelChange} disabled={!providerId}>
          <SelectTrigger className="h-11 w-full text-sm">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function AiProvidersSection(): React.JSX.Element {
  const { client, baseUrl, status } = useOpencode();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold">AI Providers</h2>
        <p className="text-sm text-muted-foreground">
          Connect AI providers and set your default model.
        </p>
      </div>

      {status === 'connected' && client && baseUrl && (
        <>
          <div className="flex max-w-lg flex-col gap-3">
            <h3 className="text-sm font-medium">Default model</h3>
            <DefaultModelSelector client={client} />
          </div>

          <ProviderList client={client} baseUrl={baseUrl} />
        </>
      )}
    </div>
  );
}
