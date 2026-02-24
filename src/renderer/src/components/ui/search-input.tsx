import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

const sizes = {
  sm: { input: 'h-7 pl-6 text-xs', icon: 'left-2 h-3 w-3' },
  md: { input: 'h-8 pl-8 text-sm', icon: 'left-2.5 h-3.5 w-3.5' },
};

export function SearchInput({
  placeholder,
  value,
  onChange,
  size = 'md',
  className,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}): React.JSX.Element {
  const s = sizes[size];
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className={cn('absolute top-1/2 -translate-y-1/2 text-muted-foreground', s.icon)}
      />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={s.input}
      />
    </div>
  );
}
