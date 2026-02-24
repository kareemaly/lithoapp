import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

import * as Sentry from '@sentry/electron/renderer';
import { ErrorBoundary } from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { App } from './App';

const DSN =
  'https://467d4eeb3212e6ac332ddd04e4924ecb@o4508006800097280.ingest.us.sentry.io/4510926183071744';

declare const __APP_VERSION__: string | undefined;

const telemetryEnabled = localStorage.getItem('litho-telemetry-enabled') !== 'false';
if (telemetryEnabled) {
  Sentry.init({
    dsn: DSN,
    release: typeof __APP_VERSION__ !== 'undefined' ? `lithoapp@${__APP_VERSION__}` : undefined,
    sendDefaultPii: false,
    integrations: [Sentry.breadcrumbsIntegration({ console: false })],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
        breadcrumb.data.url = breadcrumb.data.url.split('?')[0];
      }
      return breadcrumb;
    },
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary fallback={<p>Something went wrong. Please restart Litho.</p>}>
      <TooltipProvider>
        <App />
        <Toaster />
      </TooltipProvider>
    </ErrorBoundary>
  </StrictMode>,
);
