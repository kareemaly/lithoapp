import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DocumentSnapshot } from '../shared/types';

// ---- Internal helpers ----

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readIndex(dir: string): Record<string, string> {
  const indexPath = join(dir, 'index.json');
  if (!existsSync(indexPath)) return {};
  return JSON.parse(readFileSync(indexPath, 'utf-8')) as Record<string, string>;
}

function writeIndex(dir: string, index: Record<string, string>): void {
  writeFileSync(join(dir, 'index.json'), JSON.stringify(index, null, 2));
}

function pruneSnapshots(dir: string, keepCount: number): void {
  const entries = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => {
      const filePath = join(dir, f);
      const data = JSON.parse(readFileSync(filePath, 'utf-8')) as DocumentSnapshot;
      return { id: data.id, timestamp: data.timestamp, filePath };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (entries.length <= keepCount) return;

  const toDelete = entries.slice(0, entries.length - keepCount);
  const index = readIndex(dir);

  for (const entry of toDelete) {
    rmSync(entry.filePath);
    for (const msgId of Object.keys(index)) {
      if (index[msgId] === entry.id) {
        delete index[msgId];
      }
    }
  }

  writeIndex(dir, index);
}

function documentSnapshotsDir(workspacePath: string, slug: string): string {
  return join(workspacePath, 'documents', slug, '.snapshots');
}

function stylesSnapshotsDir(workspacePath: string): string {
  return join(workspacePath, '.snapshots', 'styles');
}

// ---- Document snapshots ----

export function readDocumentFiles(workspacePath: string, slug: string): Record<string, string> {
  const docDir = join(workspacePath, 'documents', slug);
  const files: Record<string, string> = {};

  const docJsonPath = join(docDir, 'document.json');
  if (existsSync(docJsonPath)) {
    files['document.json'] = readFileSync(docJsonPath, 'utf-8');
  }

  const pagesDir = join(docDir, 'pages');
  if (existsSync(pagesDir)) {
    for (const f of readdirSync(pagesDir)) {
      if (f.endsWith('.tsx')) {
        files[`pages/${f}`] = readFileSync(join(pagesDir, f), 'utf-8');
      }
    }
  }

  return files;
}

export function createDocumentSnapshot(
  workspacePath: string,
  slug: string,
  files: Record<string, string>,
  promptExcerpt: string,
  assistantMessageId: string,
  keepCount = 20,
): string {
  const dir = documentSnapshotsDir(workspacePath, slug);
  ensureDir(dir);

  const id = randomUUID();
  const snapshot: DocumentSnapshot = {
    id,
    timestamp: new Date().toISOString(),
    promptExcerpt,
    assistantMessageId,
    files,
  };

  writeFileSync(join(dir, `${id}.json`), JSON.stringify(snapshot, null, 2));

  const index = readIndex(dir);
  index[assistantMessageId] = id;
  writeIndex(dir, index);

  pruneSnapshots(dir, keepCount);

  return id;
}

export function restoreDocumentSnapshot(
  workspacePath: string,
  slug: string,
  snapshotId: string,
): void {
  const dir = documentSnapshotsDir(workspacePath, slug);
  const snapshotPath = join(dir, `${snapshotId}.json`);

  if (!existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8')) as DocumentSnapshot;
  const docDir = join(workspacePath, 'documents', slug);

  for (const [relativePath, content] of Object.entries(snapshot.files)) {
    const fullPath = join(docDir, relativePath);
    const parentDir = dirname(fullPath);
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  }
}

export function listDocumentSnapshots(workspacePath: string, slug: string): DocumentSnapshot[] {
  const dir = documentSnapshotsDir(workspacePath, slug);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as DocumentSnapshot)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function deleteDocumentSnapshot(
  workspacePath: string,
  slug: string,
  snapshotId: string,
): void {
  const dir = documentSnapshotsDir(workspacePath, slug);
  const snapshotPath = join(dir, `${snapshotId}.json`);

  if (!existsSync(snapshotPath)) return;

  rmSync(snapshotPath);

  const index = readIndex(dir);
  for (const msgId of Object.keys(index)) {
    if (index[msgId] === snapshotId) {
      delete index[msgId];
    }
  }
  writeIndex(dir, index);
}

// ---- Styles snapshots ----

export function readStylesFile(workspacePath: string): Record<string, string> {
  const stylesPath = join(workspacePath, 'styles.css');
  if (!existsSync(stylesPath)) return {};
  return { 'styles.css': readFileSync(stylesPath, 'utf-8') };
}

export function createStylesSnapshot(
  workspacePath: string,
  files: Record<string, string>,
  promptExcerpt: string,
  assistantMessageId: string,
  keepCount = 20,
): string {
  const dir = stylesSnapshotsDir(workspacePath);
  ensureDir(dir);

  const id = randomUUID();
  const snapshot: DocumentSnapshot = {
    id,
    timestamp: new Date().toISOString(),
    promptExcerpt,
    assistantMessageId,
    files,
  };

  writeFileSync(join(dir, `${id}.json`), JSON.stringify(snapshot, null, 2));

  const index = readIndex(dir);
  index[assistantMessageId] = id;
  writeIndex(dir, index);

  pruneSnapshots(dir, keepCount);

  return id;
}

export function restoreStylesSnapshot(workspacePath: string, snapshotId: string): void {
  const dir = stylesSnapshotsDir(workspacePath);
  const snapshotPath = join(dir, `${snapshotId}.json`);

  if (!existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8')) as DocumentSnapshot;

  for (const [relativePath, content] of Object.entries(snapshot.files)) {
    writeFileSync(join(workspacePath, relativePath), content, 'utf-8');
  }
}

export function listStylesSnapshots(workspacePath: string): DocumentSnapshot[] {
  const dir = stylesSnapshotsDir(workspacePath);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')) as DocumentSnapshot)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function deleteStylesSnapshot(workspacePath: string, snapshotId: string): void {
  const dir = stylesSnapshotsDir(workspacePath);
  const snapshotPath = join(dir, `${snapshotId}.json`);

  if (!existsSync(snapshotPath)) return;

  rmSync(snapshotPath);

  const index = readIndex(dir);
  for (const msgId of Object.keys(index)) {
    if (index[msgId] === snapshotId) {
      delete index[msgId];
    }
  }
  writeIndex(dir, index);
}
