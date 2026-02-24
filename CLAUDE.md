# lithoapp

Electron 40 desktop application for the Litho PDF design system. React 19 + Tailwind CSS v4, built with `electron-vite`, packaged via `electron-builder`.

## Build & Development Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start in Electron dev mode (HMR)
pnpm build                # Build for production (electron-vite build)
pnpm start                # Preview production build
pnpm test                 # Run tests (vitest)
pnpm lint                 # Lint with Biome
pnpm format               # Auto-fix lint/format issues
pnpm typecheck            # Type-check (main + renderer)
```

For cross-repo dev workflow, use `make dev` from the architect project (`~/architects/litho`), which builds and links the workspace server before starting the app.

## Architecture

### Main Process (`src/main/`)

- `index.ts` — Window creation, 40+ IPC handlers, CORS for localhost
- `workspace-manager.ts` — Starts/stops workspace server instances (calls `serve()` from `@kareemaly/litho-workspace-server`)
- `opencode-manager.ts` — Manages OpenCode AI server lifecycle with crash recovery (exponential backoff)
- `export-manager.ts` — PDF/PNG/JPG export orchestration
- `snapshot-manager.ts` — Document/styles version control (rollback snapshots)
- `assets-manager.ts` — Workspace asset CRUD operations
- `workspace-store.ts` — Persistent workspace registry at `~/.config/Litho/workspace-registry.json`
- `auto-updater.ts` — electron-updater for GitHub releases
- `telemetry-store.ts` — User preferences (telemetry, profile)
- `sentry.ts` — Error reporting initialization

### Preload (`src/preload/`)

`contextBridge` exposes `window.litho` API with namespaces: `workspace`, `opencode`, `app`, `update`

### Renderer (`src/renderer/`)

- React 19 + Tailwind CSS v4 + 40+ shadcn/ui components (Radix UI)
- **Pages**: Workspaces (list/create/open), Documents (grid with iframe thumbnails), Document viewer, Settings (OpenCode providers), Admin (updates + process monitoring), Playground, Chat Playground, Assets browser
- **Hooks**: `useWorkspace()`, `useOpencode()`, `useWorkspaceManifest()` — abstract IPC calls
- **Lib** (`src/renderer/src/lib/`): SSE message handlers, cost/token extraction, chat types, slugify
- **Fonts**: Fraunces (display), Inter (sans), JetBrains Mono (mono)
- **Design**: Dark mode, primary color #e8652b (orange)

### Security

Sandbox enabled, context isolation, no nodeIntegration, CSP headers.

### Distribution

- **macOS**: `.dmg`
- **Windows**: `.exe` installer (NSIS)
- **Linux**: `.AppImage`, `.snap`, `.deb`
- Auto-updates via GitHub Releases (electron-updater), published to `kareemaly/lithoapp`

## Dependency: litho-workspace-server

This app depends on `@kareemaly/litho-workspace-server`. The main process imports `serve()`, `createWorkspace()`, `invalidateManifestCache()`, and `slugify()` to run an in-process Vite server.

- **Development**: Use `make dev` from the architect project to link the local workspace server
- **Release**: Uses the published npm version specified in `package.json`

## Workspaces

Workspaces live at `~/litho-workspaces/` (outside the repo).

## Code Style

- **Biome** for linting and formatting: single quotes, 2-space indent, 100-char line width. `components/ui/` (shadcn) is excluded from linting.
- ESM-first (`"type": "module"`)
- TypeScript strict mode, target ES2022

## Development Principles

This project is pre-release. Breaking changes are fine — there are no users to maintain backwards compatibility for. Follow best practices from the start; it's too early for tech debt.

### Simplify Relentlessly

- The simplest design that works is the best design. Remove complexity aggressively.
- Every abstraction must earn its place. If you're unsure whether to abstract, don't.
- Keep functions short and single-purpose — ideally under 20 statements.
- Keep files focused — ideally under 200-300 lines. Split when they grow beyond that.

### Fail-Fast, No Silent Errors

- Code must fail immediately when expected conditions aren't met. Silent fallbacks mask bugs.
- Throw explicit errors with clear messages explaining what failed and what was expected.
- When converting enums or union types, handle all known values explicitly and throw for unknown values.
- Surface errors to the user — no `console.error` without a corresponding toast, error state, or UI feedback.

### Separation of Concerns

- Keep business logic separate from UI components. Extract logic, calculations, and data transformations into separate files.
- UI components should orchestrate, not implement complex logic.
- Hooks should be thin wrappers around IPC/API calls and state — not containers for business rules.

### Prefer Immutability

- Don't mutate inputs; return new values.
- Use `const`, `toSorted`, object/array spreads.
- Avoid `let` — prefer creating a new function that returns the value.

### Avoid Over-Abstraction (Rule of Three)

- Wait until you have 3 instances of similar code before extracting a shared utility.
- A little duplication is better than the wrong abstraction.

### Naming Conventions

- **Files/directories**: kebab-case
- **Variables/functions**: camelCase
- **Classes/components**: PascalCase
- **Booleans**: start with `is`/`has`/`can`/`should`
- **Functions**: use verbs. Boolean-returning functions: `isX`/`hasX`/`canX`

### Exports & Imports

- Prefer named exports; avoid default exports.
- Don't create `index.ts` barrel files for internal modules — import directly from source files.

### TypeScript

- No `any`. Use `unknown` when the type is truly uncertain, then narrow it.
- Avoid type assertions (`as`) unless unavoidable.
- Let TypeScript infer return types when they're obvious.
- Use `satisfies` to check object literals match a type while preserving inference.

### Async/Await

- Any function that returns a Promise must be declared `async`.
- Always `await` async calls. Use `try/catch` for error handling, not `.then/.catch`.
- Mark intentional fire-and-forget calls with `void`.

### React & JSX

- Prefer functional, declarative components.
- Minimize `useEffect` — derive state or memoize instead.
- Break long JSX into separate components. Avoid ternary chains and inline logic with braces.
- Use `gap`/`padding` for layout spacing. Avoid margins and `space-x`/`space-y`.
- Use semantic HTML and proper accessibility patterns.
