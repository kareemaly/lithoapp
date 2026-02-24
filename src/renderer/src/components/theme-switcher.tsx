import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

function resolveIsDark(theme: 'system' | 'light' | 'dark'): boolean {
  return (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export function ThemeSwitcher(): React.JSX.Element {
  const [isDark, setIsDark] = useState(() => resolveIsDark('system'));

  useEffect(() => {
    window.litho.preferences
      .getTheme()
      .then((saved) => {
        const dark = resolveIsDark(saved);
        setIsDark(dark);
        document.documentElement.classList.toggle('dark', dark);
      })
      .catch(() => {});
  }, []);

  async function toggle(): Promise<void> {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
    await window.litho.preferences.setTheme(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => void toggle()}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </Button>
  );
}
