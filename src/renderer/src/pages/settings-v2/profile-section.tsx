import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ProfileSection(): React.JSX.Element {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [original, setOriginal] = useState({ name: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    window.litho.preferences
      .getUserProfile()
      .then((profile) => {
        const n = profile.name ?? '';
        const e = profile.email ?? '';
        setName(n);
        setEmail(e);
        setOriginal({ name: n, email: e });
      })
      .catch(() => toast.error('Failed to load profile'));
  }, []);

  const hasChanged = name !== original.name || email !== original.email;
  const canSave = name.trim().length > 0 && hasChanged;

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    try {
      await window.litho.preferences.setUserProfile(name.trim(), email.trim());
      setOriginal({ name: name.trim(), email: email.trim() });
      toast.success('Profile saved');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">Your name and contact details.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">
            Email{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (used for crash reports &amp; feedback)
            </span>
          </Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <Button onClick={handleSave} disabled={!canSave || isSaving} size="sm">
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
