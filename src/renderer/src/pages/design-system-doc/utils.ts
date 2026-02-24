import type { ColorPalette, DesignSystem } from '@/lib/design-system-types';

// --- Layout constants (px at 1× scale, derived from DocPage CSS) ---
// DocPage: min-h-[1123px] p-[56px]
export const DOC_CONTENT_HEIGHT = 1123 - 56 * 2; // 1011px
// PageHeading: text-3xl (36px line-height) + pb-3 (12px) + border-b (1px) + mb-6 (24px)
const COLORS_HEADING_HEIGHT = 73;
// Per palette: text-xs name (16px) + mb-1 (4px) + h-8 strip (32px) + mt-0.5 + text-[8px] labels (10px)
export const COLORS_ROW_HEIGHT = 62;
const COLORS_ROW_GAP = 16; // gap-4

export interface PageDef {
  id: string;
  label: string;
}

export function palettesPerPage(hasHeading: boolean): number {
  const available = DOC_CONTENT_HEIGHT - (hasHeading ? COLORS_HEADING_HEIGHT : 0);
  return Math.floor((available + COLORS_ROW_GAP) / (COLORS_ROW_HEIGHT + COLORS_ROW_GAP));
}

export function chunkPalettes(palettes: ColorPalette[]): ColorPalette[][] {
  const chunks: ColorPalette[][] = [];
  let remaining = [...palettes];
  let isFirst = true;
  while (remaining.length > 0) {
    const count = palettesPerPage(isFirst);
    chunks.push(remaining.slice(0, count));
    remaining = remaining.slice(count);
    isFirst = false;
  }
  return chunks;
}

export function buildPageDefs(designSystem: DesignSystem): PageDef[] {
  const pages: PageDef[] = [{ id: 'cover', label: 'Cover' }];

  const colorPageCount = chunkPalettes(designSystem.colors.palettes).length;
  for (let i = 0; i < colorPageCount; i++) {
    pages.push({ id: `colors-${i}`, label: i === 0 ? 'Colors' : `Colors ${i + 1}` });
  }

  if (designSystem.gradients.length > 0) {
    pages.push({ id: 'gradients', label: 'Gradients' });
  }

  pages.push({ id: 'typefaces', label: 'Typefaces' });
  pages.push({ id: 'type-scale', label: 'Type Scale' });
  pages.push({ id: 'spacing', label: 'Spacing' });
  pages.push({ id: 'radius-shadows', label: 'Radius & Shadows' });

  if (designSystem.transitions.length > 0) {
    pages.push({ id: 'transitions', label: 'Transitions' });
  }
  if (designSystem.zIndex.length > 0) {
    pages.push({ id: 'z-index', label: 'Z-Index' });
  }

  return pages;
}

export function parseRemPx(value: string): number {
  const remMatch = /^([\d.]+)rem$/.exec(value);
  if (remMatch) return parseFloat(remMatch[1]) * 16;
  const pxMatch = /^([\d.]+)px$/.exec(value);
  if (pxMatch) return parseFloat(pxMatch[1]);
  return 0;
}
