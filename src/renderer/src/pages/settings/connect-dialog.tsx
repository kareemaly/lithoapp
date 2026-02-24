import { AlertCircle, ExternalLink, Key, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useConnectFlow } from '@/hooks/use-connect-flow';
import type { OpencodeClient, ProviderAuthMethod, ProviderInfo } from '@/lib/opencode-client-types';

export function ConnectDialog({
  provider,
  authMethods,
  client,
  open,
  onOpenChange,
  onConnected,
}: {
  provider: ProviderInfo;
  authMethods: ProviderAuthMethod[];
  client: OpencodeClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}): React.JSX.Element {
  const handleConnected = useCallback(() => {
    onConnected();
    onOpenChange(false);
  }, [onConnected, onOpenChange]);

  const flow = useConnectFlow(client, provider, authMethods, handleConnected);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) flow.reset();
      onOpenChange(isOpen);
    },
    [flow, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {provider.name}</DialogTitle>
        </DialogHeader>

        {flow.error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {flow.error}
          </div>
        )}

        {flow.step === 'select' && (
          <div className="space-y-2">
            {authMethods.map((method, i) => (
              <button
                key={method.label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
                  flow.selectedMethod === i
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => flow.selectMethod(i)}
              >
                {method.type === 'oauth' ? (
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">{method.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {method.type === 'oauth'
                      ? 'Opens browser to authenticate'
                      : 'Enter key manually'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {flow.step === 'api-key' && (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Enter your API key"
              value={flow.apiKey}
              onChange={(e) => flow.setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void flow.submitApiKey();
              }}
            />
          </div>
        )}

        {flow.step === 'oauth-waiting' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Waiting for authentication to complete...
            </div>
            {flow.instructions && (
              <p className="text-xs text-muted-foreground">{flow.instructions}</p>
            )}
          </div>
        )}

        {flow.step === 'oauth-code' && (
          <div className="space-y-3">
            {flow.instructions && (
              <p className="text-sm text-muted-foreground">{flow.instructions}</p>
            )}
            <Input
              placeholder="Paste authorization code"
              value={flow.oauthCode}
              onChange={(e) => flow.setOauthCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void flow.submitOAuthCode();
              }}
            />
          </div>
        )}

        <DialogFooter>
          {flow.step === 'select' && (
            <Button onClick={flow.continue} disabled={flow.loading}>
              Continue
            </Button>
          )}
          {flow.step === 'api-key' && (
            <Button
              onClick={() => void flow.submitApiKey()}
              disabled={flow.loading || !flow.apiKey.trim()}
            >
              {flow.loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Save
            </Button>
          )}
          {flow.step === 'oauth-code' && (
            <Button
              onClick={() => void flow.submitOAuthCode()}
              disabled={flow.loading || !flow.oauthCode.trim()}
            >
              {flow.loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
