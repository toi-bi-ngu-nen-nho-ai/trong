---
target: src/board (Mindmap screen)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-27T09-32-18Z
slug: src-board-mindmap-screen
---
# Critique: Mindmap Screen (src/board/ - React wrapper around vendored AFFiNE/BlockSuite canvas)

Method: dual-agent (A: design-review sub-agent, B: detector + browser-evidence sub-agent, run in parallel, isolated)

Scope note: PRODUCT.md/DESIGN.md's Mindmap description (custom MindmapBoard.tsx/MindNode/MindEdge/ink.ts) is stale. The screen is a vendored AFFiNE/BlockSuite canvas (src/vendor/blocksuite/, project rule D11: never modified) skinned by a thin React wrapper (src/board/BoardGallery.tsx, EdgelessBoard.tsx, DanhSachBang.tsx, VeChuyenKhoaDangTai.tsx, index.tsx). Both assessments scoped to the wrapper only.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong FLIP transition + self-drawing loader; no in-canvas save/sync indicator while drawing. |
| 2 | Match System / Real World | 4 | Physical pin/paper metaphor, Vietnamese clinical vocabulary, per-specialty iconography. |
| 3 | User Control and Freedom | 3 | Outside-click/Escape menu-close verified live; undo toast self-dismisses at 5s with no persistent countdown. |
| 4 | Consistency and Standards | 2 | Canvas selection/lasso/toolbar highlight renders vendor blue (#1E96EB), not the reserved Mindmap Magenta - breaks the "One Other Place Rule" inside the one place it matters most. |
| 5 | Error Prevention | 3 | Two-tap delete confirm, graceful IndexedDB-timeout fallback instead of silent data loss. |
| 6 | Recognition Rather Than Recall | 3 | Color/icon-coded pins distinguish identically-named boards. |
| 7 | Flexibility and Efficiency | 3 | Search + specialty filter + tags work; export silently absent on brand-new boards. |
| 8 | Aesthetic and Minimalist Design | 3 | <=4-choice chip rule genuinely enforced in code. |
| 9 | Error Recovery | 4 | Clear, non-technical failure copy with retry. |
| 10 | Help and Documentation | 2 | No in-surface onboarding beyond one line of empty-state copy. |
| Total | | 30/40 | Good (75%) |

## Design Specificity Verdict

LLM assessment (A): Not a reskinned generic whiteboard - Vietnamese empty states, per-specialty color/icon identity, soft-delete+undo tuned for "called away mid-shift," note-paper/pin metaphor. Specificity stops at the wrapper's edge - the vendored canvas itself still speaks generic AFFiNE, exactly the zone the surface brief says deserves the heaviest investment.

Deterministic scan (B): detect.mjs --json against src/board/ (13 files) returned 0 findings (also 0 with --no-config). Live overlay surfaced 7 items but 6 are false positives against this project's own documented decisions (10px nav label = documented DESIGN.md Label token + belongs to app shell not src/board; bounce-easing and layout-transition already pre-approved intentional in .impeccable/config.json). Net new signal from tooling: zero for this surface's own code.

Visual overlays: screenshot compositing failed throughout B's session; evidence came from accessibility tree/console/network instead of a viewable overlay image this run.

## Overall Impression

The wrapper layer is well-crafted - physical metaphor, Vietnamese-specific copy, soft-delete safety net, a real FLIP transition. The gap: the brand's Mindmap-exclusive tokens (magenta accent, note-paper surface) were built for this screen but never piped into the canvas itself, where a clinician spends the most time. Given the owner's charter of >=50% total design investment here, that's the biggest opportunity - a plumbing fix that unlocks work already done, not a new feature.

## What's Working

- Soft-delete + dual-layer undo (toast + persistent "Da xoa gan day" panel) matches the "interrupted mid-shift" persona; the highest-stakes moment is the best-reassured moment.
- FLIP gallery-to-board transition captures the real clicked card's screen rect and animates from it - a real implementation of "continuity of the visual anchor," not just a claim.
- VeChuyenKhoaDangTai loading animation: single self-drawing specialty-icon stroke with defensive guards for prefers-reduced-motion and missing Web Animations API.

## Priority Issues

[P0] Canvas selection/lasso/toolbar highlight uses vendor blue, not the reserved Mindmap Magenta
Why it matters: --c-accent-2 exists specifically so this surface has one color no other screen touches. Live-verified: getComputedStyle(viewport).getPropertyValue('--drt-brand-color') returns #1E96EB in dark mode; no override exists anywhere in src/. This is the most-repeated visual element on the canvas.
Fix: bridge --drt-brand-color/--drt-blue to var(--c-accent-2) inside .drt-edgeless-viewport, same pattern already used for fonts (--drt-font-serif-family).
Suggested command: /impeccable colorize

[P1] The Note-paper token never reaches the actual note surface
Why it matters: --c-note styles only the gallery thumbnail card; the vendor theme's --drt-background-primary-color stays plain white with no bridge. A clinician who opens a board sees generic white paper, not "real paper, real weight."
Fix: map the vendor's note-background variable the same way as the color/font bridges.
Suggested command: /impeccable polish

[P2] Export is silently absent on newly-created boards
Why it matters: Xuat anh only renders once bang.anhXemTruoc exists, i.e. after a board has been opened and closed once. Batch-created boards show a 2-item menu with no explanation.
Fix: show a disabled export item with a one-line reason, or seed a placeholder thumbnail at creation.
Suggested command: /impeccable clarify

[P3] Safe-area handling is patched per bug report, not tested against the geometry class
Why it matters: comments in BoardGallery.tsx and index.css describe multiple prior iPhone-specific clipping fixes arrived at empirically - the next device geometry variant likely reproduces the same class of bug.
Fix: consolidate into one tested safe-area formula instead of accumulating device-specific patches.
Suggested command: /impeccable adapt

Flagged, not confirmed - needs a clean manual check: B's automation hit an anomaly where the board back button's live bounding rect (~5x10px) diverged sharply from its inline 44x44px style mid-transition, and repeated coordinate-clicks stopped registering (a direct JS .click() still worked). Could not rule out scripted clicks landing mid-CSS-transition rather than a real bug.

## Persona Red Flags

Alex (Power User): hits the P2 export gap directly when batch-creating boards before a shift; also most likely to notice the P0 blue-selection mismatch via constant daily exposure.

Riley (Stress Tester): the wrapper's own code comments document prior races around board open/close (stale thumbnail reads, id-collision, a "black tile" bug), fixed via timing-based patches (setTimeout(0), an 800ms window) rather than structural guarantees - exactly the rapid back-and-forth behavior B's automation stumbled into.

Casey (Mobile): most exposed to P3 - both the back button's safe-area calc and the bottom-sheet's nav-padding calc were each patched more than once specifically for iPhone notch/home-indicator geometry.

## Minor Observations

- Two default-created boards both show "Bang chua dat ten," distinguished only by pin hue/specialty icon - a colorblind user loses that differentiator down to icon shape alone.
- Detector overlay's 10px bottom-nav label finding and missing theme-toggle/disclaimer-close aria-labels are real but belong to the shared app shell, not src/board/.
- B's automated session couldn't get typed text to land in the search input - likely a focus/tooling artifact, untested by a human this round.
- Drawing/note-tool behavior and the light/dark theme toggle were not exercised by either assessment this run.

## Questions to Consider

1. Should "The One Other Place Rule" get an explicit carve-out clause for vendor-drawn pixels (D11), since the canvas's own selection color is currently violating it?
2. Would eagerly generating a thumbnail at board-creation time simultaneously fix the P2 export gap and give first-time users a stronger sense that a freshly-created board is already theirs?
3. Would ending the FLIP "board opens" transition with a slight spring overshoot instead of a flat easing curve push the "real sheet landing" feeling at the highest-frequency interaction on this surface?
