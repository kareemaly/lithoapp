import { cn } from '@/lib/utils';
import type { PageDef } from './utils';

export function DocPage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="bg-white rounded-sm shadow-md w-[794px] min-h-[1123px] p-[56px]">
      {children}
    </div>
  );
}

export function PageHeading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h1 className="mb-6 border-b border-gray-200 pb-3 text-3xl font-bold text-gray-900">
      {children}
    </h1>
  );
}

export function PageThumbnail({
  page,
  index,
  isActive,
  onClick,
}: {
  page: PageDef;
  index: number;
  isActive: boolean;
  onClick: (id: string) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-left transition-colors hover:bg-muted/50',
        isActive ? 'border-l-2 border-primary bg-muted pl-[10px]' : 'border-l-2 border-transparent',
      )}
      onClick={() => onClick(page.id)}
    >
      <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground/50">
        {index + 1}
      </span>
      <span
        className={cn(
          'truncate text-xs',
          isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {page.label}
      </span>
    </button>
  );
}
