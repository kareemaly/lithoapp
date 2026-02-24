import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import type { WorkspaceManifest } from '@kareemaly/litho-workspace-server';
import { serve } from '@kareemaly/litho-workspace-server';
import type { ExportFormat } from '../shared/types';
import { ExportManager } from './export-manager';

const JPG_QUALITY = 90;
const MM_DPI_VARIANTS = [72, 150, 300] as const;

interface ExportJob {
  format: ExportFormat;
  dpi: number;
  subdir: string;
  pages: string[];
  savePath: string;
}

function log(message: string): void {
  console.log(`[batch-export] ${message}`);
}

async function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Failed to get port')));
      }
    });
    srv.on('error', reject);
  });
}

function parseArgs(): { workspacePath: string; outputPath: string } {
  const args = process.argv;
  const wsIdx = args.indexOf('--workspace');
  const outIdx = args.indexOf('--output');

  if (wsIdx === -1 || wsIdx + 1 >= args.length) {
    throw new Error('Usage: --batch-export --workspace <path> --output <path>');
  }
  if (outIdx === -1 || outIdx + 1 >= args.length) {
    throw new Error('Usage: --batch-export --workspace <path> --output <path>');
  }

  return {
    workspacePath: args[wsIdx + 1],
    outputPath: args[outIdx + 1],
  };
}

type ManifestDoc = WorkspaceManifest['documents'][number];

function buildJobs(doc: ManifestDoc, outputPath: string): ExportJob[] {
  const docDir = join(outputPath, doc.slug);
  const isMm = doc.size.unit === 'mm';
  const jobs: ExportJob[] = [];

  // PDF: one merged file per document, no DPI variants
  jobs.push({
    format: 'pdf',
    dpi: 72,
    subdir: 'pdf',
    pages: doc.pages,
    savePath: join(docDir, 'pdf', `${doc.slug}.pdf`),
  });

  // Image formats
  const imageFormats: ExportFormat[] = ['png', 'jpg'];

  for (const format of imageFormats) {
    if (isMm) {
      // mm-based: 3 DPI variants, one file per page
      for (const dpi of MM_DPI_VARIANTS) {
        const subdir = `${format}-${dpi}dpi`;
        for (const pageId of doc.pages) {
          jobs.push({
            format,
            dpi,
            subdir,
            pages: [pageId],
            savePath: join(docDir, subdir, `${pageId}.${format}`),
          });
        }
      }
    } else {
      // px-based: single variant (native pixels), no DPI suffix
      const subdir = format;
      for (const pageId of doc.pages) {
        jobs.push({
          format,
          dpi: 72,
          subdir,
          pages: [pageId],
          savePath: join(docDir, subdir, `${pageId}.${format}`),
        });
      }
    }
  }

  return jobs;
}

export async function runBatchExport(): Promise<void> {
  const { workspacePath, outputPath } = parseArgs();
  log(`Workspace: ${workspacePath}`);
  log(`Output:    ${outputPath}`);

  const port = await findAvailablePort();
  const server = await serve(workspacePath, { port });
  log(`Server running at ${server.url}`);

  try {
    const res = await fetch(`${server.url}/api/manifest`);
    if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
    const manifest: WorkspaceManifest = await res.json();
    log(`Found ${manifest.documents.length} documents`);

    const exportManager = new ExportManager();
    let completedJobs = 0;

    const docJobs = manifest.documents.map((doc) => ({
      doc,
      jobs: buildJobs(doc, outputPath),
    }));
    const totalJobs = docJobs.reduce((sum, dj) => sum + dj.jobs.length, 0);
    log(`Total export jobs: ${totalJobs}`);

    for (const { doc, jobs } of docJobs) {
      log(
        `\n--- ${doc.title} (${doc.slug}) | ` +
          `${doc.size.width}x${doc.size.height}${doc.size.unit} | ` +
          `${doc.pages.length} page(s) ---`,
      );

      for (const job of jobs) {
        await mkdir(join(outputPath, doc.slug, job.subdir), { recursive: true });

        log(`[${completedJobs + 1}/${totalJobs}] ${job.format} ${job.subdir}`);

        await exportManager.exportDocument({
          format: job.format,
          serverUrl: server.url,
          slug: doc.slug,
          title: doc.title,
          pages: job.pages,
          size: doc.size,
          dpi: job.dpi,
          jpgQuality: JPG_QUALITY,
          savePath: job.savePath,
        });

        completedJobs++;
      }
    }

    log(`\nBatch export complete: ${completedJobs} jobs`);
  } finally {
    await server.close();
    log('Server stopped');
  }
}
