import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Theme = 'dark' | 'light' | 'system';

function applyTheme(theme: Theme): void {
  const html = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

export function AppearanceSection(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    window.litho.preferences
      .getTheme()
      .then(setTheme)
      .catch(() => {});
  }, []);

  async function handleThemeChange(value: Theme): Promise<void> {
    await window.litho.preferences.setTheme(value);
    setTheme(value);
    applyTheme(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">Customize the look and feel of Litho.</p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex flex-col gap-3">
          <Label className="text-sm font-medium">Theme</Label>
          <RadioGroup value={theme} onValueChange={handleThemeChange}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="dark" id="theme-dark" />
              <Label htmlFor="theme-dark" className="cursor-pointer text-sm">
                Dark
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="light" id="theme-light" />
              <Label htmlFor="theme-light" className="cursor-pointer text-sm">
                Light
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="system" id="theme-system" />
              <Label htmlFor="theme-system" className="cursor-pointer text-sm">
                System
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {theme === 'system'
              ? 'Litho will match your system appearance preference.'
              : 'Litho will always use the selected theme.'}
          </p>
        </div>
      </div>
    </div>
  );
}
