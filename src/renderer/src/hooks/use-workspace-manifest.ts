import { useCallback, useEffect, useState } from 'react';

export interface ManifestDocument {
  slug: string;
  title: string;
  size: { width: number; height: number; unit: 'mm' | 'px' };
  pages: string[];
  updatedAt: string;
}

export interface WorkspaceManifest {
  name: string;
  documents: ManifestDocument[];
}

export interface UseWorkspaceManifestReturn {
  manifest: WorkspaceManifest | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWorkspaceManifest(
  serverUrl: string | null,
  key?: string,
): UseWorkspaceManifestReturn {
  const [manifest, setManifest] = useState<WorkspaceManifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: key forces refetch on workspace switch
  const fetchManifest = useCallback(async () => {
    if (!serverUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/manifest`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setManifest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch manifest');
    } finally {
      setLoading(false);
    }
  }, [serverUrl, key]);

  useEffect(() => {
    if (!serverUrl) {
      setManifest(null);
      return;
    }
    // Clear stale data before fetching new workspace
    setManifest(null);
    setError(null);
    fetchManifest();
  }, [serverUrl, fetchManifest]);

  return { manifest, loading, error, refetch: fetchManifest };
}
