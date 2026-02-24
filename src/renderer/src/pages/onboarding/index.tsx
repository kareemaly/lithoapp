import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOpencode } from '@/hooks/use-opencode';
import { cn } from '@/lib/utils';
import { ProviderPicker } from './provider-picker';

interface OnboardingPageProps {
  onComplete: (name: string, email: string) => void;
}

function LithoLogo({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="671 564 706 920"
      fill="none"
      className={className}
    >
      <path
        fill="#C2410C"
        d="M 671.587 564.932 L 868.454 564.969 L 868.902 1483 L 671.868 1482.98 C 670.491 1366.4 671.686 1247.51 671.673 1130.72 L 671.587 564.932 z"
      />
      <path
        fill="#D97706"
        d="M 1370.37 1288.5 L 1374.53 1288.59 C 1377.24 1293.29 1375.95 1457.84 1376 1482.97 L 911.75 1482.95 L 907.499 1482.81 C 907.112 1482.37 906.724 1481.94 906.337 1481.51 C 905.969 1439.23 906.19 1323 906.206 1288.69 L 1370.37 1288.5 z"
      />
      <path
        fill="#EA580C"
        d="M 906.031 599.612 C 911.205 603.744 944.576 637.279 950.972 644.092 C 970.544 664.941 1004.9 695.471 1022.37 716.966 C 983.526 717.677 944.505 717.174 905.62 717.6 C 905.816 681.022 904.135 635.013 906.031 599.612 z"
      />
    </svg>
  );
}

const FEATURES = [
  'React + Tailwind document components',
  'AI agents that write and edit code',
  'Export to PDF across 26 formats',
];

export function OnboardingPage({ onComplete }: OnboardingPageProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [totalModels, setTotalModels] = useState(0);

  const { client, status } = useOpencode();

  function validateStep1(): boolean {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = 'Name is required';
    if (email && !/.+@.+\..+/.test(email)) next.email = 'Enter a valid email address';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleContinue(): void {
    if (validateStep1()) setStep(2);
  }

  function handleFinish(): void {
    onComplete(name.trim(), email.trim());
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Brand panel ─────────────────────────────── */}
      <div className="relative flex w-[38%] shrink-0 flex-col items-center justify-center overflow-hidden border-r border-border bg-stone-900 px-10 py-12">
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'radial-gradient(rgb(255 255 255) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Ambient glow – bottom-left */}
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-forge/15 blur-3xl" />
        {/* Ambient glow – top-right */}
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber/8 blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col items-center gap-8 text-center">
          <LithoLogo className="h-14 w-auto" />

          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Litho
            </h2>
            <p className="max-w-[180px] text-sm leading-relaxed text-muted-foreground">
              The AI-powered document studio for your desktop.
            </p>
          </div>

          <ul className="flex flex-col gap-3 text-left">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-xs text-stone-400">
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-forge" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="absolute bottom-7 text-[11px] text-stone-600">$50, once. Thank you.</p>
      </div>

      {/* ── Form panel ──────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-14 py-12">
        {/* Step progress */}
        <div className="mb-10 flex gap-1.5">
          <div className="h-0.5 w-8 rounded-full bg-forge" />
          <div
            className={cn(
              'h-0.5 w-8 rounded-full transition-colors duration-300',
              step === 2 ? 'bg-forge' : 'bg-stone-700',
            )}
          />
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Welcome to Litho
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Tell us a bit about yourself to get started.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onb-name">Your name</Label>
                <Input
                  id="onb-name"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                  autoFocus
                />
                {errors.name ? (
                  <p className="text-xs text-destructive">{errors.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Used by AI agents to address you by name.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onb-email">
                  Email <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="onb-email"
                  type="email"
                  placeholder="ada@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    For crash reports and product updates.
                  </p>
                )}
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full">
              Continue
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Connect AI Providers
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Powered by <span className="font-medium text-foreground">opencode.ai</span> — free
                models included. Add more anytime from Settings.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {status !== 'connected' || !client ? (
                <div className="flex items-center gap-2.5 py-8 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Connecting to AI server...</span>
                </div>
              ) : (
                <ProviderPicker client={client} onModelsChange={setTotalModels} />
              )}
            </div>

            <Button onClick={handleFinish} className="w-full">
              {totalModels > 0 ? `Start with ${totalModels} models` : 'Start using Litho'}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
