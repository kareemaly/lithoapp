import { Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Chat } from '@/components/chat/chat';
import { Button } from '@/components/ui/button';
import { useOpencode } from '@/hooks/use-opencode';
import { useSessionInit } from '@/hooks/use-session-init';
import type { ManifestDocument } from '@/hooks/use-workspace-manifest';

interface DocumentChatProps {
  doc: ManifestDocument;
  workspacePath: string;
  userName?: string;
}

function buildStorageKey(workspacePath: string, slug: string): string {
  return `litho-doc-session:${workspacePath}:${slug}`;
}

export function DocumentChat({
  doc,
  workspacePath,
  userName,
}: DocumentChatProps): React.JSX.Element {
  const { client, baseUrl, status } = useOpencode();
  const [resetKey, setResetKey] = useState(0);
  const [snapshotIndex, setSnapshotIndex] = useState<Record<string, string>>({});
  const [assetsSummary, setAssetsSummary] = useState(
    'Assets: @assets/... (workspace-level assets)',
  );

  useEffect(() => {
    void (async () => {
      try {
        const entries = await window.litho.assets.list(workspacePath, '', false);
        const dirs = entries.filter((e) => e.type === 'directory').map((e) => e.name);
        const fileCount = entries.filter((e) => e.type === 'file').length;
        const dirList = dirs.length > 0 ? `\nTop-level directories: ${dirs.join(', ')}` : '';
        setAssetsSummary(
          `Assets: ${entries.length} item(s) (${fileCount} file(s))${dirList}\n` +
            `Usage: reference as @assets/path/to/file.ext\n` +
            `The agent can explore the assets directory to find specific files.`,
        );
      } catch {
        // silent — summary has a safe default
      }
    })();
  }, [workspacePath]);

  const { sessionId, creating, createError } = useSessionInit({
    client,
    storageKey: buildStorageKey(workspacePath, doc.slug),
    sessionTitle: `Document — ${doc.slug}`,
    resetKey,
  });

  const handleNewChat = () => {
    localStorage.removeItem(buildStorageKey(workspacePath, doc.slug));
    setSnapshotIndex({});
    setResetKey((k) => k + 1);
  };

  const captureFiles = useCallback(async () => {
    return window.litho.snapshot.readDocumentFiles(workspacePath, doc.slug);
  }, [workspacePath, doc.slug]);

  const handleTurnSnapshot = useCallback(
    async ({
      files,
      assistantMessageId,
      promptExcerpt,
    }: {
      files: Record<string, string>;
      assistantMessageId: string;
      promptExcerpt: string;
    }) => {
      try {
        const snapshotId = await window.litho.snapshot.createDocument(
          workspacePath,
          doc.slug,
          files,
          promptExcerpt,
          assistantMessageId,
        );
        setSnapshotIndex((prev) => ({ ...prev, [assistantMessageId]: snapshotId }));
      } catch {
        // snapshot failure is non-fatal
      }
    },
    [workspacePath, doc.slug],
  );

  const handleRevert = useCallback(
    async (assistantMessageId: string) => {
      const snapshotId = snapshotIndex[assistantMessageId];
      if (!snapshotId) return;
      try {
        await window.litho.snapshot.restoreDocument(workspacePath, doc.slug, snapshotId);
      } catch (err) {
        console.error('[document-chat] Revert failed:', err);
        toast.error('Failed to revert document');
      }
    },
    [snapshotIndex, workspacePath, doc.slug],
  );

  const systemPrompt = `${userName ? `The user's name is ${userName}\n\n` : ''}You are helping build and edit a Litho document.

Workspace path: ${workspacePath}
Document slug: ${doc.slug}
Document title: ${doc.title}
Document size: ${doc.size.width} × ${doc.size.height} ${doc.size.unit}

Pages: ${doc.pages.join(', ')}
Page file pattern: documents/${doc.slug}/pages/{pageId}.tsx

Styles: @styles.css (workspace Tailwind theme)
${assetsSummary}`;

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">
          The AI server failed to start after multiple attempts.
        </p>
        <Button size="sm" variant="outline" onClick={() => window.litho.opencode.restart()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!client || !baseUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <MessageSquare className="size-8" />
        <p className="text-sm">Waiting for AI server...</p>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Starting session...</p>
      </div>
    );
  }

  if (createError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-destructive">
        <p className="text-sm">{createError}</p>
        <Button size="sm" variant="outline" onClick={() => setResetKey((k) => k + 1)}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!sessionId) return <div />;

  return (
    <Chat
      directory={workspacePath}
      systemPrompt={systemPrompt}
      agentName="document"
      sessionId={sessionId}
      client={client}
      baseUrl={baseUrl}
      onNewChat={handleNewChat}
      snapshotIndex={snapshotIndex}
      onRevert={handleRevert}
      captureFiles={captureFiles}
      onTurnSnapshot={handleTurnSnapshot}
    />
  );
}
