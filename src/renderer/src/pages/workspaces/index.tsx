import { formatDistanceToNow } from 'date-fns';
import { FileText, FolderOpen, Loader2, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
  Dialog,
  DialogClose,
  DialogContent,
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
import type { WorkspaceEntry, WorkspaceServerInfo } from '@/hooks/use-workspace';
import { cn } from '@/lib/utils';

function useDocumentCounts(workspaces: WorkspaceEntry[]): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const paths = workspaces.map((ws) => ws.path);
    if (paths.length === 0) return;

    Promise.all(
      paths.map(async (p) => {
        try {
          const count = await window.litho.workspace.getDocumentCount(p);
          return [p, count] as const;
        } catch {
          return [p, 0] as const;
        }
      }),
    ).then((results) => {
      setCounts(Object.fromEntries(results));
    });
  }, [workspaces]);

  return counts;
}

interface WorkspacesPageProps {
  workspaces: WorkspaceEntry[];
  activeInfo: WorkspaceServerInfo;
  onWorkspaceSelected: () => void;
  refreshWorkspaces: () => Promise<void>;
  userName?: string;
}

export function WorkspacesPage({
  workspaces,
  activeInfo,
  onWorkspaceSelected,
  refreshWorkspaces,
  userName,
}: WorkspacesPageProps): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [selectingPath, setSelectingPath] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const docCounts = useDocumentCounts(workspaces);

  const sorted = useMemo(
    () =>
      [...workspaces].sort(
        (a, b) => new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime(),
      ),
    [workspaces],
  );

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
      toast.error('Failed to create project');
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
      toast.error('Failed to open project');
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
      toast.error('Failed to open project');
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
      toast.error('Failed to remove project');
    }
  }

  const firstName = userName?.split(' ')[0];

  if (workspaces.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            {firstName ? `Welcome, ${firstName}` : 'Welcome to Litho'}
          </h1>
          <p className="text-base text-muted-foreground">
            Create your first project to start designing.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setCreateOpen(true)} className="h-11 px-5 text-base">
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
          <Button
            variant="outline"
            onClick={handleOpen}
            disabled={isOpening}
            className="h-11 px-5 text-base"
          >
            {isOpening ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="mr-1.5 h-4 w-4" />
            )}
            Open Existing
          </Button>
        </div>
        <CreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          name={newName}
          onNameChange={setNewName}
          location={newLocation}
          onLocationChange={setNewLocation}
          onSubmit={handleCreate}
          isCreating={isCreating}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {firstName ? `Welcome back, ${firstName}` : 'Your Projects'}
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="h-10 px-4 text-sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Project
          </Button>
          <Button
            variant="outline"
            onClick={handleOpen}
            disabled={isOpening}
            className="h-10 px-4 text-sm"
          >
            {isOpening ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="mr-1.5 h-4 w-4" />
            )}
            Open Existing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sorted.map((ws) => {
          const isActive = activeInfo.workspacePath === ws.path;
          const isSelecting = selectingPath === ws.path;
          const docCount = docCounts[ws.path] ?? 0;

          return (
            <button
              key={ws.path}
              type="button"
              onClick={() => {
                if (isActive) {
                  onWorkspaceSelected();
                } else {
                  void handleSelect(ws.path);
                }
              }}
              className={cn(
                'group flex cursor-pointer flex-col rounded-lg border p-4 text-left transition-colors hover:bg-muted/50',
                isActive ? 'border-forge/40 bg-forge/5' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between">
                {isSelecting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <FolderOpen
                    className={cn('h-4 w-4', isActive ? 'text-forge' : 'text-muted-foreground')}
                  />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => confirmRemove(e, ws.path)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from list
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{ws.name}</span>
                  {isActive && (
                    <Badge className="bg-forge/15 text-forge border-forge/30 text-[11px] leading-none">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {docCount} {docCount === 1 ? 'document' : 'documents'}
                  </span>
                  <span>{formatDistanceToNow(new Date(ws.lastOpened), { addSuffix: true })}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={newName}
        onNameChange={setNewName}
        location={newLocation}
        onLocationChange={setNewLocation}
        onSubmit={handleCreate}
        isCreating={isCreating}
      />

      <AlertDialog
        open={removeConfirm !== null}
        onOpenChange={(open) => !open && setRemoveConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;
              {workspaces.find((ws) => ws.path === removeConfirm)?.name ?? 'this project'}
              &quot; from your list. Your files stay on your computer.
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
  onLocationChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
  onSubmit: () => void;
  isCreating: boolean;
}): React.JSX.Element {
  useEffect(() => {
    if (!open) return;
    if (location) return;
    window.litho.workspace
      .getDefaultLocation()
      .then(onLocationChange)
      .catch(() => {});
  }, [open, location, onLocationChange]);

  async function handleChooseDirectory(): Promise<void> {
    const dir = await window.litho.workspace.chooseDirectory();
    if (dir) onLocationChange(dir);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-name" className="text-base">
              Name
            </Label>
            <Input
              id="ws-name"
              placeholder="My Brand"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && location) void onSubmit();
              }}
              className="h-11 px-4 text-base"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-base">Save to</Label>
            <div className="flex gap-2">
              <Input readOnly value={location} className="h-11 flex-1 px-4 text-sm" />
              <Button variant="outline" onClick={handleChooseDirectory} className="h-11">
                Change
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="h-11">
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={isCreating || !name.trim() || !location}
            className="h-11"
          >
            {isCreating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
