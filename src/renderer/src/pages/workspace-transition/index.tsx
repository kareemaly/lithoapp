import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const MIN_DISPLAY_MS = 1500;

interface WorkspaceTransitionPageProps {
  mode: 'loading' | 'closing';
  workspaceName?: string;
  /** When true the async work (server start/stop) is done. */
  ready: boolean;
  /** When true the server failed to start — show error state instead of spinner. */
  isError?: boolean;
  /** Called when the user wants to go back to the workspaces list after a failure. */
  onBack?: () => void;
  /** Called when the user wants to retry starting the workspace server. */
  onRestart?: () => void;
  onComplete: () => void;
}

export function WorkspaceTransitionPage({
  mode,
  workspaceName,
  ready,
  isError,
  onBack,
  onRestart,
  onComplete,
}: WorkspaceTransitionPageProps): React.JSX.Element {
  const [canFinish, setCanFinish] = useState(false);
  const mountedAt = useRef(Date.now());

  // Enforce a minimum display time so the transition feels intentional.
  useEffect(() => {
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const timer = setTimeout(() => setCanFinish(true), remaining);
    return () => clearTimeout(timer);
  }, []);

  // Navigate once both the async work is done AND the minimum time has passed.
  useEffect(() => {
    if (ready && canFinish) {
      onComplete();
    }
  }, [ready, canFinish, onComplete]);

  if (isError && mode === 'loading') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight">Something went wrong</h2>
          {workspaceName && <p className="text-base font-medium text-forge">{workspaceName}</p>}
          <p className="text-base text-muted-foreground">
            We couldn&apos;t open this project. Try again or go back.
          </p>
        </div>
        <div className="flex gap-3">
          {onRestart && (
            <Button onClick={onRestart} className="h-11 px-5 text-base">
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Try Again
            </Button>
          )}
          {onBack && (
            <Button variant="outline" onClick={onBack} className="h-11 px-5 text-base">
              Back to Projects
            </Button>
          )}
        </div>
      </div>
    );
  }

  const title =
    mode === 'loading'
      ? workspaceName
        ? `Opening ${workspaceName}...`
        : 'Opening...'
      : 'Closing...';

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      {/* Glowing spinner ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-forge/10" />
        <Loader2 className="h-10 w-10 animate-spin text-forge" />
      </div>

      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
    </div>
  );
}
