# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## GStack

Gstack skills được cài đặt và sẵn sàng sử dụng. Sử dụng `/browse` từ gstack cho tất cả nhu cầu duyệt web — không dùng `mcp__claude-in-chrome__*`.

**Danh sách lệnh gstack:**
- `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`
- `/design-consultation`, `/design-shotgun`, `/design-html`, `/design-review`
- `/review`, `/ship`, `/land-and-deploy`, `/canary`
- `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`
- `/setup-browser-cookies`, `/setup-deploy`, `/setup-gbrain`
- `/retro`, `/investigate`, `/document-release`, `/document-generate`
- `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`
- `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`

## What this is

"Bs Trọng" — an offline-first PWA that's a personal clinical knowledge library for a doctor on call:
disease reference articles, antibiotic dosing by CrCl, IV drug infusion calculators (9 categories:
inotropes, vasoactives, vasodilators, antiarrhythmics, electrolytes, sedatives, emergency neuro,
antidotes, others), a mindmap/whiteboard, flashcards, and ECG lessons. No backend, no accounts —
everything runs and persists on-device (localStorage for most user data, IndexedDB for the mindmap
boards). UI language is Vietnamese throughout, including medical terminology. See `PRODUCT.md` for
full product context and `DESIGN.md` for the color/type/motion system.

## Commands

```bash
npm ci                              # install (npm only — see AGENTS.md)
npm run dev                         # not usually needed: a dev server already runs on $PORT
npx tsc --noEmit -p tsconfig.json   # type-check (src/ + vendored tree via generated paths)
npx vitest run                      # run full test suite
npx vitest run path/to.spec.ts      # run a single test file
npx vitest                          # watch mode
npm run build                       # production build (also runs the D16/dist gate, see below)
npm run kiem:vendor                 # D11 gate: vendored tree still matches upstream verbatim
npm run dung:vendor                 # rebuild .vendor-build/ (compile → rename → translate → hash)
```

`npm test`/`npm run build` first run `kiem-vendor-build.mjs` + `kiem-vendor-paths.mjs` (pretest/prebuild
hooks) to make sure `.vendor-build/` (gitignored, generated) is present and the generated
`tsconfig.vendor-paths.json` paths map still matches it. If those fail, run `npm run dung:vendor`
first — it does **not** re-pull from upstream, so it can't fix drift from the pinned upstream SHA
in `commit-thuong-nguon.txt`; the gate prints the exact fix command when that's the problem.

## Architecture

- **`src/App.tsx`** (~1.5k lines) is now just the app shell: the `Screen` union type,
  `navigate()`/`?screen=` query-param routing for PWA shortcuts, and all cross-screen state
  (`useState`/`useRef`, no external state-management library — see below). All screens have been
  pulled out into **`src/screens/`**: `HomeScreen.tsx`, `SearchScreen.tsx`, `DataSyncScreen.tsx`,
  `AddFlashcardScreen.tsx`, `ComingSoonScreen.tsx` are one component per file. App.tsx imports and
  re-exports the screens whose tests mount them standalone (`SearchScreen`, `DungThuocScreen`).
  New screens follow the same pattern: props-only interface, no Context at the App level, relative
  imports (no `@/` alias — the codebase doesn't use it even though `vite.config.ts` defines it).
- **`src/screens/DungThuocScreen.tsx`** (~1k lines) is the tab shell for the antibiotics/infusion
  ("Dùng thuốc") domain — tab state, tab reordering by usage, search across tabs. The rest of that
  domain lives in **`src/screens/dungThuoc/`** (19 files), split by dependency layer, not by
  screen, because most of it shares one `DosingContext` (`context.tsx`) and a set of small UI atoms
  used almost everywhere (`sharedUi.tsx`: `Chip`, `Disclosure`, `SectionLabel`, `ConfirmIconButton`,
  etc.). Roughly: `numberInput.ts` and `antibioticDrafts.tsx` are dependency-free leaves; the three
  top-level forms (`AddAntibioticScreen.tsx`, `EditAntibioticScreen.tsx`, `AddInfusionScreen.tsx`,
  each also imported directly by App.tsx as separate `Screen`s) sit above those; `PatientPanel.tsx`,
  `RunningPanel.tsx`, `CalcLogSheet.tsx`, `antibioticMixingHelpers.tsx` build on `context.tsx` +
  `sharedUi.tsx`; and `AntibioticMixPanel.tsx` → `AntibioticDoseCard.tsx` → `AntibioticsScreen.tsx`
  and `infusionMixing.tsx` → `MixPanel.tsx` / `InfusionCalculator.tsx` → `InfusionCategoryScreen.tsx`
  form the two per-drug-type mixing/calculator chains. The dependency graph between these files is a
  strict DAG (no cycles) — keep it that way when adding to this domain; check what a new piece
  actually needs before assuming it belongs in `sharedUi.tsx`.
- **`src/components/`** holds small pieces reused across screens: `icons.tsx` (the SVG icon
  library), `ScreenHeader`, `SpecialtyIcons`, `IconChevronBack`, `ErrorBoundary`, `IntroOverlay`.
- **State management**: there is no Redux/Zustand/Context-at-the-app-level — cross-screen state
  lives in `App()` and flows down one level via props. Persisted user data (custom antibiotics,
  infusions, flashcards, articles/boards) goes through two hand-rolled hooks with a shared
  `{items, add, update, remove, upsertMany, replaceAll}` API: `useLocalCollection` (localStorage,
  sync) and `useIdbCollection` (IndexedDB, async) — this pair is the project's de facto state layer
  for anything that must persist. Prefer extending that pattern over introducing a new dependency;
  the app-shell chunk size is watched closely (D13 below).
- **`src/data/`** — static seed data per drug/disease category (plain `.ts` modules), merged at
  runtime with anything the user has added locally.
- **`src/lib/`** — framework-agnostic logic and hooks shared across screens: dosing math
  (`perKgDose.ts`, `doseSafety.ts`, `infusion.ts`, `mixing.ts`), storage (`storage.ts`,
  `idb.ts`, `useLocalCollection.ts`/`useIdbCollection.ts`), theme, offline/backup helpers.
- **`src/board/`** — the React-facing wrapper around the vendored BlockSuite editor, used for both
  the Mindmap board and article ("Thư viện") rich-text editing. **Always import through
  `src/board/index.tsx`**, never reach past it into `EdgelessBoard`/`TrangBaiViet` directly — it's
  the lazy-loading + error-boundary shell that keeps a failed chunk load (e.g. opening the mindmap
  PWA shortcut offline) from tearing down the whole app. This boundary is enforced by
  `ranh-gioi-nap-bang.spec.ts`.
- **`src/vendor/blocksuite/`** — a vendored, unmodified copy of BlockSuite/AFFiNE (2600+ files).
  **Never edit it.** It's compiled and post-processed into `.vendor-build/` (gitignored) by the
  pipeline in `scripts/` (`npm run dung:vendor`): TypeScript compile → copy package.json → rename
  `affine-` → `drt-` → strip real-lookup identifiers out of displayed descriptions → filter font
  lists → translate UI strings to Vietnamese → generate the `tsconfig` paths map → hash the vendored
  tree for the D11 gate. All behavior changes for the editor go in `src/board/` or this pipeline,
  never in the vendored source itself.

### Invariants that gate CI (see `docs/superpowers/HANDOFF.md` §3–4 for full detail)

- **D11** — `src/vendor/blocksuite/` must byte-match upstream (after CRLF/LF normalization).
  Checked by `npm run kiem:vendor` against either a local upstream checkout or the committed
  `bang-bam-vendor.json` hash table.
- **D13** — the entire BlockSuite stack must stay behind `React.lazy`/dynamic `import()`. A static
  value-import from `App.tsx`/`BoardGallery.tsx` into anything that pulls in BlockSuite balloons the
  app-shell chunk for every user, not just those who open a board.
- **D16** — the release build must not leak upstream `affine-` naming; `scripts/doi-ten-vendor.mjs`
  rewrites it to `drt-` at build time, so app code matching vendored DOM/CSS should match both
  prefixes (e.g. `[class*="list-block__prefix"]`), not hardcode one. `affine:page`/`affine:surface`
  are data *flavours*, intentionally left unrenamed. Checked by `npm run build`'s `postbuild`
  (`kiem-dist.mjs`), which is the only gate that inspects the actual `dist/` output.
- CSS isolation: `@layer drt-vendor;` in `src/index.css` must stay before every `@import`, and
  `batLopCssVendor()` must keep running, or vendored editor CSS leaks into the rest of the app.

### Testing

- Vitest, default `environment: 'node'`; a spec that needs a real DOM opts in per-file with a
  `// @vitest-environment happy-dom` pragma at the top (don't flip the global default).
  `src/vendor/**` is excluded.
- Spec files: `src/**/__tests__/**/*.spec.ts(x)`.
- Shared wait/timeout helper: `src/__tests__/helpers/cho-den-khi.ts` (`HAN_GIO_CHO_MS = 8000`) is
  the single source of truth for test timeouts — if you raise it, raise `testTimeout` in
  `vite.config.ts` by the same margin so a timed-out wait fails with its own assertion, not a whole
  test timeout.

## Docs map

- `AGENTS.md` — dev server, package manager, git push policy.
- `PRODUCT.md` — product purpose, users, positioning, roadmap.
- `DESIGN.md` — color palette, type scale, motion rules (loudest color on a dosing screen is always
  a danger signal, never branding — a hardcoded hex in a component is a bug).
- `docs/superpowers/HANDOFF.md` — open technical debt vs. deliberately-declined work (don't
  "helpfully" fix items marked as declined), the gate table, and the boundaries above in full.
- `docs/superpowers/NHAT-KY-CHANG.md` — chapter-by-chapter history, including approaches already
  tried and abandoned; check here before proposing a new approach to something that looks stale.
- `src/vendor/blocksuite/README.md` — full text of the D11 rule.
