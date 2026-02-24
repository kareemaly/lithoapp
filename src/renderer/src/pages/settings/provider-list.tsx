import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useProviderList } from '@/hooks/use-provider-list';
import type { OpencodeClient } from '@/lib/opencode-client-types';
import { ProviderRow } from './provider-row';

export function ProviderList({
  client,
  baseUrl,
}: {
  client: OpencodeClient;
  baseUrl: string;
}): React.JSX.Element {
  const {
    providers,
    authMethods,
    connectedProviders,
    availableProviders,
    loading,
    error,
    refetch,
  } = useProviderList(client);
  const [search, setSearch] = useState('');

  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return availableProviders;
    const q = search.toLowerCase();
    return availableProviders.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [availableProviders, search]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading providers...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !providers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error || 'Failed to load providers'}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Providers</CardTitle>
      </CardHeader>
      <CardContent>
        {connectedProviders.length > 0 && (
          <>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Connected
            </div>
            {connectedProviders.map((provider, i) => (
              <div key={provider.id}>
                {i > 0 && <Separator />}
                <ProviderRow
                  provider={provider}
                  isConnected
                  defaultModel={providers.default[provider.id]}
                  authMethods={authMethods[provider.id] ?? []}
                  client={client}
                  baseUrl={baseUrl}
                  onRefresh={refetch}
                />
              </div>
            ))}
          </>
        )}

        {connectedProviders.length > 0 && availableProviders.length > 0 && (
          <Separator className="my-3" />
        )}

        {availableProviders.length > 0 && (
          <>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Available
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            {filteredAvailable.map((provider, i) => (
              <div key={provider.id}>
                {i > 0 && <Separator />}
                <ProviderRow
                  provider={provider}
                  isConnected={false}
                  authMethods={authMethods[provider.id] ?? []}
                  client={client}
                  baseUrl={baseUrl}
                  onRefresh={refetch}
                />
              </div>
            ))}
            {filteredAvailable.length === 0 && search.trim() && (
              <p className="py-3 text-center text-sm text-muted-foreground">
                No providers matching &ldquo;{search}&rdquo;
              </p>
            )}
          </>
        )}

        {providers.all.length === 0 && (
          <p className="text-sm text-muted-foreground">No providers available.</p>
        )}
      </CardContent>
    </Card>
  );
}
