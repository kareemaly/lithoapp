import { ArrowDownToLine, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { UpdateState, UpdateStatus } from '../../../../shared/types';

function LithoLogo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="671 564 706 920"
      fill="none"
      className={className}
    >
      <title>Litho</title>
      <path
        fill="#C2410C"
        d="M 671.587 564.932 L 868.454 564.969 L 868.902 1483 L 671.868 1482.98 C 670.491 1366.4 671.686 1247.51 671.673 1130.72 L 671.587 564.932 z"
      />
      <path
        fill="#D97706"
        d="M 1370.37 1288.5 L 1374.53 1288.59 C 1377.24 1293.29 1375.95 1457.84 1376 1482.97 L 911.75 1482.95 L 907.499 1482.81 C 907.112 1482.37 906.724 1481.94 906.337 1481.51 C 905.969 1439.23 906.19 1323 906.206 1288.69 L 1370.37 1288.5 z"
      />
      <path
        fill="#EA580C"
        d="M 906.031 599.612 C 911.205 603.744 944.576 637.279 950.972 644.092 C 970.544 664.941 1004.9 695.471 1022.37 716.966 C 983.526 717.677 944.505 717.174 905.62 717.6 C 905.816 681.022 904.135 635.013 906.031 599.612 z"
      />
    </svg>
  );
}

function updateMessage(state: UpdateState): string | null {
  if (state.status === 'available') return `v${state.version} is available`;
  if (state.status === 'downloading') return 'Downloading update...';
  if (state.status === 'downloaded') return `v${state.version} ready to install`;
  if (state.status === 'not-available') return "You're on the latest version";
  if (state.status === 'error') return state.error ?? 'Update check failed';
  return null;
}

function messageColor(status: UpdateStatus): string {
  if (status === 'error') return 'text-destructive';
  if (status === 'downloaded' || status === 'available') return 'text-foreground';
  return 'text-muted-foreground';
}

export function AboutSection(): React.JSX.Element {
  const [version, setVersion] = useState('');
  const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    window.litho.app
      .getVersion()
      .then(setVersion)
      .catch(() => {});

    window.litho.update
      .getState()
      .then(setUpdateState)
      .catch((err) => {
        console.error('[about] Failed to get update state:', err);
        toast.error('Failed to check update status');
      });

    const unsubscribe = window.litho.update.onStatus(setUpdateState);
    return unsubscribe;
  }, []);

  const isChecking = updateState.status === 'checking';
  const isDownloading = updateState.status === 'downloading';
  const percent = Math.round(updateState.progress?.percent ?? 0);
  const message = updateMessage(updateState);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <LithoLogo className="h-14 w-auto shrink-0" />
        <div className="flex flex-col gap-0.5">
          <p className="text-lg font-semibold">Litho</p>
          {version && <p className="text-sm text-muted-foreground">v{version}</p>}
          <a
            href="https://lithoapp.com"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            lithoapp.com
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Updates</p>
          <Button
            variant="outline"
            className="h-10 px-4 text-sm"
            disabled={isChecking || isDownloading}
            onClick={() => window.litho.update.check()}
          >
            <Search className="mr-1.5 h-4 w-4" />
            {isChecking ? 'Checking...' : 'Check for updates'}
          </Button>
        </div>

        {isDownloading && (
          <div className="flex flex-col gap-2">
            <Progress value={percent} className="h-1.5" />
            <p className="text-sm text-muted-foreground">{percent}%</p>
          </div>
        )}

        {message && !isDownloading && (
          <p className={`text-sm ${messageColor(updateState.status)}`}>{message}</p>
        )}

        {(updateState.status === 'available' || updateState.status === 'downloaded') && (
          <div className="flex gap-2">
            {updateState.status === 'available' && (
              <Button className="h-10 px-4 text-sm" onClick={() => window.litho.update.download()}>
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                Download
              </Button>
            )}
            {updateState.status === 'downloaded' && (
              <Button
                className="h-10 bg-green-600 px-4 text-sm text-white hover:bg-green-700"
                onClick={() => window.litho.update.install()}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Restart to update
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
