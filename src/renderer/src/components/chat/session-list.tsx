import type { Session } from '@opencode-ai/sdk/client';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { OpencodeClient } from '@/lib/opencode-client-types';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SessionList({
  directory,
  client,
  onSelectSession,
}: {
  directory: string;
  client: OpencodeClient | null;
  onSelectSession: (id: string) => void;
}): React.JSX.Element {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const query = directory.trim() ? { directory: directory.trim() } : undefined;
      const result = await client.session.list({ query });
      if (result.data) {
        const sorted = [...result.data].sort((a, b) => {
          const aTime = a.time?.updated ?? a.time?.created ?? 0;
          const bTime = b.time?.updated ?? b.time?.created ?? 0;
          return bTime - aTime;
        });
        setSessions(sorted);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [client, directory]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = useCallback(async () => {
    if (!client) return;
    setCreating(true);
    setError(null);
    try {
      const query = directory.trim() ? { directory: directory.trim() } : undefined;
      const result = await client.session.create({ body: {}, query });
      if (result.data) {
        onSelectSession(result.data.id);
      } else {
        setError('Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setCreating(false);
    }
  }, [client, directory, onSelectSession]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!client) return;
      try {
        await client.session.delete({ path: { id } });
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete session');
      }
    },
    [client],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Sessions</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={creating || !client}
          onClick={handleCreate}
        >
          {creating ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3 w-3" />
          )}
          New Session
        </Button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && <p className="px-3 py-4 text-xs text-destructive">{error}</p>}

        {!loading && sessions.length === 0 && (
          <p className="py-12 text-center text-xs text-muted-foreground">
            No sessions yet. Create one to get started.
          </p>
        )}

        {!loading && sessions.length > 0 && (
          <div className="flex flex-col gap-1 p-2">
            {sessions.map((session) => {
              const updatedAt = session.time?.updated ?? session.time?.created ?? 0;
              const title = session.title || `Session ${session.id.slice(0, 8)}`;

              return (
                <button
                  type="button"
                  key={session.id}
                  className="group flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted/50 cursor-pointer"
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{title}</p>
                    {updatedAt > 0 && (
                      <p className="text-[10px] text-muted-foreground">{timeAgo(updatedAt)}</p>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete session?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this session and all its messages.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(session.id);
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
