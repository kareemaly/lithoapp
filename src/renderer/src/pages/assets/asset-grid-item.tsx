import { Folder, Images, MoreHorizontal, Pencil, Trash2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AssetEntry } from '../../../../shared/types';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const FONT_EXTS = new Set(['.woff2', '.woff', '.ttf', '.otf']);

export { IMAGE_EXTS };

export function AssetGridItem({
  entry,
  serverUrl,
  isSelected,
  anySelected,
  onSelect,
  onNavigate,
  onPreview,
  onRename,
  onDelete,
}: {
  entry: AssetEntry;
  serverUrl: string;
  isSelected: boolean;
  anySelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const isImage = IMAGE_EXTS.has(entry.ext);
  const isFont = FONT_EXTS.has(entry.ext);
  const isDir = entry.type === 'directory';

  function handleClick(): void {
    if (isDir) {
      onNavigate();
    } else if (isImage) {
      onPreview();
    }
  }

  if (isDir) {
    return (
      <div className="group relative h-full">
        {/* Checkbox */}
        <div
          className={`absolute top-1 left-1 z-10 transition-opacity ${anySelected || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Context menu */}
        <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <button
          type="button"
          className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40"
          onClick={onNavigate}
        >
          <Folder className="h-10 w-10 text-amber-400" />
          <p className="w-full truncate text-center text-xs font-medium">{entry.name}</p>
        </button>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/40">
      {/* Checkbox */}
      <div
        className={`absolute top-1.5 left-1.5 z-10 transition-opacity ${anySelected || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* Thumbnail */}
      <button
        type="button"
        className="relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden border-b bg-neutral-100"
        onClick={handleClick}
      >
        {isImage ? (
          <img
            src={`${serverUrl}/assets/${entry.path}`}
            alt={entry.name}
            className="h-full w-full object-contain"
          />
        ) : isFont ? (
          <Type className="h-10 w-10 text-muted-foreground/50" />
        ) : (
          <Images className="h-10 w-10 text-muted-foreground/50" />
        )}
      </button>

      {/* Context menu */}
      <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon-sm" className="h-6 w-6 shadow-sm">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-medium">{entry.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(entry.size)}</p>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
