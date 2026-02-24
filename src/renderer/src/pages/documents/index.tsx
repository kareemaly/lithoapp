import { formatDistanceToNow } from 'date-fns';
import { FilePlus, FileText, Images, Loader2, MoreHorizontal, Palette, Trash2 } from 'lucide-react';
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

  async function handleCreate(): Promise<void> {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      await fetch(`${serverUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), size: newSize }),
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

  const documents = manifest?.documents ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{manifest?.name ?? 'Documents'}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <FilePlus className="mr-1.5 h-3.5 w-3.5" />
            New Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        <DesignSystemCard serverUrl={serverUrl} onClick={onOpenDesignSystem} />
        <AssetsCard onClick={onOpenAssets} />
        {documents.map((doc) => (
          <DocumentCard
            key={doc.slug}
            doc={doc}
            serverUrl={serverUrl}
            isDeleting={isDeleting === doc.slug}
            onDelete={confirmDelete}
            onClick={() => onSelectDocument(doc.slug)}
          />
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
            <DialogDescription>Create a new document in this workspace.</DialogDescription>
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
            <Button onClick={handleCreate} disabled={isCreating || !newTitle.trim()}>
              {isCreating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
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
      {/* Thumbnail */}
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

        {/* Badge */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <Palette className="h-2.5 w-2.5" />
          Design System
        </div>
      </div>

      {/* Info */}
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
      {/* Thumbnail */}
      <div
        className="relative flex items-center justify-center overflow-hidden border-b bg-neutral-100"
        style={{ height: THUMB_HEIGHT }}
      >
        <Images className="h-10 w-10 text-muted-foreground/40" />

        {/* Badge */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
          <Images className="h-2.5 w-2.5" />
          Assets
        </div>
      </div>

      {/* Info */}
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
  onClick,
}: {
  doc: ManifestDocument;
  serverUrl: string;
  isDeleting: boolean;
  onDelete: (e: React.MouseEvent, slug: string) => void;
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
      className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors hover:border-primary/40"
      onClick={onClick}
    >
      {/* Thumbnail — fixed height, iframe scaled to fill width, overflow cropped */}
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

        {/* Dropdown overlay */}
        <div className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon-sm" className="h-6 w-6 shadow-sm">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
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
