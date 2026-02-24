import type { ColorPalette, DesignSystem, DesignSystemToken } from '@/lib/design-system-types';
import { DocPage, PageHeading } from './page-shell';
import { chunkPalettes, parseRemPx } from './utils';

export function CoverPage({
  designSystem,
  workspaceName,
}: {
  designSystem: DesignSystem;
  workspaceName: string | null;
}): React.JSX.Element {
  const totalColors = designSystem.colors.palettes.reduce((sum, p) => sum + p.shades.length, 0);
  const families = designSystem.typography.families.length;
  const sizes = designSystem.typography.sizes.length;
  const spacing = designSystem.spacing.length;
  const radii = designSystem.radius.length;
  const shadows = designSystem.shadows.length;

  const primaryFamily = designSystem.typography.families[0];
  const allPalettes = designSystem.colors.palettes;

  return (
    // Custom wrapper: no uniform padding so the left column bleeds to all edges
    <div className="flex w-[794px] min-h-[1123px] overflow-hidden rounded-sm bg-white shadow-md">
      {/* Left: full-height stacked palette strips */}
      <div className="flex w-[200px] shrink-0 flex-col gap-px">
        {allPalettes.map((palette) => (
          <div key={palette.name} className="flex flex-1 gap-px">
            {palette.shades.map((shade) => (
              <div
                key={shade.variable}
                className="flex-1"
                style={{ backgroundColor: shade.value, maxWidth: 60 }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Right: identity — title top, specimen + stats bottom */}
      <div className="flex flex-1 flex-col justify-between p-[56px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            Design System
          </p>
          <h1
            className="mt-3 font-bold leading-none text-gray-900"
            style={{ fontFamily: primaryFamily?.value, fontSize: 64 }}
          >
            {workspaceName ?? 'Design System'}
          </h1>
        </div>

        <div className="flex flex-col gap-6">
          {primaryFamily && (
            <div>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-gray-300">
                {primaryFamily.value}
              </p>
              <div
                className="leading-snug text-gray-700"
                style={{ fontFamily: primaryFamily.value, fontSize: 20 }}
              >
                Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
              </div>
            </div>
          )}

          <div className="flex flex-col gap-0.5 text-xs text-gray-400">
            <span>{totalColors} colors</span>
            <span>
              {families} font {families === 1 ? 'family' : 'families'}
            </span>
            <span>{sizes} type sizes</span>
            <span>{spacing} spacing tokens</span>
            <span>
              {radii} radii · {shadows} shadows
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ColorsPages({
  designSystem,
  setRef,
}: {
  designSystem: DesignSystem;
  setRef: (id: string, el: HTMLElement | null) => void;
}): React.JSX.Element {
  const pages = chunkPalettes(designSystem.colors.palettes);

  return (
    <>
      {pages.map((pagePalettes, pageIdx) => (
        <section
          key={(pagePalettes[0] as ColorPalette | undefined)?.name ?? pageIdx}
          data-page-id={`colors-${pageIdx}`}
          ref={(el) => setRef(`colors-${pageIdx}`, el)}
        >
          <DocPage>
            {pageIdx === 0 && <PageHeading>Colors</PageHeading>}
            <div className="flex flex-col gap-4">
              {pagePalettes.map((palette) => (
                <div key={palette.name}>
                  <p className="mb-1 text-xs font-semibold text-gray-500">{palette.name}</p>
                  {/* gap-px: 1px dividers between shades; max-w-[120px] prevents stretching on short palettes */}
                  <div className="flex gap-px overflow-hidden rounded">
                    {palette.shades.map((shade) => (
                      <div
                        key={shade.variable}
                        className="flex flex-1 flex-col"
                        style={{ maxWidth: 60 }}
                      >
                        <div className="h-8" style={{ backgroundColor: shade.value }} />
                        <div className="mt-0.5 text-center text-[8px] leading-none text-gray-400">
                          {shade.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DocPage>
        </section>
      ))}
    </>
  );
}

export function GradientsPage({
  gradients,
}: {
  gradients: DesignSystemToken[];
}): React.JSX.Element {
  return (
    <DocPage>
      <PageHeading>Gradients</PageHeading>
      <div className="flex flex-wrap gap-8">
        {gradients.map((token) => (
          <div key={token.variable} className="flex flex-col gap-3">
            <div
              className="rounded-lg"
              style={{ width: 320, height: 80, background: token.value }}
            />
            <div>
              <p className="font-mono text-[10px] text-gray-500">{token.variable}</p>
              <p className="mt-0.5 break-all text-[8px] leading-tight text-gray-400">
                {token.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </DocPage>
  );
}

export function TypographyFamiliesPage({
  designSystem,
}: {
  designSystem: DesignSystem;
}): React.JSX.Element {
  const { families } = designSystem.typography;

  return (
    <DocPage>
      <PageHeading>Typefaces</PageHeading>
      <div className="flex flex-col gap-6">
        {families.map((family, idx) => (
          <div key={family.variable}>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-400">
              {family.variable}
              <span className="ml-2 font-normal normal-case tracking-normal text-gray-300">
                {family.value}
              </span>
            </p>
            <div style={{ fontFamily: family.value, fontSize: 20 }} className="mb-1 text-gray-700">
              Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz
            </div>
            <div
              style={{ fontFamily: family.value, fontSize: 36 }}
              className="leading-tight text-gray-900"
            >
              The quick brown fox jumps over the lazy dog.
            </div>
            {idx < families.length - 1 && <hr className="mt-5 border-gray-100" />}
          </div>
        ))}
      </div>
    </DocPage>
  );
}

export function TypeScalePage({ designSystem }: { designSystem: DesignSystem }): React.JSX.Element {
  const sorted = [...designSystem.typography.sizes].sort(
    (a, b) => parseRemPx(b.value) - parseRemPx(a.value),
  );

  return (
    <DocPage>
      <PageHeading>Type Scale</PageHeading>
      <div className="flex flex-col gap-2">
        {sorted.map((token) => (
          <div key={token.variable} className="flex items-baseline gap-3">
            <div className="w-24 shrink-0">
              <p className="font-mono text-[10px] text-gray-400">{token.variable}</p>
              <p className="text-[9px] text-gray-300">{token.value}</p>
            </div>
            <p className="truncate leading-tight text-gray-900" style={{ fontSize: token.value }}>
              The quick brown fox
            </p>
          </div>
        ))}
      </div>
    </DocPage>
  );
}

export function SpacingPage({ designSystem }: { designSystem: DesignSystem }): React.JSX.Element {
  const sorted = [...designSystem.spacing].sort(
    (a, b) => parseRemPx(a.value) - parseRemPx(b.value),
  );
  const MAX_BAR_WIDTH = 600;

  return (
    <DocPage>
      <PageHeading>Spacing</PageHeading>
      <div className="flex flex-col gap-1.5">
        {sorted.map((token) => {
          const px = parseRemPx(token.value);
          const barWidth = Math.min(px, MAX_BAR_WIDTH);
          return (
            <div key={token.variable} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-right">
                <p className="font-mono text-[10px] text-gray-500">{token.variable}</p>
                <p className="text-[9px] text-gray-400">{token.value}</p>
              </div>
              <div className="h-5 rounded bg-orange-200" style={{ width: Math.max(barWidth, 4) }} />
            </div>
          );
        })}
      </div>
    </DocPage>
  );
}

export function RadiusShadowsPage({
  designSystem,
}: {
  designSystem: DesignSystem;
}): React.JSX.Element {
  return (
    <DocPage>
      <PageHeading>Border Radius</PageHeading>
      <div className="flex flex-wrap gap-8">
        {designSystem.radius.map((token) => (
          <div key={token.variable} className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <div
                className="border border-gray-200 bg-gray-50 shadow-sm"
                style={{ width: 120, height: 120, borderRadius: token.value }}
              />
              <div
                className="border border-gray-200 bg-gray-50 shadow-sm"
                style={{ width: 200, height: 48, borderRadius: token.value }}
              />
            </div>
            <div className="text-center">
              <p className="font-mono text-[10px] text-gray-500">{token.label}</p>
              <p className="text-[9px] text-gray-400">{token.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="my-8 border-t border-gray-100" />

      <PageHeading>Shadows</PageHeading>
      <div className="flex flex-wrap gap-8">
        {designSystem.shadows.map((token) => (
          <div key={token.variable} className="flex flex-col items-center gap-3">
            <div
              className="rounded-xl bg-white"
              style={{ width: 220, height: 130, boxShadow: token.value }}
            />
            <div className="max-w-[220px] text-center">
              <p className="font-mono text-[10px] text-gray-500">{token.label}</p>
              <p className="mt-0.5 break-all text-[8px] leading-tight text-gray-400">
                {token.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </DocPage>
  );
}

export function TransitionsPage({
  transitions,
}: {
  transitions: DesignSystemToken[];
}): React.JSX.Element {
  return (
    <DocPage>
      <PageHeading>Transitions</PageHeading>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="w-40 py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
              Token
            </th>
            <th className="py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {transitions.map((token) => (
            <tr key={token.variable} className="border-b border-gray-100">
              <td className="py-2 pr-4 font-mono text-xs text-gray-500">{token.variable}</td>
              <td className="py-2 font-mono text-xs text-gray-700">{token.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocPage>
  );
}

export function ZIndexPage({ zIndex }: { zIndex: DesignSystemToken[] }): React.JSX.Element {
  const sorted = [...zIndex].sort((a, b) => Number(a.value) - Number(b.value));

  return (
    <DocPage>
      <PageHeading>Z-Index</PageHeading>
      <div className="flex flex-col gap-2">
        {sorted.map((token, idx) => (
          <div
            key={token.variable}
            className="flex items-center gap-4 rounded px-3 py-2"
            style={{ backgroundColor: `rgba(0,0,0,${0.03 + idx * 0.02})` }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-900 text-xs font-bold text-white">
              {token.value}
            </div>
            <p className="font-mono text-sm text-gray-600">{token.variable}</p>
            <p className="ml-auto text-xs text-gray-400">{token.label}</p>
          </div>
        ))}
      </div>
    </DocPage>
  );
}
