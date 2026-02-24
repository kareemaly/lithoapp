import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import type { WorkspaceEntry } from '../shared/types';

export type { WorkspaceEntry };

interface StoreData {
  workspaces: WorkspaceEntry[];
  activeWorkspacePath: string | null;
}

const DEFAULTS: StoreData = {
  workspaces: [],
  activeWorkspacePath: null,
};

function getStorePath(): string {
  return join(app.getPath('userData'), 'workspace-registry.json');
}

function read(): StoreData {
  try {
    const raw = readFileSync(getStorePath(), 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(data: StoreData): void {
  const filePath = getStorePath();
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(tmp, filePath);
}

export function getWorkspaces(): WorkspaceEntry[] {
  return read().workspaces;
}

export function addWorkspace(entry: WorkspaceEntry): void {
  const data = read();
  const idx = data.workspaces.findIndex((w) => w.path === entry.path);
  if (idx !== -1) {
    const updated = { ...entry, lastOpened: new Date().toISOString() };
    const workspaces = data.workspaces.map((w, i) => (i === idx ? updated : w));
    write({ ...data, workspaces });
  } else {
    write({ ...data, workspaces: [...data.workspaces, entry] });
  }
}

export function removeWorkspace(workspacePath: string): void {
  const data = read();
  data.workspaces = data.workspaces.filter((w) => w.path !== workspacePath);
  if (data.activeWorkspacePath === workspacePath) {
    data.activeWorkspacePath = null;
  }
  write(data);
}

export function getActiveWorkspacePath(): string | null {
  return read().activeWorkspacePath;
}

export function setActiveWorkspacePath(workspacePath: string | null): void {
  const data = read();
  data.activeWorkspacePath = workspacePath;
  write(data);
}

export function touchWorkspace(workspacePath: string): void {
  const data = read();
  const idx = data.workspaces.findIndex((w) => w.path === workspacePath);
  if (idx !== -1) {
    const workspaces = data.workspaces.map((w, i) =>
      i === idx ? { ...w, lastOpened: new Date().toISOString() } : w,
    );
    write({ ...data, workspaces });
  }
}
