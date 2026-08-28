---
target: Board Gallery MindmapScreen
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-28T03-31-21Z
slug: src-board-boardgallery-tsx
---
# Critique: Board Gallery (Mindmap tab)

Method: dual-agent (A: design-review sub-agent · B: detector + browser-evidence sub-agent, run in parallel, isolated)

Scope: `src/board/BoardGallery.tsx` + `src/board/DanhSachBang.tsx` — the grid of board cards, empty state, in-grid search, specialty filter chips, "Đã xoá gần đây" panel, undo toast, the dashed "+" tile, the per-card "⋯" menu, and the FLIP open/close transition. The vendored BlockSuite canvas, the old `MindmapBoard.tsx`, and the app shell are out of scope.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | FLIP + preview-cover + self-drawing loader strong; but `if (loading) return null` blanks the tab during first IndexedDB read, undo toast has no countdown, partial filter gives no "showing 3 of N". B confirmed zero headings anywhere on the tab. |
| 2 | Match System / Real World | 4 | Vietnamese clinical vocabulary, pin/paper/curl metaphor, per-specialty icons, "Chắc chắn xoá?". Genuinely well matched. |
| 3 | User Control and Freedom | 3 | Two-tap delete, soft-delete, outside-click + Escape close (verified live), rename-Escape-cancels. But no true purge, no reorder, no multi-select, silent 5s auto-dismiss. |
| 4 | Consistency and Standards | 3 | Disciplined magenta-for-recovery, mind-focus-ring. But bespoke inline back FAB vs ConfirmIconButton elsewhere; 10px menu text vs 12-13px in same file; "+" tile in two geometries; tap-target heights 26-44px with no system. |
| 5 | Error Prevention | 3 | Two-tap confirm + filter-eviction guards on every mutation path (strong). But destructive "Xoá" ~1px below safe "Đổi tên"; add()/update() fire-and-forget, no failure path. |
| 6 | Recognition Rather Than Recall | 3 | Pin hue + specialty icon + name + timestamp per card. But default boards all "Bảng chưa đặt tên" distinguished by hue (lost for colorblind) + aria-hidden icon; pin hue arbitrary hash; no per-specialty counts. |
| 7 | Flexibility and Efficiency | 3 | Content-aware search, specialty filter with fold, tags, inline rename, export-from-list. No shortcuts, no favorites/sort, "+" is the last grid element, export absent on never-opened boards. |
| 8 | Aesthetic and Minimalist Design | 3 | ≤4-chip rule enforced and verified live. But each 135px tile carries name + timestamp + pin + icon/thumb + curl + tilt + parallax; empty state stacks icon + 2 paragraphs + odd-sized "+"; 10px menu cramped. |
| 9 | Error Recovery | 3 | Filter-empty state correctly distinguished from truly-empty — thoughtful. No surface for a failed write. |
| 10 | Help and Documentation | 2 | One line of empty-state copy, truly-empty grid only. No hint "⋯" exists, that search covers board content, or what pins/tags/specialty do. Near-zero self-discoverability on the core-differentiator surface. |
| **Total** | | **30/40** | **Good (75%)** |

Score volatility: each run graded by fresh independent sub-agents, so ±3-4 between runs is grading noise, not regression.

## Design Specificity Verdict

LLM assessment (A): specific skin, category-interchangeable skeleton. Details authored for this product; container is a whiteboard-app file browser.

This-product: pin/paper/curl is real material (true box-shadow, path()-curved corner, spherical-gradient pin SVG, iterated vs user photos); card tilt is a stable id hash; `mauOnDinh` boxes pin hue into 260-330 deg so it can't collide with signal hues; `chuTrenNen()` computes real per-theme WCAG contrast for chips; soft-delete + layered undo tuned to "called away mid-shift"; FLIP open captures the clicked card's real rect. Filter-eviction guards (taoBangMoi, onDoiChuyenKhoa, onLuuTen, onXoaTag, khoiPhucBang) are senior defensive work applied consistently.

Where it collapses: IA is `{search -> filter chips -> recency-sorted auto-fill grid -> trailing "+" tile -> kebab -> undo snackbar}` = Keep / FigJam / Milanote exactly. The pin holds nothing and encodes no state; its hash hue is unrelated to the specialty color on the same card. Boards have no arrangement or relationship — the charter's "see the whole" is expressed nowhere. Close a board and it jumps to index 0. Per-card metadatum is a file-manager timestamp. `<BoardGallery>` renders with no ScreenHeader.

Deterministic scan (B): `detect.mjs --json` on both files = exit 0, `[]` — zero findings, with and without config. Overlay reported 6-9 DOM anti-patterns: 5x undersized-ui-text on bottom-nav (out of scope), overused-font / bounce-easing / layout-transition (pre-approved in config), one unattributable theater-slop-phrase. Net new in-scope tooling signal: 3x undersized-ui-text on the 10px "⋯"-menu items ("Chuyên khoa/tag", "Đổi tên", "Xoá") — matches A's independent observation.

Visual overlays: none. Browser pane never composited frames (visibilityState hidden throughout) — same failure as the 2026-08-27 run. Evidence via accessibility tree, getComputedStyle/offset* measurements, console.

## Overall Impression

The engineering under this gallery is genuinely good — FLIP anchor, soft-delete safety net, pin-identity system that solves "15 boards all named 'Bảng chưa đặt tên'" within the rules, filter guards that kill a class of "I hit Undo and nothing happened" bugs. But the charter calls this the core differentiator worth >=50% of total design investment, and what greets the user is a headerless recency grid — a file manager wearing a paper texture, where metaphor and layout contradict each other. Biggest opportunity: give the tab a room — threshold, spatial identity, a reason the pinned-note metaphor exists — not more per-card polish.

## What's Working

1. Filter-eviction guards across every mutation path — create / re-specialty / rename / delete-tag / Undo each reset the filter so the board stays visible. Consistent, invisible work.
2. Soft-delete tuned to the persona — two-tap confirm -> slide-out -> 5s toast -> persistent panel sorted most-recent-first. Verified live: in/out cycle leaves no global-state corruption.
3. The pin/paper identity system pays rent — hue-hash boxed away from signal hues, per-theme contrast for chips (B: 5.96:1 active specialty, 8-9.8:1 "Tất cả", AA in both themes), stable curl/tilt hashes.

## Priority Issues

### [P1] The Mindmap tab is a headerless recency grid — no threshold, metaphor is skin not skeleton
- What: `<BoardGallery>` renders with no ScreenHeader (App.tsx ~12311). B confirmed zero headings, unlabeled `<main>`. On a generic `{search, chips, recency grid, FAB, kebab, snackbar}` skeleton sit pin/tilt/curl/paper/FLIP — but the pin holds nothing, encodes no state, and its hash hue disagrees with the specialty color on the same card; boards have no position or relationship; closing one re-sorts to index 0.
- Why: where a first-timer forms their impression of the differentiator the charter values most, and it reads as a file manager. Metaphor and layout contradict each other.
- Fix: titled bar consistent with other screens ("Sơ đồ tư duy"); ideally a physical-space surface treatment + entry beat. Make the pin mean one honest thing (favorite -> pinned top; or pin color = specialty color). Let arrangement carry meaning. Replace timestamp with node count / "links to N articles" / specialty label.
- Suggested command: /impeccable shape

### [P1] Undo recovery button fails contrast, is off-token, no countdown — at the highest-stakes moment
- What: "Hoàn tác" is `#b8196f` on hardcoded `rgba(15,23,42,.94)`. B measured 2.90:1 in light mode — WCAG AA text-contrast failure (13px normal). Background is a literal value not a `--c-*` token (DESIGN.md violation), looks like a stock Material snackbar. 5s window self-dismisses with no progress indicator. `bottom` calc doesn't use the safe-area formula `.mind-menu-bang` was already fixed to use.
- Why: reassurance UI at max anxiety is least readable, least on-brand, least predictable. User about to be called away can't gauge time; low-vision user can't read it; SR user won't reach it before it vanishes.
- Fix: token background; `--c-on-bright` or lighter magenta clearing 4.5:1 both themes; depleting progress bar / count; align `bottom` to `calc(var(--nav-body-h) + var(--nav-pad-bottom) + ...)`.
- Suggested command: /impeccable harden

### [P2] Tap targets ignore the project's own repeatedly-stated 44px rule
- What: B true layout boxes — specialty chips 32px tall, "Đã xoá gần đây" toggle 26px, toast "Hoàn tác" ~28px, per-item "Hoàn tác" 26px, inline rename input 28.8px. "⋯" and back button are a correct 44x44. Pass WCAG 2.2 AA 2.5.8 (24px) but violate the 44px standard the code itself invokes repeatedly.
- Why: Casey (one-handed, on the move) is the documented primary context. A 26px "Hoàn tác" at the moment recovery matters is a misfire; the 32px chip row is the main way to narrow a long list.
- Fix: bring chip row, both undo buttons, recently-deleted toggle, rename input to a 44px min touch box (pad hit area without inflating the visual pill). One shared min-target token.
- Suggested command: /impeccable layout

### [P2] Bottom-sheet "⋯" menu and specialty/tag panel are plain <div>s with no focus management
- What: no role=menu/dialog, no aria-modal, no focus trap, no focus move in on open, no restore on close/Escape. Mobile: sheet is position:fixed at the bottom while the trigger is at the top of a scrolled grid — keyboard focus stranded; Tab scrolls the page off the sheet. Item text 10px (overlay undersized-ui-text hits; smaller than 12-13px elsewhere in the file — a max-content width workaround, not intent). Panel `<label>`s bare (no htmlFor); select/tag input do carry aria-label. Outside-click + Escape do close it (verified) — gap is focus/roles/sizing.
- Why: rename, re-specialty, tag, export, delete all live behind this menu. Keyboard/SR: closes but never hands focus back. Everyone: 10px labels read unfinished.
- Fix: role=menu/dialog; move focus to first item on open, restore to "⋯" on close/Escape; trap Tab while open; raise item text to 12-13px (fix width workaround at root).
- Suggested command: /impeccable harden

### [P3] Cold start undersells the differentiator: a blank void, then a to-do-list empty state
- What: `if (loading) return null` renders nothing during IndexedDB read — no skeleton, header, spinner. Then truly-empty grid = muted-gray empty-breathe icon + "Bắt đầu một sơ đồ tư duy mới" + one gray sentence + dashed 96x72 "+". 2.4s opacity pulse is the only life.
- Why: on the "open in a hurry" path this is a dead frame with nothing to anchor it. The truly-empty state is where a first-timer decides whether the surface is worth their time — it looks like an empty notes app; real value props are one line of gray text.
- Fix: render header/threshold + paper-card skeleton grid during `loading`. For empty state, show don't tell — ghost-board or annotated sample (3-node differential linking to an article), real sheet/paper "+" with material motion, a headline stating the promise.
- Suggested command: /impeccable onboard

## Persona Red Flags

Jordan (first-timer): cold empty state, no header saying what the tab is. Creates a board (rename auto-focuses — good) but never discovers "⋯" exists, that search covers board content, that boards link to Library, or what pin/tilt mean. Exits without meeting the value.

Casey (one-handed mobile): "⋯" is 44x44 but has no visible background — a glyph stacked on the card's full-width open button, easy to trip. After create, grid re-sorts by recency and the card jumps to index 0. "+" tile is the last grid element. 32px chip row and 26-28px undo buttons all under thumb-target size.

Sam (a11y / SR / keyboard): zero headings — no way to orient or jump. "⋯" menu and specialty/tag panel close on Escape but never restore focus, and strand focus at the bottom of the viewport on mobile. "Thêm +N" chip is an expand/collapse toggle with neither aria-pressed nor aria-expanded. Undo toast is role=status aria-live=polite but "Hoàn tác" is unreachable the instant it auto-dismisses at 5s.

On-call clinician, 2am, one-handed: returning with boards, corkboard -> tap -> FLIP is fast and good. Fresh differential: "new board" is the last grid element (no persistent header "+"), and it forces a name before letting them draw. Dark mode: note-paper stays near-white, so a full grid of bright white cards on near-OLED-black is a retina slap (documented intentional material choice — worth revisiting for this surface).

## Minor Observations

- `data-testid="tao-bang"` on both the empty-state "+" and the grid "+" tile — duplicate id.
- "+" tile has two geometries (96x72 vs aspectRatio 4/3) and two font sizes (28/24) for one action.
- Pin hue (mauOnDinh) and specialty icon color (spec.color) on the same card are unrelated — two identity colors that can clash.
- "Đã xoá gần đây" renders above the search field — a rare recovery affordance above the primary find tool.
- Recently-deleted panel is recover-only; deleted boards accumulate in IndexedDB with no purge UI (acknowledged in comments). Unbounded growth on an offline-only device.
- Light-mode inactive chip label measured 4.38:1 (`#6b6e96` on `#f1f2fb`) — marginal AA fail at 12px/600.
- Back button is a bespoke inline round FAB; every other back control is ConfirmIconButton + icons.back. Copied the SVG path, not the component.
- No board count anywhere; specialty chips have no per-specialty counts, so a filter tap can silently yield an empty grid.
- `onXoa` uses a single dangXacNhanXoaId — a two-tap delete on board B silently resets the pending confirm on board A (first "Xoá" tap on A quietly lost).
- Grid minmax(110px,140px) + justifyContent:center inside maxWidth:720: B measured symmetric gutters at 375px and 1920px (no overflow, centering works) — but at 1920px it's a narrow centered ribbon of small cards with ~670px dead margin each side.
- CLI detector clean on both files; only real tooling signal is the 10px menu text (folded into P2).

## Questions to Consider

1. What if boards had a persistent position on a pannable board-of-boards instead of a recency grid — would spatial memory ("my sepsis board is top-left") do more for recall and for "see the whole" than any further pin polish?
2. The pin is the most-repeated mark on the surface and currently means nothing. If it encoded one honest signal — favorite, or specialty (so it agrees with the icon), or "has unsynced changes" — would that beat a decorative hash-colored dot?
3. Given the 2am "draw the differential now" scenario, should "new board" be one thumb-tap from anywhere (a persistent paper-sheet affordance in a header) and defer naming until after the first stroke?
