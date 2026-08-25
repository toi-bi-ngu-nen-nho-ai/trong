---
target: MindMapScreen (src/board/*)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-25T09-26-18Z
slug: src-components-mindmapboard-tsx
---
Method: dual-agent (A: a242e3738774b4739 · B: a21123eefab4704ef)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/save/toast states exist, but cold board-open (~5-7s measured) shows only static gray "Đang mở bảng…" text with no progress signal |
| 2 | Match System / Real World | 3 | Physical-desk card metaphor + Vietnamese medical conventions land well; menu/export/back chrome breaks the metaphor |
| 3 | User Control and Freedom | 3 | Strong triple-redundant delete/undo (toast + "Đã xoá gần đây" panel); escape-to-cancel rename works |
| 4 | Consistency and Standards | 3 | 44×44 targets and `--c-*` tokens used consistently everywhere read; two undocumented `rgba(0,0,0,.2)` shadows on export buttons (detector-confirmed, same lines the design review flagged independently) |
| 5 | Error Prevention | 3 | Second-tap delete confirm within 5s; extensive filter-drop edge-case hardening visible in comments |
| 6 | Recognition Rather Than Recall | 3 | Specialty chips show `aria-pressed` state; toolbar shortcuts (P/E/S/N/V/F/C) only become visible after opening a submenu, not before |
| 7 | Flexibility and Efficiency of Use | 2 | Vendored toolbar keyboard shortcuts exist but are never surfaced as discoverable in the wrapper UI |
| 8 | Aesthetic and Minimalist Design | 2 | 12 co-equal specialty chips in one unbroken row; overlapping popovers anchored at the same point from feature accretion |
| 9 | Error Recovery | 3 | Export failure and sync-timeout show real warning banners reusing clinical `--c-warn-*` tokens, with retry |
| 10 | Help and Documentation | 2 | No onboarding/tooltip layer for a 9-tool drawing canvas; first render gives zero labels |
| **Total** | | **27/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Partially authored, partially generic. The board-gallery card itself (`DanhSachBang.tsx`'s `TheBang` + the `.the-bang-vat` CSS block) is genuinely bespoke: a per-id stable resting tilt, a cursor-following 3D perspective tilt on hover, an un-rotate+scale press response, and a spring-overshoot "plop" for freshly-created cards vs. a calmer settle for existing ones — a "photos on a desk" metaphor executed with real physics-flavored easing, correctly gated to `(hover: hover) and (pointer: fine)` and correctly exempted from `prefers-reduced-motion` where it's a static pose. But everything wrapped *around* that card — the "⋯" menu, the rename input, the tag/specialty popover, the export buttons, the back button — is stock white-box-with-drop-shadow chrome (`var(--c-surface)`, generic `rgba(0,0,0,.15-.2)` shadow, 8px radius) that any generic CRUD admin panel could ship unchanged. The material metaphor covers the noun (the card) but stops at the verbs (create/rename/tag/export/back) — on the one screen whose entire charter is "material realism, pushed as far as it can go."

**Deterministic scan**: CLI scan of `src/board/` (`detect.mjs --json`) returned exit code 2 with 2 findings, both `design-system-color` ("Color outside DESIGN.md"), both on the same undocumented `rgba(0,0,0,0.2)` box-shadow pattern — once each on `EdgelessBoard.tsx:544` and `:554`, the PNG and PDF export buttons. This is the exact same pattern Assessment A flagged independently from source reading, so it's corroborated, not a false positive. The live in-page detector (injected via `detect.js`) additionally caught, on the opened-board state: `undersized-ui-text` on those same PNG/PDF buttons (10px, below an 11px floor) and on all five bottom-nav labels (10px — an app-wide issue visible on this screen too, not mindmap-specific); `flat-type-hierarchy` (sizes 10/11/12/13/16/18px, 1.8:1 ratio); and `ai-color-palette` ("purple/violet accent colors detected"). The last one is almost certainly a **false positive** here: DESIGN.md documents Electric Indigo as the deliberate, WCAG-verified brand color chosen specifically to stay out of the safety-color hue family — a generic "looks like AI slop" purple-gradient heuristic doesn't apply to a consciously chosen, documented brand hue. The `layout-transition` finding (transition on `max-height, margin-top`) is a known, explicitly-justified tradeoff per DESIGN.md's Disclosure section (grid-template-rows reproducibly breaks on this DOM shape), not a fresh defect.

**Visual overlays**: Not available this run. Both sub-agents hit an identical "Browser pane is not displayed, so the page is not compositing frames" error on every screenshot attempt, in every tab, at both viewport widths — an environment-level limitation of this session, not an app issue. Script injection and the in-page detector itself did run successfully (console output above is real), but no persistent human-visible overlay tab remains — both sub-agents closed their tabs during cleanup. Treat the findings above as console/DOM evidence, not as something currently visible in your browser.

## Overall Impression

The bones are genuinely good — the gallery card's physics-flavored tilt/press/plop and the triple-redundant delete-undo safety net are exactly the kind of "real physical instrument" craft the Mindmap charter asks for, and they're independently verified (not just claimed) by two different assessment methods. But the investment stops at the card face. Every UI chrome element that *isn't* the card — export/back buttons, menus, popovers, the loading state, the filter row — is generic app chrome dropped onto the one screen explicitly meant to be the product's 50%-of-design-investment differentiator. The biggest opportunity is closing that gap: carry the material metaphor into the verbs (opening, exporting, waiting, filtering), not just the noun (the card).

## What's Working

- **The gallery card interaction** (`src/index.css:565-650`, `.the-bang-vat`): cursor-tracked 3D tilt, per-id stable resting angle, press-scale, and a spring-overshoot entrance for new cards vs. calmer settle for existing ones — correctly gated to fine-pointer/hover devices and correctly exempt from `prefers-reduced-motion`. This is the strongest single piece of evidence that the "material realism" brief was actually executed, not just aspired to.
- **Delete/undo chain** (`DanhSachBang.tsx`): soft-delete → slide-out-and-rotate exit animation ("flicked off a table," not a fade) → 5s toast with inline undo → permanent "Đã xoá gần đây" recovery panel. Three redundant safety nets for one destructive action is exactly right for a clinician who might get pulled away mid-shift — and the code shows evidence of real edge-case hunting (filter/search/tag interactions were each separately patched to not "eat" the item mid-action).
- **Dark mode as a real second identity**: live-confirmed `--c-accent-2` resolves to `#b8196f` in light / `#f175a6` in dark, `--c-surface` to near-black `#14162c` in dark — matches DESIGN.md's "independently authored, not inverted" requirement.

## Priority Issues

**[P1] Generic chrome breaks the material illusion at every interactive edge**
- **Why it matters**: This surface is charter'd as the product's core differentiator, worth ≥50% of design investment, with an explicit "push every effect as far as it can go" mandate. Yet the export buttons, back button, and menu/popover chrome are plain white rounded rectangles with a generic drop shadow — confirmed independently by source reading (Assessment A), the CLI detector (2 hits, `EdgelessBoard.tsx:544`/`554`), and the live in-page detector (same buttons flagged again for undersized 10px text). Three independent methods converging on the same two buttons is a strong signal, not noise.
- **Fix**: Give the export/back/menu chrome a consistent material skin — ink-color-matched borders or a subtle paper/vellum treatment via a static SVG filter (per the 60fps constraint — no per-frame JS) instead of a generic `rgba(0,0,0,.2)` shadow. Bump the 10px button labels to at least 11px while you're in there.
- **Suggested command**: `/impeccable polish`

**[P1] Cold-open loading is a dead moment on the flagship screen**
- **Why it matters**: Live-measured ~5-7 seconds of static "Đang mở bảng…" gray text before the canvas appears, with no skeleton or progress signal — the single longest static wait in the product, on the one screen meant to feel like relaxing into a workspace. Risks reading as "did I break something" instead of "the canvas is settling into place."
- **Fix**: Replace the plain loading text with a material placeholder (paper texture fading in, ink-blot reveal) that reads as the canvas being drawn rather than frozen.
- **Suggested command**: `/impeccable delight`

**[P2] Specialty filter row violates the surface's own cognitive-load rules**
- **Why it matters**: 12 co-equal chips in one unbroken row (`DanhSachBang.tsx:672-717`, confirmed live including at 375px mobile width), with no sub-grouping and no "top N + more." Fails both the ≤4-chunking and ≤4-choices-at-a-decision-point checks — on a screen explicitly meant to feel calm, not to make a distracted clinician parse 12 options to find one board.
- **Fix**: Default-collapse to the 3-4 most recently used specialties plus an explicit "More" expander, or convert to a typeahead filter.
- **Suggested command**: `/impeccable distill`

**[P2] The "+" create tile carries no visual priority**
- **Why it matters**: In the board grid, the create affordance is styled with the same weight as an empty dashed-border state, and never uses `--c-accent-2` — the surface's own signature magenta — anywhere. The one primary action on the gallery reads as just another cold document instead of the one warm invitation.
- **Fix**: Apply the magenta accent to the create tile's border/plus-glyph so it's visually distinct as the primary action.
- **Suggested command**: `/impeccable colorize`

**[P2] Self-acknowledged accessibility gap in the tag/specialty popover**
- **Why it matters**: `<label>` elements in the popover aren't associated via `htmlFor` to their controls — flagged in the code's own comments (`DanhSachBang.tsx:342-346`) as a known, still-open gap. Screen-reader users (Sam persona) hit this directly; it's not hypothetical, it's already documented as unfixed.
- **Fix**: Wire `htmlFor`/`id` pairs (or wrap in `<label>`) for every input in that popover.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Jordan (First-Timer)**: Opens a board cold and sees 5-7s of unlabeled gray loading text — nothing distinguishes "loading" from "broken." The 9-tool toolbar (Chọn/Khung/Cong/Ghi chú/Bút/Tẩy/Hình/Mindmap/Template, live-confirmed) shows no tooltip or label on first render — text only appears once you're already inside a tool's own submenu, so identifying "Cong" (connector) vs. "Hình" (shape) means clicking blind.

**Casey (Distracted-Mobile)**: At 375px (live-confirmed via mobile resize), the 12-chip specialty row requires horizontal scroll-and-scan — a poor match for a one-handed glance. The rename-input auto-focuses on board creation and saves on blur (`taoBangMoi`, `DanhSachBang.tsx:516-542`); if Casey gets interrupted mid-type and taps away, whatever partial text exists becomes the permanent board title with no confirmation step.

**Sam (Accessibility-Dependent)**: The tag/specialty popover's `<label>` elements lack `htmlFor` association (self-acknowledged gap in code comments, not fixed). Independently, the live in-page detector measured the app's bottom-nav labels and this screen's own export buttons at 10px — below the accessible-text floor other parts of DESIGN.md hold the rest of the app to.

## Minor Observations

- The delete menu item turns red-text-only on the second confirm tap; no icon change or added visual weight signals "this next tap is destructive" before the label re-renders, which a fast double-tap could outrun.
- The empty-canvas placeholder glyph (`TheTrong`, `DanhSachBang.tsx:51-59`) is a generic minimal line-art icon — functionally fine, but visually generic next to the material treatment given to filled cards.
- Zoom-toolbar string translation is thorough and well-scoped beyond the primary tool row ("Vừa khung hình," "Thu nhỏ," "Phóng to," "Bật/tắt thanh thu phóng" all live-confirmed) — worth noting as a translation-quality strength, not just a gap elsewhere.
- The bottom-nav 10px label sizing is app-wide, not mindmap-specific — worth a dedicated `/impeccable audit` pass across the whole shell rather than folding it into a mindmap-only fix.
- Coverage gap in this run: the shape/template/frame side panel (lives in shadow DOM behind the vendored editor) and light mode (no theme toggle was discoverable in the DOM) were not reached by either assessment. This is an absence of evidence, not evidence of absence — worth a follow-up critique pass specifically on those states.

## Questions to Consider

- If the card face is the only place the "physical desk" metaphor lives, is this a material-realism *screen*, or a material-realism *card component* sitting inside an otherwise-generic shell — does the 50%-investment charter mean the chrome needs the same treatment, or is the card enough?
- The ~5-7s cold-open wait is a direct tax of the lazily-loaded vendored editor chunk — is the right fix a loading *experience* (material placeholder), or trimming the chunk itself so the wait shrinks, given Experience mode was never meant to include "stare at gray text"?
- With three redundant delete-recovery paths already in place, is there room to simplify rather than keep adding safety nets — or does the clinical-stakes framing justify the redundancy permanently?
