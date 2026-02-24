import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function PrivacySection(): React.JSX.Element {
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);

  useEffect(() => {
    window.litho.telemetry
      .getEnabled()
      .then(setTelemetryEnabled)
      .catch(() => toast.error('Failed to load privacy settings'));
  }, []);

  async function handleToggle(value: boolean): Promise<void> {
    await window.litho.telemetry.setEnabled(value);
    setTelemetryEnabled(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Privacy</h2>
        <p className="text-sm text-muted-foreground">Control how your data is used.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1">
          <Label htmlFor="telemetry-toggle" className="text-sm font-medium">
            Send crash reports
          </Label>
          <p className="text-sm text-muted-foreground">
            Helps identify and fix issues. No personal data or file contents are collected. Restart
            required to take effect.
          </p>
        </div>
        <Switch id="telemetry-toggle" checked={telemetryEnabled} onCheckedChange={handleToggle} />
      </div>
    </div>
  );
}
