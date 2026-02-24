import { resolve } from 'node:path';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { loadEnv } from 'vite';

const env = loadEnv('', __dirname, '');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    plugins: [
      react(),
      tailwindcss(),
      sentryVitePlugin({
        org: 'kareem-elbahrawy-software-cons',
        project: 'lithoapp',
        authToken: env.SENTRY_AUTH_TOKEN,
        release: { name: `lithoapp@${process.env.npm_package_version}` },
        sourcemaps: { filesToDeleteAfterUpload: ['**/*.map'] },
      }),
    ],
    build: {
      sourcemap: true,
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
      },
    },
  },
});
