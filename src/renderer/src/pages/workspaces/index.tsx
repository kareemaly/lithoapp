import { formatDistanceToNow } from 'date-fns';
import {
  ArrowDownAZ,
  Clock,
  FolderOpen,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import type { WorkspaceEntry, WorkspaceServerInfo } from '@/hooks/use-workspace';
import { slugify } from '@/lib/slugify';

interface WorkspacesPageProps {
  workspaces: WorkspaceEntry[];
  activeInfo: WorkspaceServerInfo;
  onWorkspaceSelected: () => void;
  refreshWorkspaces: () => Promise<void>;
}

export function WorkspacesPage({
  workspaces,
  activeInfo,
  onWorkspaceSelected,
  refreshWorkspaces,
}: WorkspacesPageProps): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [selectingPath, setSelectingPath] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (sortBy === 'name') {
      return [...workspaces].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...workspaces].sort(
      (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime(),
    );
  }, [workspaces, sortBy]);

  async function handleCreate(): Promise<void> {
    if (!newName.trim() || !newLocation) return;
    setIsCreating(true);
    try {
      await window.litho.workspace.create(newLocation, newName.trim());
      await refreshWorkspaces();
      setCreateOpen(false);
      setNewName('');
      setNewLocation('');
      onWorkspaceSelected();
    } catch (err) {
      console.error('[workspaces] Create failed:', err);
      toast.error('Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleOpen(): Promise<void> {
    setIsOpening(true);
    try {
      const result = await window.litho.workspace.open();
      if (result) {
        await refreshWorkspaces();
        onWorkspaceSelected();
      }
    } catch (err) {
      console.error('[workspaces] Open failed:', err);
      toast.error('Failed to open workspace');
    } finally {
      setIsOpening(false);
    }
  }

  async function handleSelect(workspacePath: string): Promise<void> {
    setSelectingPath(workspacePath);
    try {
      await window.litho.workspace.select(workspacePath);
      await refreshWorkspaces();
      onWorkspaceSelected();
    } catch (err) {
      console.error('[workspaces] Select failed:', err);
      toast.error('Failed to switch workspace');
    } finally {
      setSelectingPath(null);
    }
  }

  function confirmRemove(e: React.MouseEvent, workspacePath: string): void {
    e.stopPropagation();
    setRemoveConfirm(workspacePath);
  }

  async function handleRemove(): Promise<void> {
    if (!removeConfirm) return;
    try {
      await window.litho.workspace.remove(removeConfirm);
      setRemoveConfirm(null);
      await refreshWorkspaces();
    } catch (err) {
      console.error('[workspaces] Remove failed:', err);
      toast.error('Failed to remove workspace');
    }
  }

  async function handleChooseDirectory(): Promise<void> {
    const dir = await window.litho.workspace.chooseDirectory();
    if (dir) setNewLocation(dir);
  }

  if (workspaces.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No workspaces</EmptyTitle>
            <EmptyDescription>
              Create a new workspace or open an existing one to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={() => setCreateOpen(true)}>
                <FolderPlus className="mr-1.5 h-4 w-4" />
                Create Workspace
              </Button>
              <Button variant="outline" onClick={handleOpen} disabled={isOpening}>
                {isOpening ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FolderOpen className="mr-1.5 h-4 w-4" />
                )}
                Open Existing
              </Button>
            </div>
          </EmptyContent>
        </Empty>
        <CreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          name={newName}
          onNameChange={setNewName}
          location={newLocation}
          onChooseDirectory={handleChooseDirectory}
          onSubmit={handleCreate}
          isCreating={isCreating}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Workspaces</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
            title={sortBy === 'recent' ? 'Sorted by recent' : 'Sorted by name'}
          >
            {sortBy === 'recent' ? (
              <Clock className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <ArrowDownAZ className="mr-1.5 h-3.5 w-3.5" />
            )}
            {sortBy === 'recent' ? 'Recent' : 'Name'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
            Create
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpen} disabled={isOpening}>
            {isOpening ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
            )}
            Open Existing
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((ws) => {
          const isActive = activeInfo.workspacePath === ws.path;
          const isSelecting = selectingPath === ws.path;

          return (
            <Card
              key={ws.path}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${isActive ? 'border-l-4 border-l-forge border-y-forge/30 border-r-forge/30 bg-forge/5' : ''}`}
              onClick={() => {
                if (isActive) {
                  onWorkspaceSelected();
                } else {
                  handleSelect(ws.path);
                }
              }}
            >
              <CardContent className="flex items-center gap-3 py-3">
                {isSelecting ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <FolderOpen
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-forge' : 'text-muted-foreground'}`}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{ws.name}</span>
                    {isActive && (
                      <Badge className="bg-forge/15 text-forge border-forge/30 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{ws.path}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ws.lastOpened), { addSuffix: true })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => confirmRemove(e, ws.path)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Remove from list
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={newName}
        onNameChange={setNewName}
        location={newLocation}
        onChooseDirectory={handleChooseDirectory}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />

      <AlertDialog
        open={removeConfirm !== null}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes &quot;
              {workspaces.find((ws) => ws.path === removeConfirm)?.name ?? removeConfirm}
              &quot; from this list. The folder and its files will remain on disk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  location,
  onChooseDirectory,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  location: string;
  onChooseDirectory: () => void;
  onSubmit: () => void;
  isCreating: boolean;
}): React.JSX.Element {
  const slug = useMemo(() => slugify(name), [name]);
  const fullPath = location && slug ? `${location}/${slug}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Create a new Litho workspace to organize your documents.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              placeholder="My Workspace"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Location</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                placeholder="Choose a parent directory..."
                value={location}
                className="flex-1"
              />
              <Button variant="outline" onClick={onChooseDirectory}>
                Browse
              </Button>
            </div>
          </div>
          {fullPath && (
            <p className="truncate text-xs text-muted-foreground">
              Workspace will be created at{' '}
              <span className="font-medium text-foreground">{fullPath}</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={onSubmit} disabled={isCreating || !name.trim() || !location}>
            {isCreating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
