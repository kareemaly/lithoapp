import * as Sentry from '@sentry/electron/main';
import { app } from 'electron';
import { getTelemetryEnabled } from './telemetry-store';

const DSN =
  'https://467d4eeb3212e6ac332ddd04e4924ecb@o4508006800097280.ingest.us.sentry.io/4510926183071744';

export function initSentry(): void {
  if (!getTelemetryEnabled()) return;
  Sentry.init({
    dsn: DSN,
    release: `lithoapp@${app.getVersion()}`,
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
        breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
      }
      return breadcrumb;
    },
  });
}

interface SentryContext {
  tags?: Record<string, string>;
  extras?: Record<string, unknown>;
}

export function captureException(err: unknown, context?: SentryContext): void {
  if (!getTelemetryEnabled()) return;
  Sentry.withScope((scope) => {
    if (context?.tags) scope.setTags(context.tags);
    if (context?.extras) scope.setExtras(context.extras);
    Sentry.captureException(err);
  });
}

export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'error',
  context?: SentryContext,
): void {
  if (!getTelemetryEnabled()) return;
  Sentry.withScope((scope) => {
    if (context?.tags) scope.setTags(context.tags);
    if (context?.extras) scope.setExtras(context.extras);
    Sentry.captureMessage(message, level);
  });
}
