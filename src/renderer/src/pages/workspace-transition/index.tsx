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
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div className="space-y-1.5 text-center">
          <h2 className="font-display text-xl font-semibold">Failed to start workspace</h2>
          {workspaceName && <p className="text-sm font-medium text-forge">{workspaceName}</p>}
          <p className="text-sm text-muted-foreground">
            The workspace server could not be started.
          </p>
        </div>
        <div className="flex gap-2">
          {onRestart && (
            <Button size="sm" onClick={onRestart}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Restart
            </Button>
          )}
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back to Workspaces
            </Button>
          )}
        </div>
      </div>
    );
  }

  const title = mode === 'loading' ? 'Preparing your workspace' : 'Closing workspace';
  const subtitle =
    mode === 'loading' ? 'Setting things up — just a moment...' : 'Wrapping up — just a moment...';

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6">
      {/* Glowing spinner ring */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-forge/10" />
        <Loader2 className="h-10 w-10 animate-spin text-forge" />
      </div>

      <div className="space-y-1.5 text-center">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {workspaceName && <p className="text-sm font-medium text-forge">{workspaceName}</p>}
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
