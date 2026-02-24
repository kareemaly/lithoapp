import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AboutSection } from './about-section';
import { AiProvidersSection } from './ai-providers-section';
import { PrivacySection } from './privacy-section';
import { ProfileSection } from './profile-section';

type SettingsCategory = 'profile' | 'ai-providers' | 'privacy' | 'about';

const categories: { id: SettingsCategory; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'ai-providers', label: 'AI Providers' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'about', label: 'About' },
];

export function SettingsV2Page(): React.JSX.Element {
  const [active, setActive] = useState<SettingsCategory>('profile');

  return (
    <div className="flex h-full">
      <aside className="flex w-52 shrink-0 flex-col gap-1 border-r px-3 py-6">
        <h1 className="mb-4 px-3 font-display text-3xl font-bold tracking-tight">Settings</h1>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            aria-current={active === cat.id ? 'page' : undefined}
            onClick={() => setActive(cat.id)}
            className={cn(
              'rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
              active === cat.id
                ? 'bg-secondary font-medium text-foreground'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            {cat.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {active === 'profile' && <ProfileSection />}
        {active === 'ai-providers' && <AiProvidersSection />}
        {active === 'privacy' && <PrivacySection />}
        {active === 'about' && <AboutSection />}
      </main>
    </div>
  );
}
