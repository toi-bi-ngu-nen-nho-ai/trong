---
target: MindmapScreen
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-08T11-46-08Z
slug: src-app-tsx-mindmapscreen
---
# Critique: Mindmap Surface (`MindmapScreen` / `MindmapGallery` / `MindmapBoard`)

Method: dual-agent (A: aa9359d3a72127b57 · B: ad972a4411adaff52)

Scope: [App.tsx:10144-11042](src/App.tsx:10144) (`MindmapGallery`, `BoardTransitionOverlay`, `MindmapScreen`) + [MindmapBoard.tsx](src/components/MindmapBoard.tsx) (canvas editor, ~7,982 lines).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | "đã lưu" flash on save and a busy pill during image processing are solid; no indicator *during* the save itself, only after. |
| 2 | Match Between System & Real World | 4 | Real clinical vocabulary throughout (connector chips like "gây ra", "chống chỉ định"; "Phác đồ/thuật toán" edge type). |
| 3 | User Control and Freedom | 4 | Undo/redo, Esc-to-deselect, soft-delete-with-restore for boards, two-step purge confirm. |
| 4 | Consistency and Standards | 3 | `.mind-btn` focus-ring offset (2px) contradicts `.mind-input` (1px) against the system's stated 1px spec. |
| 5 | Error Prevention | 4 | Every destructive action (clear board, delete edge, purge) confirms and tells the user undo is available. |
| 6 | Recognition Rather Than Recall | 3 | Live style-preview swatches are good; the 450ms hold-to-edit gesture on board cards has zero on-screen affordance anywhere. |
| 7 | Flexibility and Efficiency of Use | 3 | Self-documenting keyboard shortcuts (1-5 tools, Ctrl+Z/F/A, Tab); no arrow-key node repositioning for precise layout. |
| 8 | Aesthetic and Minimalist Design | 3 | Toolbar is well-chunked; the note-edit sheet surfaces ~26 controls (7 format + 10 colors + 4 styles + 3 sizes) nearly at once. |
| 9 | Error Recovery | 3 | No destructive path lacks undo; `openId` resolving to a deleted board falls back silently rather than surfacing a message. |
| 10 | Help and Documentation | 3 | Canvas coach mark covers gesture basics well but never mentions the gallery-level hold-to-edit gesture. |
| **Total** | | **33/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: This is authored for the persona, not skinned onto a generic whiteboard. The clinical framing shows up in load-bearing details: a "Phác đồ/thuật toán" edge type for protocol chains, clinical-vocabulary connector-label chips ("gây ra", "chống chỉ định", "chẩn đoán phân biệt"...), specialty-colored boards tied to the app's own taxonomy, JetBrains Mono explicitly reserved for dose numerals with a comment about reading under poor light, and a drag-to-either-edge undo/redo cluster built specifically for one-handed bedside use. Nothing here reads as category-interchangeable.

**Deterministic scan**: `detect.mjs --json` on `MindmapBoard.tsx` returned exit 2, 15 findings; `App.tsx` returned 2 findings, both **outside** the Mindmap line range (10144-11042) — the scoped surface itself is clean by static rule-check. Of the 15 in-file findings: 12 are `design-system-color` advisories on two full-spectrum `conic-gradient` swatches used by the text-color and color-wheel pickers (7001, 7584) — a color picker legitimately needs the full spectrum, so these read as intentional exceptions, not drift. One `layout-transition` warning (5396) is a false-positive on a substring match (`stroke-width` contains "width", but it's an SVG paint property, not a layout property). Two remain unconfirmed either way: an 18px border-radius (system default is 14px) and an `rgba(0,0,0,.1)` shadow at line 6958 — worth a quick look but not urgent.

**Visual overlays**: Live injection of `detect.js` succeeded (mutation preflight passed) and reported 16 runtime anti-patterns via console, but the session's browser pane couldn't compositor/screenshot this run, so **no persisted visible overlay exists for you to check** — treat the findings below as console evidence only, and the live-server used for injection has already been stopped. Two of the reported patterns (`bounce-easing`: `cubic-bezier(0.34,1.4,0.64,1)`, and `dark-glow` on `#6ea8fe`) are not defects — they're the documented "spring-style press feedback" and "Ethereal Glass" floating-layer glow the design system calls for by name, so the detector and the design review corroborate each other here: the decoration/diagnosis motion split is implemented as specified. The rest — 5× `undersized-ui-text` on bottom-nav labels, `clipped-overflow-container` (×6, mostly app-shell chrome, one specifically on the zoom-cluster jump control inside `MindmapBoard`), and `gpt-thin-border-wide-shadow` (1px border + 26px shadow) — are real, but the nav-label sizing and most of the clipping hits are global app-shell chrome shared by every screen, not Mindmap-specific; only the zoom-cluster clip and the border/shadow finding are scoped to this surface.

## Overall Impression

A dense, purpose-built canvas tool that gets its hard rule right — the Mindmap-exclusive accent color and the two Mindmap-only fonts are genuinely confined to this surface, not just documented as if they were — and gets its soft rule (progressive disclosure / ≤4 choices) wrong in exactly one place: the note-edit sheet, which front-loads nearly everything a clinician could want to do to a note before they've typed anything. The single biggest opportunity is discoverability: the hold-to-edit gesture that unlocks board rename/duplicate/delete/export exists nowhere in the visible UI, only in a code comment.

## What's Working

1. **The One Other Place Rule and the two Mindmap-only fonts are actually honored.** `--c-accent-2` (Mindmap Magenta) appears only inside `MindmapBoard.tsx` (selection ring/lasso/badges, e.g. lines 5451-5452, 5728-5730); Source Serif 4 / Space Grotesk are applied only via `STYLE_FONT_STACKS` to note text. Confirmed live: `--c-accent-2` resolves to `#f175a6` at runtime, not a hardcoded literal.
2. **Reduced-motion is split correctly and on purpose.** `index.css:605-634` explicitly excludes `.mind-btn` tap-confirmation from the `prefers-reduced-motion` kill-switch (with a rationale comment), while `BoardTransitionOverlay`'s board-open/close animation does check `prefersReducedMotion()` before running (`App.tsx:10918, 10936`) — exactly the split the design system specifies.
3. **Destructive-action friction is scaled to actual stakes.** Board deletion is soft (trash + explicit "dữ liệu vẫn còn nguyên" reassurance, App.tsx:10466-10469), permanent purge requires a real two-tap confirm (App.tsx:10487-10505), and the save-confirmation ("đã lưu") flash was deliberately upsized because hand-drawn work is "thứ dễ lo mất nhất" per the code's own comment.

## Priority Issues

**[P1] Hold-to-edit board-card gesture is undiscoverable**
- **Why it matters**: `useHoldToEdit` (App.tsx:10673-10714) requires a silent 450ms press-and-hold on a board card to reach rename/duplicate/delete/export. Nothing in `MindmapGallery`'s rendered UI hints this exists — a first-time user has no path to editing a board except by accident.
- **Fix**: Add a one-time dismissible hint row, or a subtle always-visible affordance (e.g. a faint corner glyph) the first time a board card renders.
- **Suggested command**: `/impeccable onboard`

**[P1] Note-edit sheet violates one-thing-at-a-time / ≤4-choices**
- **Why it matters**: MindmapBoard.tsx:6928-7300 stacks a textarea, a 7-item format bar, a 10-swatch color row, a branch-apply toggle, 4 style previews, and size options in one non-modal sheet — roughly 26 controls visible before a clinician has typed a word, at 2am, one-handed.
- **Fix**: Default to textarea + the 4 core formatting marks; move color/style/size behind a single "More styling" disclosure, matching the progressive-disclosure pattern already used for the eraser/lasso sub-rows elsewhere in the same file.
- **Suggested command**: `/impeccable layout`

**[P2] Rich-text format row exceeds 4 visible options at once**
- **Why it matters**: B/I/U/H/A+/Màu chữ/Font is 7 controls in one unbroken row (MindmapBoard.tsx:6952-7017); a divider helps but it still reads as one decision surface.
- **Fix**: Collapse size+color+font into a single "Aa" overflow button opening the existing popovers, leaving B/I/U/H as the persistent row.
- **Suggested command**: `/impeccable layout`

**[P2] Focus-ring offset contradicts the written spec**
- **Why it matters**: Design system specifies 2px solid `var(--ring)` with 1px offset. `.mind-btn:focus-visible` uses `outline-offset: 2px` while `.mind-input:focus-visible` correctly uses 1px (index.css:640-651) — half the interactive elements on this surface don't match the documented rule.
- **Fix**: Align `.mind-btn` to 1px offset, or update DESIGN.md if 2px was an intentional exception for buttons vs. inputs.
- **Suggested command**: `/impeccable polish`

**[P3] No keyboard/arrow-key node repositioning**
- **Why it matters**: Every other action has a keyboard path (`SHORTCUT_HINTS`, MindmapBoard.tsx:389-400), and the system deliberately gives `.mind-btn`/`.mind-input` real focus rings "because bảng này có phím tắt thật" — but node position is pointer-only, an inconsistent stop-short for keyboard-committed users.
- **Fix**: Add `ArrowUp/Down/Left/Right` nudge (with Shift for larger steps) on a selected node.
- **Suggested command**: `/impeccable adapt`

## Persona Red Flags

**Jordan (First-Timer)**: The hold-to-edit board-card gesture (App.tsx:10673-10714) is invisible — no icon, no hint, no affordance. The one coach mark that exists (`showCoach`, MindmapBoard.tsx:7929-7970) fires only *inside* an opened board and teaches 4 canvas gestures; it never mentions the gallery-level long-press, so a first-timer who wants to rename their very first board before opening it has zero guidance.

**Riley (Stress-Tester)**: `openId` is restored from `sessionStorage` (App.tsx:10861) with no explicit guard found for "this board was deleted/purged elsewhere" beyond `boards.find(...)` silently returning `undefined` — degrades to a "Bảng" fallback rather than a clear message, and this path wasn't exercised end-to-end against an actually-missing board record. Separately, no viewport-culling was found for node/edge/stroke rendering (`nodes.map`, MindmapBoard.tsx:4657-4658 and similar render unconditionally) — a board with hundreds of freehand strokes is untested territory for older devices.

**Sam (Accessibility-Dependent)**: Canvas tools are genuinely well-labeled (`aria-label`+`aria-pressed` on every `IconBtn`, verified live). But the open-board canvas itself has no `role`/framing for a screen-reader user landing on it, and there's no explicit "list view" fallback for reading a board's notes without the spatial canvas — the cross-board search does work as a partial escape hatch, but it's not a designed alternative.

## Minor Observations

- The `@theme` remap of Tailwind's `slate-100…900` to `--c-*` tokens (index.css:347-357) is a legitimate, verified-working indirection (confirmed live: computed color on a dark-mode title matched `--c-text`, not real Tailwind slate-900) — but it's a confusing pattern for future maintainers and would silently defeat any hex/color-linting tooling that doesn't know about the remap.
- Global `input, select, textarea { font-size: 16px !important; }` (index.css:429-432) enforces the 16px floor for every Mindmap text input regardless of local `text-sm` classes — good belt-and-suspenders, but worth knowing why the per-component smaller classes never actually take effect.
- Detector flagged 5× undersized bottom-nav labels (10px, below the tool's 11px floor) and most `clipped-overflow-container` hits — these are app-shell chrome shared by every screen, not Mindmap-specific, so they're better addressed by a full-app `/impeccable audit` than scoped here. The zoom-cluster jump control's own overflow-clip (MindmapBoard.tsx, `title="Chạm hoặc kéo để nhảy tới chỗ đó"`) and the `gpt-thin-border-wide-shadow` (1px border + 26px blur) finding are in-scope and worth a follow-up look.
- Empty-board state copy is warm and actionable ("Bấm nút 'Thêm'... hoặc giữ ngón trên một chỗ trống để tạo ghi chú đầu tiên," MindmapBoard.tsx:6797-6800) rather than a bare "no content" message.

## Questions to Consider

1. If the hold-to-edit gesture is the primary way to reach a board's settings, why does the *canvas* get a full first-run coach mark while the *gallery*, where that gesture actually lives, gets none?
2. The note-edit sheet surfaces roughly 26 simultaneous controls before a word is typed — is that density earning its keep at the bedside, or would usage show 90% of notes are just "type text, done"?
3. The canvas's optional "mono" text style (`Chữ đều nét`) uses the same visual signal (monospace) the app reserves elsewhere for dose-safety numerals — could a clinician mistake a stylistically-mono'd number in a mindmap note for that safety-critical formatting, when here it means nothing clinically?
