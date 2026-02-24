import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { useProviderList } from '@/hooks/use-provider-list';
import type { OpencodeClient, ProviderInfo } from '@/lib/opencode-client-types';
import { cn } from '@/lib/utils';
import { ConnectDialog } from '../settings/connect-dialog';

const ZEN_ID = 'opencode';
const FEATURED_IDS = ['anthropic', 'openai', 'google', 'github-copilot'];

function ZenCard({
  provider,
  isConnected,
}: {
  provider: ProviderInfo;
  isConnected: boolean;
}): React.JSX.Element {
  const modelNames = Object.values(provider.models).map((m) => m.name);
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{provider.name}</span>
          <Badge variant="outline" className="border-primary/40 px-1.5 text-[10px] text-primary">
            Free
          </Badge>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-500" />
            Active
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {modelNames.join(' · ')}
      </p>
    </div>
  );
}

function FeaturedCard({
  provider,
  isConnected,
  onConnect,
}: {
  provider: ProviderInfo;
  isConnected: boolean;
  onConnect: () => void;
}): React.JSX.Element {
  const modelCount = Object.keys(provider.models).length;
  return (
    <div
      role={isConnected ? undefined : 'button'}
      tabIndex={isConnected ? undefined : 0}
      onClick={isConnected ? undefined : onConnect}
      onKeyDown={
        isConnected
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') onConnect();
            }
      }
      className={cn(
        'flex flex-col gap-1 rounded-lg border p-3 transition-colors',
        isConnected
          ? 'border-primary/40 bg-primary/5'
          : 'cursor-pointer border-border hover:border-primary/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight">{provider.name}</span>
        {isConnected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {modelCount} model{modelCount !== 1 ? 's' : ''}
      </p>
      {isConnected ? (
        <p className="mt-0.5 text-[11px] font-medium text-primary">Connected</p>
      ) : (
        <p className="mt-0.5 text-[11px] text-muted-foreground">Connect →</p>
      )}
    </div>
  );
}

function CompactRow({
  provider,
  isConnected,
  onConnect,
}: {
  provider: ProviderInfo;
  isConnected: boolean;
  onConnect: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
      <span className="text-sm">{provider.name}</span>
      {isConnected ? (
        <span className="flex items-center gap-1 text-[11px] text-primary">
          <Check className="h-3 w-3" />
          Connected
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground"
        >
          Connect →
        </button>
      )}
    </div>
  );
}

export function ProviderPicker({
  client,
  onModelsChange,
}: {
  client: OpencodeClient;
  onModelsChange?: (count: number) => void;
}): React.JSX.Element {
  const { providers, authMethods, loading, error, refetch } = useProviderList(client);
  const [dialogProvider, setDialogProvider] = useState<ProviderInfo | null>(null);
  const [search, setSearch] = useState('');

  const zenProvider = useMemo(
    () => providers?.all.find((p) => p.id === ZEN_ID) ?? null,
    [providers],
  );

  const featuredProviders = useMemo(
    () => FEATURED_IDS.flatMap((id) => providers?.all.find((p) => p.id === id) ?? []),
    [providers],
  );

  const otherProviders = useMemo(
    () => providers?.all.filter((p) => p.id !== ZEN_ID && !FEATURED_IDS.includes(p.id)) ?? [],
    [providers],
  );

  const filteredOther = useMemo(() => {
    if (!search.trim()) return otherProviders;
    const q = search.toLowerCase();
    return otherProviders.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [otherProviders, search]);

  const totalModels = useMemo(() => {
    if (!providers) return 0;
    return providers.connected.reduce((sum, id) => {
      const p = providers.all.find((pr) => pr.id === id);
      return sum + (p ? Object.keys(p.models).length : 0);
    }, 0);
  }, [providers]);

  useEffect(() => {
    onModelsChange?.(totalModels);
  }, [totalModels, onModelsChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading providers...
      </div>
    );
  }

  if (error || !providers) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || 'Failed to load providers'}
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  const isConnected = (id: string): boolean => providers.connected.includes(id);

  return (
    <div className="flex flex-col gap-5">
      {zenProvider && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Included with Litho
          </p>
          <ZenCard provider={zenProvider} isConnected={isConnected(ZEN_ID)} />
        </div>
      )}

      {featuredProviders.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Popular providers
          </p>
          <div className="grid grid-cols-2 gap-2">
            {featuredProviders.map((provider) => (
              <FeaturedCard
                key={provider.id}
                provider={provider}
                isConnected={isConnected(provider.id)}
                onConnect={() => setDialogProvider(provider)}
              />
            ))}
          </div>
        </div>
      )}

      {otherProviders.length > 0 && (
        <div>
          <SearchInput
            placeholder={`Search ${otherProviders.length}+ providers...`}
            value={search}
            onChange={setSearch}
            size="sm"
            className="mb-2"
          />
          <div>
            {filteredOther.map((provider) => (
              <CompactRow
                key={provider.id}
                provider={provider}
                isConnected={isConnected(provider.id)}
                onConnect={() => setDialogProvider(provider)}
              />
            ))}
            {filteredOther.length === 0 && search.trim() && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No providers matching &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {dialogProvider && (
        <ConnectDialog
          provider={dialogProvider}
          authMethods={authMethods[dialogProvider.id] ?? []}
          client={client}
          open
          onOpenChange={(open) => {
            if (!open) setDialogProvider(null);
          }}
          onConnected={refetch}
        />
      )}
    </div>
  );
}
