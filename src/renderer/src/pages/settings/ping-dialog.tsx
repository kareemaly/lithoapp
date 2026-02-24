import { AlertCircle, Loader2, Search, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { OpencodeClient, PingResult, ProviderInfo } from '@/lib/opencode-client-types';
import { pingProvider } from '@/lib/provider-actions';

export function PingDialog({
  provider,
  defaultModel,
  client,
  open,
  onOpenChange,
}: {
  provider: ProviderInfo;
  defaultModel?: string;
  client: OpencodeClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const models = Object.values(provider.models);
  const [selectedModel, setSelectedModel] = useState(defaultModel ?? models[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);
  const [error, setError] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setResult(null);
      setError('');
      setModelSearch('');
      setSelectedModel(defaultModel ?? models[0]?.id ?? '');
    }
  }, [open, defaultModel, models]);

  const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models;
    const q = modelSearch.toLowerCase();
    return models.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [models, modelSearch]);

  const handlePing = useCallback(async () => {
    if (!selectedModel) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      setResult(await pingProvider(client, provider.id, selectedModel));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setLoading(false);
    }
  }, [client, provider.id, selectedModel]);

  const selectedModelName = provider.models[selectedModel]?.name ?? selectedModel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ping {provider.name}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">Select a model and send a test message.</p>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="h-11 pl-10 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                type="button"
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                  selectedModel === model.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedModel(model.id)}
              >
                <span className="truncate">{model.name}</span>
              </button>
            ))}
            {filteredModels.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No models found</p>
            )}
          </div>
          {selectedModel && (
            <p className="text-sm text-muted-foreground">
              Selected: <span className="font-medium">{selectedModelName}</span>
            </p>
          )}
        </div>

        {result && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Response</p>
              <p className="text-sm">{result.text}</p>
            </div>
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="text-muted-foreground">Model</div>
              <div className="font-mono text-xs">{result.modelID}</div>
              <div className="text-muted-foreground">Latency</div>
              <div>{result.latencyMs}ms</div>
              <div className="text-muted-foreground">Tokens in / out</div>
              <div>
                {result.tokens.input.toLocaleString()} / {result.tokens.output.toLocaleString()}
                {result.tokens.reasoning > 0 &&
                  ` (${result.tokens.reasoning.toLocaleString()} reasoning)`}
              </div>
              {(result.tokens.cache.read > 0 || result.tokens.cache.write > 0) && (
                <>
                  <div className="text-muted-foreground">Cache read / write</div>
                  <div>
                    {result.tokens.cache.read.toLocaleString()} /{' '}
                    {result.tokens.cache.write.toLocaleString()}
                  </div>
                </>
              )}
              <div className="text-muted-foreground">Cost</div>
              <div>${result.cost.toFixed(6)}</div>
              <div className="text-muted-foreground">Finish</div>
              <div>{result.finish}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            className="h-11"
            onClick={() => void handlePing()}
            disabled={loading || !selectedModel}
          >
            {loading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-1.5 h-4 w-4" />
            )}
            {loading ? 'Pinging...' : 'Send Ping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
