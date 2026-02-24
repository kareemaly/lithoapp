import { Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AssetEntry } from '../../../../shared/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PreviewDialog({
  entry,
  serverUrl,
  onClose,
}: {
  entry: AssetEntry;
  serverUrl: string;
  onClose: () => void;
}): React.JSX.Element {
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const assetRef = `@assets/${entry.path}`;

  function handleCopy(): void {
    navigator.clipboard.writeText(assetRef).catch(() => null);
    toast.success('Copied');
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="truncate">{entry.name}</DialogTitle>
          <DialogDescription>
            {formatBytes(entry.size)}
            {dimensions && ` · ${dimensions.w} × ${dimensions.h} px`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center rounded-lg bg-neutral-100 p-4">
          <img
            src={`${serverUrl}/assets/${entry.path}`}
            alt={entry.name}
            className="max-h-96 max-w-full object-contain"
            onLoad={(e) => {
              const img = e.currentTarget;
              setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
            }}
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs">
          <span className="flex-1 truncate">{assetRef}</span>
          <Button size="icon-sm" variant="ghost" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
