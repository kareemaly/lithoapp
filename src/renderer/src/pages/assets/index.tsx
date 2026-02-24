import { ArrowLeft, FolderPlus, Images, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AssetEntry } from '../../../../shared/types';
import { AssetGridItem, IMAGE_EXTS } from './asset-grid-item';
import { PreviewDialog } from './asset-preview-dialog';

interface AssetsPageProps {
  workspacePath: string;
  serverUrl: string;
  onBack: () => void;
}

export function AssetsPage({
  workspacePath,
  serverUrl,
  onBack,
}: AssetsPageProps): React.JSX.Element {
  const [currentDir, setCurrentDir] = useState('');
  const [entries, setEntries] = useState<AssetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<AssetEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewEntry, setPreviewEntry] = useState<AssetEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await window.litho.assets.list(workspacePath, currentDir, false);
      const sorted = [...raw].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [workspacePath, currentDir]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  // Reset selection when directory changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentDir is the intentional trigger
  useEffect(() => {
    setSelected(new Set());
  }, [currentDir]);

  async function handleUploadFiles(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files);
    const toUpload: { name: string; data: Uint8Array }[] = [];

    for (const file of fileArray) {
      const buf = await file.arrayBuffer();
      toUpload.push({ name: file.name, data: new Uint8Array(buf) });
    }

    try {
      await window.litho.assets.upload(workspacePath, currentDir, toUpload);
      await loadEntries();
      toast.success(`Uploaded ${toUpload.length} file(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent): Promise<void> {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  }

  async function handleCreateFolder(): Promise<void> {
    if (!newFolderName.trim()) return;
    const dirPath = currentDir ? `${currentDir}/${newFolderName.trim()}` : newFolderName.trim();
    try {
      await window.litho.assets.createDirectory(workspacePath, dirPath);
      await loadEntries();
      setNewFolderOpen(false);
      setNewFolderName('');
      toast.success(`Created folder "${newFolderName.trim()}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    }
  }

  async function handleDelete(entryPath: string): Promise<void> {
    try {
      await window.litho.assets.delete(workspacePath, entryPath);
      await loadEntries();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(entryPath);
        return next;
      });
      toast.success('Deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleBulkDelete(): Promise<void> {
    const paths = [...selected];
    setBulkDeleteConfirm(false);
    setSelected(new Set());
    for (const p of paths) {
      try {
        await window.litho.assets.delete(workspacePath, p);
      } catch (err) {
        toast.error(`Failed to delete "${p}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    await loadEntries();
    toast.success(`Deleted ${paths.length} item(s)`);
  }

  async function handleRename(): Promise<void> {
    if (!renameTarget || !renameValue.trim()) return;
    const newName = renameTarget.ext
      ? `${renameValue.trim()}${renameTarget.ext}`
      : renameValue.trim();
    const parentDir = renameTarget.path.includes('/')
      ? renameTarget.path.substring(0, renameTarget.path.lastIndexOf('/'))
      : '';
    const newPath = parentDir ? `${parentDir}/${newName}` : newName;
    try {
      await window.litho.assets.rename(workspacePath, renameTarget.path, newPath);
      await loadEntries();
      setRenameTarget(null);
      setRenameValue('');
      toast.success('Renamed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed');
    }
  }

  function toggleSelect(path: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  // Breadcrumb segments from currentDir
  const breadcrumbSegments = currentDir ? currentDir.split('/') : [];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop drop zone
    <div
      className={`flex flex-col gap-4 ${isDragOver ? 'ring-2 ring-primary ring-inset rounded-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
          <button
            type="button"
            className="font-semibold hover:text-primary transition-colors"
            onClick={() => setCurrentDir('')}
          >
            Assets
          </button>
          {breadcrumbSegments.map((seg, i) => {
            const path = breadcrumbSegments.slice(0, i + 1).join('/');
            return (
              <span key={path} className="flex items-center gap-1">
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className={`hover:text-primary transition-colors ${i === breadcrumbSegments.length - 1 ? 'font-medium' : ''}`}
                  onClick={() => setCurrentDir(path)}
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>

        {selected.size > 0 && (
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteConfirm(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete {selected.size}
          </Button>
        )}

        <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)}>
          <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
          New Folder
        </Button>

        <Button size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.woff2,.woff,.ttf,.otf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleUploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Content */}
      {isLoading && entries.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
          Loading…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : entries.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Images />
            </EmptyMedia>
            <EmptyTitle>No assets yet</EmptyTitle>
            <EmptyDescription>
              Upload images, SVGs, or fonts to use them in your documents.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload files
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {entries.map((entry) => (
            <AssetGridItem
              key={entry.path}
              entry={entry}
              serverUrl={serverUrl}
              isSelected={selected.has(entry.path)}
              anySelected={selected.size > 0}
              onSelect={() => toggleSelect(entry.path)}
              onNavigate={() => setCurrentDir(entry.path)}
              onPreview={() => setPreviewEntry(entry)}
              onRename={() => {
                setRenameTarget(entry);
                setRenameValue(entry.ext ? entry.name.slice(0, -entry.ext.length) : entry.name);
              }}
              onDelete={() => setDeleteConfirm(entry.path)}
            />
          ))}
        </div>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Create a new folder in the current directory.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => void handleCreateFolder()} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Enter a new name for "{renameTarget?.name}".</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rename-value">New name</Label>
            <div className="flex items-center gap-1">
              <Input
                id="rename-value"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleRename()}
                autoFocus
              />
              {renameTarget?.ext && (
                <span className="shrink-0 text-sm text-muted-foreground">{renameTarget.ext}</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => void handleRename()} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirm */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteConfirm?.split('/').pop()}&quot;. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const path = deleteConfirm;
                setDeleteConfirm(null);
                if (path) void handleDelete(path);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirm */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected.size <= 5
                ? `This will permanently delete: ${[...selected].map((p) => p.split('/').pop()).join(', ')}. This cannot be undone.`
                : `This will permanently delete ${selected.size} items. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleBulkDelete()}>
              Delete {selected.size} item(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {previewEntry && IMAGE_EXTS.has(previewEntry.ext) && (
        <PreviewDialog
          entry={previewEntry}
          serverUrl={serverUrl}
          onClose={() => setPreviewEntry(null)}
        />
      )}
    </div>
  );
}
