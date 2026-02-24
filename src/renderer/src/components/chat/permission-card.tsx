import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PermissionCard({
  permission,
  responding,
  onReply,
}: {
  permission: { id: string; title: string; type: string; metadata: Record<string, unknown> };
  responding: boolean;
  onReply: (id: string, response: 'once' | 'always' | 'reject') => void;
}): React.JSX.Element {
  return (
    <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader className="px-3 py-2">
        <CardTitle className="text-xs font-medium">Permission: {permission.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2 pt-0">
        <p className="mb-2 text-[11px] text-muted-foreground">{permission.type}</p>
        {Object.keys(permission.metadata).length > 0 && (
          <pre className="mb-2 max-h-20 overflow-auto text-[10px] text-muted-foreground font-mono">
            {JSON.stringify(permission.metadata, null, 2)}
          </pre>
        )}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            disabled={responding}
            onClick={() => onReply(permission.id, 'once')}
          >
            Allow Once
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            disabled={responding}
            onClick={() => onReply(permission.id, 'always')}
          >
            Always
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 text-xs"
            disabled={responding}
            onClick={() => onReply(permission.id, 'reject')}
          >
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
