import { formatDistanceToNow } from 'date-fns';
import {
  FilePlus,
  FileText,
  Folder,
  FolderInput,
  FolderMinus,
  FolderPlus,
  Images,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useDesignSystem } from '@/hooks/use-design-system';
import type { ManifestDocument, WorkspaceManifest } from '@/hooks/use-workspace-manifest';

const SIZE_PRESETS = [
  'A4',
  'A3',
  'A5',
  'Letter',
  'Legal',
  'Tabloid',
  'Instagram Post',
  'Instagram Story',
  'Facebook Post',
  'Twitter/X Post',
  'LinkedIn Banner',
  'Slide 16:9',
  'Slide 4:3',
  'YouTube Thumbnail',
];

/** Fixed thumbnail container height in px. */
const THUMB_HEIGHT = 180;

function groupDocuments(docs: ManifestDocument[]): {
  ungrouped: ManifestDocument[];
  folders: Map<string, ManifestDocument[]>;
} {
  const ungrouped: ManifestDocument[] = [];
  const folders = new Map<string, ManifestDocument[]>();
  for (const doc of docs) {
    if (!doc.folder) {
      ungrouped.push(doc);
      continue;
    }
    const list = folders.get(doc.folder) ?? [];
    list.push(doc);
    folders.set(doc.folder, list);
  }
  return { ungrouped, folders };
}

async function updateDocFolder(serverUrl: string, slug: string, folder: string): Promise<void> {
  const res = await fetch(`${serverUrl}/api/documents/${slug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Strip slashes to prevent accidental nesting. */
function sanitizeFolderName(value: string): string {
  return value.replace(/\//g, '');
}

interface DocumentsPageProps {
  manifest: WorkspaceManifest | null;
  serverUrl: string;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  onSelectDocument: (slug: string) => void;
  onOpenDesignSystem: () => void;
  onOpenAssets: () => void;
}

export function DocumentsPage({
  manifest,
  serverUrl,
  loading,
  error,
  refetch,
  onSelectDocument,
  onOpenDesignSystem,
  onOpenAssets,
}: DocumentsPageProps): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSize, setNewSize] = useState('A4');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [assignFolderSlug, setAssignFolderSlug] = useState<string | null>(null);
  const [renameFolderOld, setRenameFolderOld] = useState<string | null>(null);
  const [deleteFolderName, setDeleteFolderName] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  // Tracks folder names that exist only in local state (no documents yet).
  // These are ephemeral — they disappear on page reload.
  const [localFolderNames, setLocalFolderNames] = useState<Set<string>>(new Set());

  const documents = manifest?.documents ?? [];
  const { ungrouped, folders: folderMap } = groupDocuments(documents);
  const serverFolderNames = [...folderMap.keys()].sort();
  // Merge server folders with local-only (empty) folders, deduplicated and sorted.
  const allFolderNames = [...new Set([...serverFolderNames, ...localFolderNames])].sort();

  function handleCreateFolder(): void {
    const name = newFolderName.trim();
    if (!name) return;
    setLocalFolderNames((prev) => new Set([...prev, name]));
    setNewFolderOpen(false);
    setNewFolderName('');
  }

  async function handleCreate(): Promise<void> {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const body: Record<string, string> = { title: newTitle.trim(), size: newSize };
      // Auto-assign to current folder when creating from inside one.
      if (currentFolder) body.folder = currentFolder;
      await fetch(`${serverUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await refetch();
      setCreateOpen(false);
      setNewTitle('');
      setNewSize('A4');
    } catch (err) {
      console.error('[documents] Create failed:', err);
      toast.error('Failed to create document');
    } finally {
      setIsCreating(false);
    }
  }

  function confirmDelete(e: React.MouseEvent, slug: string): void {
    e.stopPropagation();
    setDeleteConfirm(slug);
  }

  async function handleDelete(): Promise<void> {
    if (!deleteConfirm) return;
    setIsDeleting(deleteConfirm);
    setDeleteConfirm(null);
    try {
      await fetch(`${serverUrl}/api/documents/${deleteConfirm}`, { method: 'DELETE' });
      await refetch();
    } catch (err) {
      console.error('[documents] Delete failed:', err);
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleAssignFolder(slug: string, folderName: string): Promise<void> {
    try {
      await updateDocFolder(serverUrl, slug, folderName);
      await refetch();
    } catch (err) {
      console.error('[documents] Assign folder failed:', err);
      toast.error('Failed to move document to folder');
    }
  }

  async function handleRemoveFromFolder(slug: string): Promise<void> {
    try {
      await updateDocFolder(serverUrl, slug, '');
      await refetch();
    } catch (err) {
      console.error('[documents] Remove from folder failed:', err);
      toast.error('Failed to remove document from folder');
    }
  }

  async function handleRenameFolder(oldName: string, newName: string): Promise<void> {
    const docs = folderMap.get(oldName) ?? [];
    try {
      await Promise.all(docs.map((doc) => updateDocFolder(serverUrl, doc.slug, newName)));
      await refetch();
      if (currentFolder === oldName) setCurrentFolder(newName);
      setLocalFolderNames((prev) => {
        if (!prev.has(oldName)) return prev;
        const next = new Set(prev);
        next.delete(oldName);
        next.add(newName);
        return next;
      });
    } catch (err) {
      console.error('[documents] Rename folder failed:', err);
      toast.error('Failed to rename folder');
    }
  }

  async function handleDeleteFolder(name: string): Promise<void> {
    const docs = folderMap.get(name) ?? [];
    try {
      await Promise.all(docs.map((doc) => updateDocFolder(serverUrl, doc.slug, '')));
      await refetch();
      if (currentFolder === name) setCurrentFolder(null);
      setLocalFolderNames((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    } catch (err) {
      console.error('[documents] Delete folder failed:', err);
      toast.error('Failed to delete folder');
    }
  }

  if (loading && !manifest) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error && !manifest) {
    return <p className="text-sm text-destructive">Failed to load documents: {error}</p>;
  }

  const workspaceName = manifest?.name ?? 'Documents';
  const folderDocs = currentFolder ? (folderMap.get(currentFolder) ?? []) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 min-w-0 items-center gap-1 text-sm">
          <button
            type="button"
            className={
              currentFolder
                ? 'font-semibold hover:text-primary transition-colors'
                : 'text-lg font-semibold cursor-default'
            }
            onClick={() => setCurrentFolder(null)}
          >
            {workspaceName}
          </button>
          {currentFolder && (
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{currentFolder}</span>
            </span>
          )}
        </div>
        {currentFolder === null && (
          <Button size="sm" variant="outline" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
            New Folder
          </Button>
        )}
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <FilePlus className="mr-1.5 h-3.5 w-3.5" />
          New Document
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {currentFolder === null ? (
          <>
            <DesignSystemCard serverUrl={serverUrl} onClick={onOpenDesignSystem} />
            <AssetsCard onClick={onOpenAssets} />
            {allFolderNames.map((name) => (
              <FolderCard
                key={name}
                name={name}
                docCount={folderMap.get(name)?.length ?? 0}
                onClick={() => setCurrentFolder(name)}
                onRename={(n) => setRenameFolderOld(n)}
                onDelete={(n) => setDeleteFolderName(n)}
                onDropDoc={(slug) => void handleAssignFolder(slug, name)}
              />
            ))}
            {ungrouped.map((doc) => (
              <DocumentCard
                key={doc.slug}
                doc={doc}
                serverUrl={serverUrl}
                isDeleting={isDeleting === doc.slug}
                onDelete={confirmDelete}
                onAssignFolder={(slug) => setAssignFolderSlug(slug)}
                onRemoveFromFolder={(slug) => void handleRemoveFromFolder(slug)}
                onClick={() => onSelectDocument(doc.slug)}
              />
            ))}
          </>
        ) : (
          folderDocs?.map((doc) => (
            <DocumentCard
              key={doc.slug}
              doc={doc}
              serverUrl={serverUrl}
              isDeleting={isDeleting === doc.slug}
              onDelete={confirmDelete}
              onAssignFolder={(slug) => setAssignFolderSlug(slug)}
              onRemoveFromFolder={(slug) => void handleRemoveFromFolder(slug)}
              onClick={() => onSelectDocument(doc.slug)}
            />
          ))
        )}
      </div>

      {/* New Folder dialog */}
      <Dialog
        open={newFolderOpen}
        onOpenChange={(open) => {
          setNewFolderOpen(open);
          if (!open) setNewFolderName('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>Create a folder to organise your documents.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Marketing"
              value={newFolderName}
              onChange={(e) => setNewFolderName(sanitizeFolderName(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create document dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>
              {currentFolder
                ? `Create a new document in "${currentFolder}".`
                : 'Create a new document in this workspace.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                placeholder="Annual Report"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Size</Label>
              <Select value={newSize} onValueChange={setNewSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_PRESETS.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => void handleCreate()} disabled={isCreating || !newTitle.trim()}>
              {isCreating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete document confirmation */}
      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;
              {manifest?.documents.find((d) => d.slug === deleteConfirm)?.title ?? deleteConfirm}
              &quot; and all its pages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to folder dialog */}
      <MoveFolderDialog
        open={assignFolderSlug !== null}
        folders={allFolderNames}
        onAssign={(folderName) => {
          if (assignFolderSlug) void handleAssignFolder(assignFolderSlug, folderName);
          setAssignFolderSlug(null);
        }}
        onClose={() => setAssignFolderSlug(null)}
      />

      {/* Rename folder dialog */}
      <RenameFolderDialog
        oldName={renameFolderOld}
        onRename={(newName) => {
          if (renameFolderOld) void handleRenameFolder(renameFolderOld, newName);
          setRenameFolderOld(null);
        }}
        onClose={() => setRenameFolderOld(null)}
      />

      {/* Delete folder confirmation */}
      <AlertDialog
        open={deleteFolderName !== null}
        onOpenChange={(open) => !open && setDeleteFolderName(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the &quot;{deleteFolderName}&quot; folder. All documents inside will
              move to the top level. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteFolderName) void handleDeleteFolder(deleteFolderName);
                setDeleteFolderName(null);
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MoveFolderDialog({
  open,
  folders,
  onAssign,
  onClose,
}: {
  open: boolean;
  folders: string[];
  onAssign: (folderName: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
          <DialogDescription>Select a folder to move this document into.</DialogDescription>
        </DialogHeader>
        {folders.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No folders yet — use the New Folder button to create one.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {folders.map((f) => (
              <button
                key={f}
                type="button"
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => onAssign(f)}
              >
                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                {f}
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameFolderDialog({
  oldName,
  onRename,
  onClose,
}: {
  oldName: string | null;
  onRename: (newName: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (oldName !== null) setValue(oldName);
  }, [oldName]);

  const isValid = value.trim() !== '' && value.trim() !== oldName;

  return (
    <Dialog open={oldName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename folder</DialogTitle>
          <DialogDescription>Enter a new name for &quot;{oldName}&quot;.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rename-folder">Folder name</Label>
          <Input
            id="rename-folder"
            value={value}
            onChange={(e) => setValue(sanitizeFolderName(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) onRename(value.trim());
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!isValid} onClick={() => onRename(value.trim())}>
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolderCard({
  name,
  docCount,
  onClick,
  onRename,
  onDelete,
  onDropDoc,
}: {
  name: string;
  docCount: number;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: (name: string) => void;
  onDropDoc: (slug: string) => void;
}): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent): void {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent): void {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent): void {
    e.preventDefault();
    setIsDragOver(false);
    const slug = e.dataTransfer.getData('text/plain');
    if (slug) onDropDoc(slug);
  }

  return (
    <button
      type="button"
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/40 ${isDragOver ? 'border-primary ring-2 ring-primary/30' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden border-b bg-neutral-100"
        style={{ height: THUMB_HEIGHT }}
      >
        <Folder className="h-12 w-12 text-muted-foreground/30" />

        <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                className="h-6 w-6 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(name);
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(name);
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {docCount} {docCount === 1 ? 'document' : 'documents'}
        </p>
      </div>
    </button>
  );
}

function DesignSystemCard({
  serverUrl,
  onClick,
}: {
  serverUrl: string;
  onClick: () => void;
}): React.JSX.Element {
  const { designSystem, loading } = useDesignSystem(serverUrl);

  const totalColors = designSystem
    ? designSystem.colors.palettes.reduce((sum, p) => sum + p.shades.length, 0)
    : 0;
  const families = designSystem?.typography.families.length ?? 0;
  const sizes = designSystem?.typography.sizes.length ?? 0;

  const previewPalettes = designSystem?.colors.palettes.slice(0, 3) ?? [];

  return (
    <button
      type="button"
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/40"
      onClick={onClick}
    >
      <div
        className="relative overflow-hidden border-b bg-neutral-100"
        style={{ height: THUMB_HEIGHT }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner />
          </div>
        ) : previewPalettes.length > 0 ? (
          <div className="flex h-full flex-col">
            {previewPalettes.map((palette) => (
              <div key={palette.name} className="flex flex-1">
                {palette.shades.map((shade) => (
                  <div
                    key={shade.variable}
                    className="flex-1"
                    style={{ backgroundColor: shade.value }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Palette className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <Palette className="h-2.5 w-2.5" />
          Design System
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium">Design System</p>
        <p className="text-xs text-muted-foreground">
          {designSystem
            ? `${totalColors} colors · ${families} families · ${sizes} sizes`
            : 'Loading tokens…'}
        </p>
      </div>
    </button>
  );
}

function AssetsCard({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/40"
      onClick={onClick}
    >
      <div
        className="relative flex items-center justify-center overflow-hidden border-b bg-neutral-100"
        style={{ height: THUMB_HEIGHT }}
      >
        <Images className="h-10 w-10 text-muted-foreground/40" />
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <Images className="h-2.5 w-2.5" />
          Assets
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium">Assets</p>
        <p className="text-xs text-muted-foreground">Images, SVGs, fonts</p>
      </div>
    </button>
  );
}

function DocumentCard({
  doc,
  serverUrl,
  isDeleting,
  onDelete,
  onAssignFolder,
  onRemoveFromFolder,
  onClick,
}: {
  doc: ManifestDocument;
  serverUrl: string;
  isDeleting: boolean;
  onDelete: (e: React.MouseEvent, slug: string) => void;
  onAssignFolder: (slug: string) => void;
  onRemoveFromFolder: (slug: string) => void;
  onClick: () => void;
}): React.JSX.Element {
  const firstPage = doc.pages[0];
  const previewUrl = firstPage ? `${serverUrl}/${doc.slug}/${firstPage}` : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(220);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The iframe renders at the full document pixel size, then CSS scale()
  // shrinks it to fill the card width. overflow-hidden crops the bottom
  // so every card has the same fixed height regardless of aspect ratio.
  const iframeWidth = doc.size.width * (doc.size.unit === 'mm' ? 3.7795 : 1); // mm→px at 96dpi
  const aspect = doc.size.height / doc.size.width;
  const iframeHeight = iframeWidth * aspect;
  const scale = containerWidth / iframeWidth;

  function formatSize(size: { width: number; height: number; unit: string }): string {
    if (size.unit === 'mm') return `${size.width} x ${size.height} mm`;
    return `${size.width} x ${size.height} px`;
  }

  return (
    <button
      type="button"
      draggable
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/40"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', doc.slug);
        e.dataTransfer.effectAllowed = 'move';

        // Custom drag ghost: small dark pill with file icon + title
        const ghost = document.createElement('div');
        ghost.style.cssText =
          'position:absolute;left:-9999px;top:-9999px;display:flex;align-items:center;' +
          'gap:8px;padding:6px 12px;background:#1a1a1a;color:#fff;border-radius:8px;' +
          'font-size:13px;font-weight:500;max-width:220px;white-space:nowrap;' +
          'overflow:hidden;text-overflow:ellipsis;box-shadow:0 4px 12px rgba(0,0,0,0.35);' +
          'pointer-events:none;';
        ghost.innerHTML =
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
          '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>' +
          '<polyline points="14 2 14 8 20 8"/>' +
          '</svg>' +
          `<span style="overflow:hidden;text-overflow:ellipsis">${doc.title}</span>`;
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 14, 16);
        requestAnimationFrame(() => document.body.removeChild(ghost));
      }}
      onClick={onClick}
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden border-b bg-white"
        style={{ height: THUMB_HEIGHT }}
      >
        {previewUrl ? (
          <iframe
            src={previewUrl}
            title={`${doc.title} preview`}
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            style={{
              width: iframeWidth,
              height: iframeHeight,
              transform: `scale(${scale})`,
              border: 'none',
            }}
            tabIndex={-1}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <FileText className="h-8 w-8" />
          </div>
        )}

        <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                className="h-6 w-6 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => onDelete(e, doc.slug)} disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                )}
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignFolder(doc.slug);
                }}
              >
                <FolderInput className="mr-2 h-3.5 w-3.5" />
                Move to Folder
              </DropdownMenuItem>
              {doc.folder && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromFolder(doc.slug);
                  }}
                >
                  <FolderMinus className="mr-2 h-3.5 w-3.5" />
                  Remove from Folder
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatSize(doc.size)}</span>
          <span>&middot;</span>
          <span>
            {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
