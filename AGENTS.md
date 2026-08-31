React + Vite + Tailwind CSS project running inside.

## Development Server

A Vite development server is **always running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Package manager

**npm is authoritative.** `package-lock.json` is the lockfile that is kept current; install with
`npm ci`. There is no pnpm setup: `pnpm-lock.yaml` used to be tracked here but described a
2-dependency project long after `package.json` had grown to 67 runtime dependencies (plus 19 dev
ones), so `pnpm install` produced an unusable tree — it has been removed rather than left as a
trap.

## Key Files

- `src/App.tsx` - Main application component
- `src/main.tsx` - React entry point
- `src/board/` - React wrapper around the vendored BlockSuite edgeless board (lazy-loaded)
- `src/index.css` - Global styles and Tailwind CSS import
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Vite configuration
- `scripts/` - Vendor build pipeline (`npm run dung:vendor`) and the `kiem:*` gates

## Styling

This project uses **Tailwind CSS v4** for styling. Use Tailwind utility classes directly in JSX. Tailwind is loaded via the Vite plugin — no PostCSS config needed.

## Git workflow

The user has authorized automatic `git push` to `origin main` without asking for confirmation each time, standing from 2026-08-04. Push after finishing a coherent chunk of work (a completed task or feature that builds/type-checks cleanly) — not after every single file edit. Still follow normal commit hygiene: stage only relevant files, write a clear commit message, never force-push, never push if the build/type-check is broken.