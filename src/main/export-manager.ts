import { EventEmitter } from 'node:events';
import { promises as fs } from 'node:fs';
import { BrowserWindow } from 'electron';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import type { ExportFormat, ExportProgress, ExportRequest } from '../shared/types';
import { captureException } from './sentry';

const PAGE_READY_TIMEOUT_MS = 15_000;
const CAPTURE_TIMEOUT_MS = 30_000;
const PAINT_SETTLE_MS = 500;

function log(message: string, ...args: unknown[]): void {
  console.log(`[export] ${message}`, ...args);
}

function mmToCssPx(mm: number): number {
  return mm * 3.7795;
}

function mmToDpiPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class ExportManager extends EventEmitter {
  private progress: ExportProgress = { status: 'idle', current: 0, total: 0 };

  getProgress(): ExportProgress {
    return { ...this.progress };
  }

  async exportDocument(request: ExportRequest): Promise<void> {
    if (this.progress.status === 'exporting') {
      throw new Error('An export is already in progress');
    }

    const { format, serverUrl, slug, pages, size, dpi, jpgQuality, savePath } = request;

    log('Starting export', { format, slug, pageCount: pages.length, size, dpi, savePath });
    this.setProgress({ status: 'exporting', current: 0, total: pages.length });

    try {
      const buffers: Buffer[] = [];

      for (let i = 0; i < pages.length; i++) {
        this.setProgress({ status: 'exporting', current: i, total: pages.length });
        const pageUrl = `${serverUrl}/${slug}/${pages[i]}`;
        log(`Capturing page ${i + 1}/${pages.length}: ${pageUrl}`);
        const buffer = await this.capturePage(pageUrl, size, format, dpi, jpgQuality);
        log(`Page ${i + 1} captured, ${buffer.length} bytes`);
        buffers.push(buffer);
      }

      log('Assembling output...');
      await this.assembleOutput(buffers, format, savePath);
      log('Export complete');
      this.setProgress({ status: 'done', current: pages.length, total: pages.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      log('Export failed:', message);
      captureException(err, {
        tags: { component: 'export-manager' },
        extras: { slug, format, pageCount: pages.length },
      });
      this.setProgress({ status: 'error', current: 0, total: pages.length, error: message });
      throw err;
    }
  }

  private async capturePage(
    url: string,
    size: ExportRequest['size'],
    format: ExportFormat,
    dpi: number,
    jpgQuality: number,
  ): Promise<Buffer> {
    const cssPxWidth = size.unit === 'mm' ? mmToCssPx(size.width) : size.width;
    const cssPxHeight = size.unit === 'mm' ? mmToCssPx(size.height) : size.height;

    const isPdf = format === 'pdf';

    // For PDF: window matches CSS pixel dimensions (printToPDF handles sizing).
    // For images: window is the target DPI pixel size, with a zoom factor so
    // the CSS layout viewport stays at the content's native CSS pixel size.
    // This triggers a real re-layout (unlike CSS transform) so h-full, mt-auto,
    // flexbox, etc. all work correctly at the target resolution.
    const targetWidth = isPdf
      ? Math.round(cssPxWidth)
      : size.unit === 'mm'
        ? mmToDpiPx(size.width, dpi)
        : size.width;
    const targetHeight = isPdf
      ? Math.round(cssPxHeight)
      : size.unit === 'mm'
        ? mmToDpiPx(size.height, dpi)
        : size.height;

    const zoomFactor = isPdf ? 1 : targetWidth / cssPxWidth;

    log(`Creating capture window ${targetWidth}x${targetHeight}, zoom=${zoomFactor.toFixed(3)}`);

    const win = new BrowserWindow({
      width: targetWidth,
      height: targetHeight,
      show: false,
      useContentSize: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });

    // Attach diagnostic listeners
    win.webContents.on('did-start-loading', () => log('  event: did-start-loading'));
    win.webContents.on('dom-ready', () => log('  event: dom-ready'));
    win.webContents.on('did-finish-load', () => log('  event: did-finish-load'));
    win.webContents.on('did-stop-loading', () => log('  event: did-stop-loading'));
    win.webContents.on('did-fail-load', (_e, code, desc, failUrl) => {
      log(`  event: did-fail-load code=${code} desc="${desc}" url=${failUrl}`);
    });
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      log(`  console[${level}]: ${message} (${sourceId}:${line})`);
    });

    try {
      log(`Loading URL: ${url}`);
      await withTimeout(win.loadURL(url), CAPTURE_TIMEOUT_MS, 'Page load');
      log('loadURL resolved');

      await this.waitForPageReady(win);
      log('Page ready');

      // Hide scrollbars via pseudo-element (no overflow:hidden which would clip content)
      await win.webContents.executeJavaScript(`
        (() => {
          const s = document.createElement('style');
          s.textContent = '::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }';
          document.head.appendChild(s);
        })();
      `);

      if (isPdf) {
        return await this.capturePdf(win, size);
      }

      // Apply zoom AFTER page load to trigger a real re-layout at the target
      // resolution. setZoomFactor changes the CSS layout viewport
      // (viewport = windowWidth / zoom), so the content fills the window and
      // layout properties (h-full, mt-auto, flexbox) recalculate correctly.
      // Must be set after load — Chromium resets zoom on navigation.
      if (zoomFactor !== 1) {
        log(`Setting zoom factor to ${zoomFactor.toFixed(3)}`);
        win.webContents.setZoomFactor(zoomFactor);
        await new Promise((resolve) => setTimeout(resolve, PAINT_SETTLE_MS));
      }

      return await this.captureImage(win, targetWidth, targetHeight, format, jpgQuality);
    } finally {
      win.destroy();
    }
  }

  private async capturePdf(win: BrowserWindow, size: ExportRequest['size']): Promise<Buffer> {
    // Inject @page CSS so the browser handles unit conversion reliably.
    // preferCSSPageSize avoids Electron's ambiguous custom pageSize units.
    const cssWidth = size.unit === 'mm' ? `${size.width}mm` : `${size.width / 96}in`;
    const cssHeight = size.unit === 'mm' ? `${size.height}mm` : `${size.height / 96}in`;
    log(`Injecting @page { size: ${cssWidth} ${cssHeight}; margin: 0 }`);
    await win.webContents.executeJavaScript(`
      (() => {
        const s = document.createElement('style');
        s.textContent = '@page { size: ${cssWidth} ${cssHeight}; margin: 0; }';
        document.head.appendChild(s);
      })();
    `);

    log('Calling printToPDF');
    const pdfBuffer = await withTimeout(
      win.webContents.printToPDF({
        margins: { marginType: 'none' },
        printBackground: true,
        preferCSSPageSize: true,
        scale: 1,
      }),
      CAPTURE_TIMEOUT_MS,
      'printToPDF',
    );
    return Buffer.from(pdfBuffer);
  }

  private async captureImage(
    win: BrowserWindow,
    targetWidth: number,
    targetHeight: number,
    format: ExportFormat,
    jpgQuality: number,
  ): Promise<Buffer> {
    log('Calling capturePage');
    let image = await win.webContents.capturePage();

    // On HiDPI (Retina) displays, capturePage returns physical pixels which
    // may exceed the target dimensions. Resize to the exact target.
    const captured = image.getSize();
    log(`Captured ${captured.width}x${captured.height}, target ${targetWidth}x${targetHeight}`);
    if (captured.width !== targetWidth || captured.height !== targetHeight) {
      image = image.resize({ width: targetWidth, height: targetHeight });
    }

    if (format === 'jpg') {
      return image.toJPEG(jpgQuality);
    }
    return image.toPNG();
  }

  private async waitForPageReady(win: BrowserWindow): Promise<void> {
    log('Polling for React render (#root children)...');
    const startTime = Date.now();
    let pollCount = 0;
    while (Date.now() - startTime < PAGE_READY_TIMEOUT_MS) {
      const childCount = await win.webContents.executeJavaScript(`
        (() => {
          const root = document.getElementById('root');
          return root ? root.children.length : -1;
        })();
      `);
      pollCount++;
      if (pollCount <= 5 || pollCount % 20 === 0) {
        log(`  poll #${pollCount}: root.children.length = ${childCount}`);
      }
      if (typeof childCount === 'number' && childCount > 0) {
        log(`  React rendered after ${Date.now() - startTime}ms (${pollCount} polls)`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (Date.now() - startTime >= PAGE_READY_TIMEOUT_MS) {
      log('  WARNING: React render poll timed out, proceeding anyway');
    }

    // Settle delay for Tailwind CDN style processing
    log(`Waiting ${PAINT_SETTLE_MS}ms for paint settle`);
    await new Promise((resolve) => setTimeout(resolve, PAINT_SETTLE_MS));
  }

  private async assembleOutput(
    buffers: Buffer[],
    format: ExportFormat,
    savePath: string,
  ): Promise<void> {
    if (format === 'pdf') {
      await this.mergePdfs(buffers, savePath);
    } else if (buffers.length === 1) {
      await fs.writeFile(savePath, buffers[0]);
    } else {
      await this.bundleZip(buffers, format, savePath);
    }
  }

  private async mergePdfs(buffers: Buffer[], savePath: string): Promise<void> {
    const mergedPdf = await PDFDocument.create();
    for (const buffer of buffers) {
      const donor = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(donor, donor.getPageIndices());
      for (const page of pages) {
        mergedPdf.addPage(page);
      }
    }
    await fs.writeFile(savePath, await mergedPdf.save());
  }

  private async bundleZip(
    buffers: Buffer[],
    format: ExportFormat,
    savePath: string,
  ): Promise<void> {
    const zip = new JSZip();
    const ext = format === 'jpg' ? 'jpg' : 'png';
    for (let i = 0; i < buffers.length; i++) {
      zip.file(`page-${i + 1}.${ext}`, buffers[i]);
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(savePath, zipBuffer);
  }

  private setProgress(progress: ExportProgress): void {
    this.progress = progress;
    this.emit('progress', { ...progress });
  }
}
