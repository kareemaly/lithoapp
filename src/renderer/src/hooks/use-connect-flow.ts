import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  OpencodeClient,
  ProviderAuthMethod,
  ProviderInfo,
} from '../lib/opencode-client-types';
import { completeOAuth, connectWithApiKey, startOAuth } from '../lib/provider-actions';

export interface ConnectFlowState {
  step: 'select' | 'api-key' | 'oauth-waiting' | 'oauth-code';
  selectedMethod: number;
  apiKey: string;
  setApiKey(v: string): void;
  oauthCode: string;
  setOauthCode(v: string): void;
  instructions: string;
  loading: boolean;
  error: string;
  selectMethod(i: number): void;
  continue(): void;
  submitApiKey(): Promise<void>;
  submitOAuthCode(): Promise<void>;
  reset(): void;
}

export function useConnectFlow(
  client: OpencodeClient,
  provider: ProviderInfo,
  authMethods: ProviderAuthMethod[],
  onConnected: () => void,
): ConnectFlowState {
  const initialStep = authMethods.length === 0 ? 'api-key' : 'select';
  const [step, setStep] = useState<'select' | 'api-key' | 'oauth-waiting' | 'oauth-code'>(
    initialStep,
  );
  const [selectedMethod, setSelectedMethod] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [oauthCode, setOauthCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Prevents state updates and onConnected() from firing after the dialog closes.
  const canceledRef = useRef(false);

  useEffect(() => {
    return () => {
      canceledRef.current = true;
    };
  }, []);

  const reset = useCallback(() => {
    canceledRef.current = true;
    setStep(initialStep);
    setSelectedMethod(0);
    setApiKey('');
    setOauthCode('');
    setInstructions('');
    setLoading(false);
    setError('');
  }, [initialStep]);

  const submitApiKey = useCallback(async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      await connectWithApiKey(client, provider.id, apiKey);
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set API key');
    } finally {
      setLoading(false);
    }
  }, [apiKey, client, provider.id, onConnected]);

  const continueFlow = useCallback(() => {
    const method = authMethods[selectedMethod];
    if (!method) return;
    if (method.type === 'api') {
      setStep('api-key');
      return;
    }
    setLoading(true);
    setError('');
    canceledRef.current = false;
    startOAuth(client, provider.id, selectedMethod)
      .then((result) => {
        window.open(result.url);
        setInstructions(result.instructions);
        if (result.method === 'auto') {
          setStep('oauth-waiting');
          // For 'auto' flow the server has stored a pending callback function in its state
          // cache. Calling completeOAuth (no code) tells the server to run it — the request
          // blocks until the provider's token exchange finishes (either by polling the
          // provider's device-flow endpoint, or by waiting for the browser redirect to the
          // local OAuth callback server on port 19876). DO NOT poll provider.list() or call
          // dispose() before this resolves — both would wipe the server's cached callback fn.
          completeOAuth(client, provider.id, selectedMethod)
            .then(() => {
              if (!canceledRef.current) onConnected();
            })
            .catch((err) => {
              if (!canceledRef.current) {
                setError(err instanceof Error ? err.message : 'OAuth failed');
                setStep('select');
              }
            });
        } else {
          setStep('oauth-code');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to start OAuth');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authMethods, client, provider.id, selectedMethod, onConnected]);

  const submitOAuthCode = useCallback(async () => {
    if (!oauthCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await completeOAuth(client, provider.id, selectedMethod, oauthCode);
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete OAuth');
    } finally {
      setLoading(false);
    }
  }, [oauthCode, client, provider.id, selectedMethod, onConnected]);

  return {
    step,
    selectedMethod,
    apiKey,
    setApiKey,
    oauthCode,
    setOauthCode,
    instructions,
    loading,
    error,
    selectMethod: setSelectedMethod,
    continue: continueFlow,
    submitApiKey,
    submitOAuthCode,
    reset,
  };
}
