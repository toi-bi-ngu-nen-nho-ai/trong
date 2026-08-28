---
target: Board Gallery MindMapScreen
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-28T08-39-24Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: design review, Sonnet 5 · B: detector + browser evidence, Sonnet 5), isolated, parallel.

Reliability caveats: Assessment A's browser leg failed entirely (`computer{screenshot}` → "the Browser pane is not displayed, so the page is not compositing frames"); A stalled once on the watchdog, was resumed, and delivered a source-only review. The parent agent measured the live page directly to compensate and found a P0 both assessments missed.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton grid, loading dots, undo countdown all good; no signal when an IndexedDB write fails |
| 2 | Match System / Real World | 4 | Pinned-paper metaphor consistent down to material detail; Vietnamese clinical language throughout |
| 3 | User Control and Freedom | 4 | Escape cancels everything; two-layer soft delete (5s toast + "Đã xoá gần đây" panel) |
| 4 | Consistency and Standards | 2 | The paper deliberately does not theme-swap, but the ink drawn on it still does — root cause of the P0 |
| 5 | Error Prevention | 3 | Two-step delete + divider before destructive item; new board auto-opens rename |
| 6 | Recognition Rather Than Recall | 1 | In dark mode the sole entry point to every card action is invisible (1.03:1) — pure recall |
| 7 | Flexibility and Efficiency | 2 | Search + specialty filter + tags; no keyboard shortcuts, no bulk operations |
| 8 | Aesthetic and Minimalist Design | 3 | Detector fully clean; 2-line clamp, 4-chip limit — but dark mode destroys the material itself |
| 9 | Error Recovery | 2 | Undo for user error is strong; system error (failed write) has no recovery path at all |
| 10 | Help and Documentation | 2 | Empty state explains value well; no in-context help at the risky moment (delete) |
| **Total** | | **26/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment:** High, not in question. Not a transplantable UI: gradient pin hashed off the board id, paper with a `clip-path: path()` curled corner and real drop shadow, magenta hard-scoped to Mindmap only, and a FLIP that measures the real `getBoundingClientRect()` of the tapped card then scales it to fullscreen (BoardGallery.tsx:176). Comment density justifying individual px decisions shows many rounds of real feedback.

**Deterministic scan:** `detect.mjs` across all three files → `[]`, exit 0, **zero findings**. Assessment B verified the detector was not no-opping (1,836 real lines scanned).

**In-page overlay:** injection **succeeded**, `detect.js` genuinely ran in the page, console reported 6 findings — **all 6 are the 10px bottom-nav labels** ("Trang chủ", "Thư viện"…), a shared app-wide component **outside scope**. DESIGN.md documents 10px as a deliberate choice with its own AA constraint → contextual false positive. **No overlay is currently visible**: live-server was stopped (`/stop` 200 OK, PID gone) and the pane never composited.

## Overall Impression

The surface is unusually well cared for — and that care created the hole. The boldest design decision is "real paper does not change colour with the room light": `--c-note` stays near-white in **both** themes. That decision is right and beautiful. But it was applied only to the **paper**, never to the **ink on the paper**. Everything drawn on the sheet still inherits theme-swapping tokens, so at night, light ink meets light paper.

The biggest opportunity is not a new feature — it is finishing one rule the system already set for itself: if the paper gets its own material, the paper must get its own ink.

## What's Working

1. **Two-layer soft delete designed for the real clinical scene.** 5s undo toast *plus* a durable "Đã xoá gần đây" panel — the comment names the "called away mid-shift" scenario outright (DanhSachBang.tsx:751). Designed against a real fear, not a token toast.
2. **FLIP continuity is real engineering, not a scale-fade.** Measures the true rect, falls back when rect is 0×0, double-latches `transitionend`+`animationend` so the overlay cannot stick (BoardGallery.tsx:176-226).
3. **Clean measured foundation:** grid 2/4/4 columns at 375/768/1280px as intended, **no horizontal overflow** at any breakpoint, **zero console errors or React warnings** across a full interaction session, detector zero findings.

## Priority Issues

### [P0] The `⋯` button — the only entry point to every card action — is invisible in dark mode

Live measurements (`data-theme="dark"`):

| Element | Ink | Real paper background | Contrast |
|---|---|---|---|
| `⋯` glyph | `rgb(236,239,252)` | `rgb(239,236,227)` | **1.03:1** |
| Badge, board with no specialty | `rgb(136,142,184)` | `rgb(239,236,227)` | **2.69:1** (below the 3:1 floor) |
| Badge, specialty assigned | `rgb(177,58,52)` | `rgb(239,236,227)` | 5.04:1 OK |
| Same `⋯` in light mode | | | 17.33:1 OK |

**Why Assessment B missed it:** `.mind-note-card` paints via `linear-gradient`, so its computed `background-color` is `rgba(0,0,0,0)`. B's contrast probe fell *through* the paper to the app surface `#14162c` behind it and reported 15.5:1 — a colour pair that does not exist on screen.

**Root cause:** the button sets no `color` (DanhSachBang.tsx:457 — only `background:'none'`, `border:0`), so it inherits `--c-text`, which flips near-white in dark mode, while `--c-note` deliberately does not flip (index.css:140).

**Why it matters:** rename, assign specialty, export PNG, delete — all routed through this button. In dark mode it leaves the screen. DESIGN.md declares night-shift use a first-class constraint; this is exactly where that constraint breaks.

**Fix:** add a paper-local, theme-invariant ink token mirroring `--c-on-bright`: `--c-on-note: #12142b` in both themes, then set `color: var(--c-on-note)` on the `⋯` button and on the default badge branch in `TheTrong` (DanhSachBang.tsx:127). One token, two usages — the material metaphor is untouched.

**Suggested command:** `/impeccable polish src/board/DanhSachBang.tsx`

### [P1] Silent IndexedDB write failure — no recovery path

`src/lib/useIdbCollection.ts` calls `void idbPut(...)` in `add`/`update`/`remove` with no error handling. The UI updates optimistically and **always** looks like the save succeeded.

**Nuance A missed:** this is an **app-wide shared hook** (articles, ECG lessons), not a Board Gallery defect. Patching it only inside `DanhSachBang.tsx` would create two different save behaviours in one app.

**Why it matters:** quota exhaustion or blocked IndexedDB (private mode) makes the **Undo** action itself — the last line of recovery — fail silently, breaking PRODUCT.md's "soft delete, recoverable" promise.

**Fix:** have `useIdbCollection` surface a write-error state and raise an error toast at app level. Minimum viable: wrap the undo path specifically.

**Suggested command:** `/impeccable harden src/lib/useIdbCollection.ts`

### [P2] `⋯` is a weak affordance even in light mode

Even at 17:1 it is a 16px text glyph with no background, border, or icon, in a card corner. The code comment admits this (DanhSachBang.tsx:466). A borderless button is legitimate mobile convention — so this is **not** the P1 Assessment A graded it — but when it is the *only* entry point, with no second route (no long-press, no swipe, no context menu), all discovery risk concentrates on one glyph.

**Fix:** add a second entry route (long-press on the card opens the same menu) rather than making the button heavier — keeps the paper aesthetic while removing the single point of failure.

**Suggested command:** `/impeccable onboard src/board/DanhSachBang.tsx`

### [P3] No mental model for "permanently deleted"

The "Đã xoá gần đây" panel admits it is not a full trash screen (DanhSachBang.tsx:751). Users cannot tell how long a soft-deleted board persists, or whether it is ever swept. For hand-drawn data that cannot be recreated, this gap is worth logging.

## Persona Red Flags

**On-call doctor, one hand, dark room, app in dark mode** — PRODUCT.md's central persona: opens the Mindmap tab and **cannot see** the `⋯` button (1.03:1). Cannot rename, tag, or delete any board. Boards without a specialty also lose their identifying badge (2.69:1) — the grid reads as near-identical white sheets separated only by a 13px name line below.

**First-time user:** the empty state explains the surface's value well (DanhSachBang.tsx:1187) — a genuine win. But the moment the first card exists, nothing indicates the card has a menu; all board management depends on happening to tap the top-right corner.

**Sam (accessibility-dependent):** the default specialty badge at 2.69:1 is below WCAG 1.4.11 (3:1 for meaningful graphics). Conversely the keyboard work is solid: Escape closes menu/cancels rename, `mind-focus-ring` present, `aria-haspopup`/`aria-expanded` correct.

## Minor Observations

- **B's touch-target measurements are an environment artifact, not a defect.** B reported the `⋯` at 42.24px and menu items at 38.4px — exactly 44 × 0.96 and 40 × 0.96. Cause: `.card-settle` uses `animation ... backwards` (index.css:798), holding the `from` keyframe (`scale(0.96)`) while the animation is frozen because the tab never composited (`visibilityState: "hidden"` throughout). `getComputedStyle` reports the correct 44×44. **No fix needed.**
- The 40px menu row is also **not** a defect: the comment at DanhSachBang.tsx:508 documents that WCAG 2.5.8 AA requires 24px and 44px is the AAA/HIG recommendation — reducing 44→40 was a considered response to real feedback.
- "Xuất PNG" only appears when the board already has a preview image — avoids a dead-end action.
- Board names clamp to 2 lines so grid rows do not stretch unevenly.

## Questions to Consider

- If the paper was granted "its own material, exempt from theming", why was the **ink** on it never granted the same exemption? How many other places on the Mindmap surface draw theme-swapping ink onto theme-invariant material?
- In dark mode the grid is a field of near-identical white sheets — what actually distinguishes one board from another in a half-second glance: the badge, the pin colour, or only the 13px name?
- If `⋯` disappeared entirely, would any capability be lost? Or is long-press on the card the gesture that actually matches the "pick up the sheet" metaphor?
