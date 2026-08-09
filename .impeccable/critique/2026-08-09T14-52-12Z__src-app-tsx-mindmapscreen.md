---
target: MindmapScreen (src/App.tsx + src/components/MindmapBoard.tsx)
total_score: 35
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-09T14-52-12Z
slug: src-app-tsx-mindmapscreen
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hold-to-edit (450ms long-press) gives zero visual/haptic feedback while the press is registering (`App.tsx:11410-11451`) — a user releasing at 400ms can't tell if it "almost worked." |
| 2 | Match System / Real World | 4 | Flowchart shape semantics (diamond=decision, pill=start/end), typed "algorithm" edges, Vietnamese clinical terms throughout. Solid. |
| 3 | User Control and Freedom | 4 | Multi-level undo/redo (2-/3-finger tap + persistent draggable cluster), soft-delete-to-trash for boards. Strong safety net. |
| 4 | Consistency and Standards | 2 | Live DOM evidence: **Undo/Redo canvas buttons and the undo-cluster drag handle have no visible `:focus-visible` ring** (`outlineStyle:none`, near-invisible fallback color) while five sibling toolbar buttons do — a documented rule ("focus rings... explicitly wherever... the mindmap canvas") violated on exactly the two buttons a keyboard user most needs for error recovery. Compounded by the mindmap-only font not reaching the one measurable note element and the magenta delete-badge using the reserved accent outside its documented use. |
| 5 | Error Prevention | 4 | Two-tap confirm on irreversible actions, 8px move-cancels-hold threshold prevents accidental long-press during scroll. |
| 6 | Recognition Rather Than Recall | 3 | Coach mark covers 4 gestures but the 2-finger-undo/3-finger-redo gesture — confirmed real and working via live DOM inspection — appears in no coach mark, menu, or tooltip anywhere. |
| 7 | Flexibility and Efficiency | 4 | Keyboard shortcuts (desktop), drag-to-reparent, eyedropper, snap-to-grid/object, auto-tidy layout ("Sắp lại toàn bộ bảng"). |
| 8 | Aesthetic and Minimalist Design | 4 | Toolbar is 4 icons at rest; sub-rows appear only for the active tool. Best-executed principle on the surface. |
| 9 | Error Recovery | 4 | Every destructive confirm explicitly names undo as the fallback; broken article links degrade gracefully instead of erroring. |
| 10 | Help and Documentation | 3 | Re-openable coach mark and a desktop shortcuts panel exist, but the most powerful gesture (multi-finger undo/redo) is undocumented anywhere. |
| **Total** | | **35/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** This reads as authored for clinicians, not a generic whiteboard clone. The tells are choices nobody makes for a generic product: a dedicated night-shift dark paper tone with its own grid/dot palette explicitly reasoned as "a full white board at 2am in a darkened ward is glaring and wakes the patient" (`src/lib/mindmapStyle.ts:27-33`); flowchart shape semantics borrowed straight from clinical algorithms (diamond = decision node, pill = start/end, `MindmapBoard.tsx:400-403`); a typed "algorithm" edge that renders as a solid, color-locked line so a treatment protocol reads as one continuous flow across differently-colored cards; and direct card-to-Library-article linking with graceful handling when the linked article is later deleted. This is GoodNotes' interaction model rebuilt around differential-diagnosis trees, not decoration on top of a generic canvas.

**Deterministic scan:** The static CLI scan (`detect.mjs` over `App.tsx`, `MindmapBoard.tsx`, `mindmapClipboard.ts`) returned exit code 2 with 9 findings, but on inspection 7 of 9 are false positives or pre-mitigated: six are a single native OS color-wheel `conic-gradient` (`#ff0000…#ff00ff`) at `MindmapBoard.tsx:8150` mistaken for six separate brand-color violations; one is a `stroke-width` SVG transition mistaken for a layout-`width` anti-pattern; one is a 16px border-radius the code's own comment says was deliberately chosen to match `rounded-2xl` used elsewhere on the same element. Only one finding (`App.tsx:969`) is a genuine hardcoded `#000`, and it isn't even inside the Mindmap surface — it belongs to an unrelated earlier screen.

The live in-browser detector (DOM-anchored, not regex-on-source) is more useful and caught something the design review's source-reading missed entirely: it flagged a `dark-glow` box-shadow using `#b8196f` — which is correct, that's the documented Mindmap Magenta accent, used as intended on a canvas marker pin. But it also surfaced the focus-ring gap on Undo/Redo (see heuristic 4) and let us directly measure that the center-topic node's text computes to the `Inter` fallback font stack — not Plus Jakarta Sans (the app's own base font, confirmed present elsewhere on the same canvas) and not Source Serif 4 / Space Grotesk (the documented mindmap-only fonts). The design review read the font-picker plumbing (`richText.ts`, `mindmapStyle.ts:227-238`) and concluded the mindmap-only typography was "genuinely well-wired" — that's true for user-authored note text, but the one node every board has by default, the auto-generated center topic, isn't picking it up. This is exactly the kind of gap static reading of source can't catch and live computed-style evidence can.

**Visual overlays:** Script injection into the live Mindmap tab succeeded (`detect.js` loaded, console reported "16 anti-patterns found"), so the mechanical detector did run against the real rendered page. However, the browser pane in this session could not composite frames for screenshot capture on any attempt (desktop or mobile, gallery or canvas) — a session/tooling limitation, not an app defect — so no visual overlay screenshot exists to show you. Findings were instead confirmed via DOM/computed-style introspection, cross-checked against `.mind-surface` membership so scope (in-canvas vs. app-shell-wide) is accurate: 5 of the 16 are bottom-nav-bar text (`text-[10px]`, present on every screen, not mindmap-specific), 2 are generic app-shell overflow wrappers, and the rest — the magenta glow, the zoom-cluster bounce easing, the minimap clipping, the undo-cluster drag-handle bounce — are genuinely inside the Mindmap canvas.

## Overall Impression

This is a well-considered, domain-specific canvas — the toolbar discipline (4 icons at rest, contextual sub-rows) and the night-paper tone are the strongest pieces of craft on the surface, and the undo/redo safety net is genuinely deep. The gap between what the design review found by reading source and what the live browser evidence found by measuring the rendered page is itself the most interesting result here: two DESIGN.md-documented rules (mindmap-only fonts, canvas focus rings) are implemented in the abstract but don't reach two concrete places a real user will hit — the default center-topic label, and the two buttons (undo/redo) a keyboard user relies on most. The single biggest opportunity is closing that implementation-to-rendering gap, plus fixing the one real data-loss risk: nothing flushes an in-flight stroke when the tab is backgrounded, which is exactly the interruption pattern ("a nurse called") this app is built to survive.

## What's Working

- **Night paper tone** (`mindmapStyle.ts:27-48`): a deliberately reasoned dark canvas variant with its own grid/dot palette, explicitly to avoid glare and not wake a sleeping patient at 2am — the single most on-brief detail on the surface.
- **Contextual toolbar discipline** (`MindmapBoard.tsx:5284-5432`): 4 icons at rest, sub-rows appear only for the active tool (eraser sizes, lasso mode), pen details live in a separate draggable bar. Solves the exact discoverable-vs.-cluttered tension a freeform canvas creates.
- **The reserved magenta accent actually stays reserved**: live computed-style scan found `#b8196f`/`rgb(184,25,111)` used in exactly 4 places, all inside `.mind-surface`, zero leaks outside the canvas — the "One Other Place Rule" holds up under measurement, not just under a source read.

## Priority Issues

**[P1] No flush-on-background for in-flight strokes**
- **Why it matters**: `useMindmap.ts` debounces writes ~400ms and only flushes early on unmount (switching boards or leaving the screen) — there's no `visibilitychange`/`pagehide` handler. Mobile browsers routinely suspend or kill backgrounded tabs, and the interruptions this app is explicitly built for (a call, a page, a notification) are exactly what triggers that. A stroke drawn in the last 400ms before backgrounding can be silently lost with zero warning — on a tool whose whole premise is capturing clinical notes reliably.
- **Fix**: flush the pending save immediately on `visibilitychange`/`pagehide`, not only on unmount.
- **Suggested command**: `/impeccable harden`

**[P2] Focus-visible ring missing on exactly the two buttons a keyboard/screen-reader user needs most**
- **Why it matters**: Measured via `.focus()` + computed `outline*`: five canvas toolbar buttons (pan, pen, eraser, lasso, laser pointer) get a proper `outline: 2px solid #2d3a94` on focus. Undo and Redo — the app's own documented safety net for every destructive action — get `outlineStyle: none` with a barely-visible fallback color, and the undo-cluster drag handle gets only a sub-1px browser-default outline. DESIGN.md names "the mindmap canvas" explicitly as a place this rule must hold. For a keyboard-only user (or anyone tabbing through after a mis-tap), the one control they most need to find has no visible focus state.
- **Fix**: apply the same custom `:focus-visible` treatment already used on the other five toolbar buttons to Undo, Redo, and the drag handle.
- **Suggested command**: `/impeccable audit`

**[P2] Several mobile toolbar targets sit below the app's own 44×44 floor**
- **Why it matters**: Measured at 375×812: the four header-bar icons (back, export, settings, search) are 40×40, the zoom-cluster toggle is 40×32, and the undo-cluster drag handle is 44×24. The five core drawing-mode buttons and Undo/Redo hit exactly 44×44 — so the app clearly knows and applies the 44×44 floor elsewhere on the same toolbar, just not consistently. This is a one-handed, sometimes-gloved, sometimes-2am tool — the exact profile that makes a 4px shortfall matter.
- **Fix**: bring the header icon row and zoom toggle up to 44×44 to match the drawing-tool row's own standard.
- **Suggested command**: `/impeccable adapt`

**[P2] The most useful touch gesture is completely undiscoverable**
- **Why it matters**: 2-finger-tap-undo / 3-finger-tap-redo (`MindmapBoard.tsx:3754-3767`) is real and confirmed working, and it's exactly the one-handed shortcut a distracted clinician needs — but it's in no coach mark, menu, or tooltip. A user pinch-zooming with a slightly mistimed second finger will trigger an unexplained undo with no on-screen acknowledgment of what just happened or why.
- **Fix**: add it as a line in the existing gesture coach mark, or surface a one-time inline hint the first time a 2-finger tap is detected.
- **Suggested command**: `/impeccable onboard`

**[P3] Hold-to-edit gives no feedback during the 450ms hold**
- **Why it matters**: `useHoldToEdit` (`App.tsx:11410-11451`) only signals once the full 450ms threshold completes — there's no progress ring or interim haptic. On a cold, gloved, or unsteady hand, releasing at 400ms produces nothing, with no way to tell if the touch "almost worked" or missed the target.
- **Fix**: a subtle scale/ring animation that fills over the 450ms window.
- **Suggested command**: `/impeccable polish`

## Persona Red Flags

**Sam (Accessibility-dependent, keyboard/screen-reader):** Tabs through the open canvas toolbar and gets a clear focus ring on pan/pen/eraser/lasso/pointer — then reaches Undo or Redo, the two controls this app's entire error-recovery model depends on, and the focus indicator effectively disappears (`outlineStyle: none`, near-invisible fallback color). Sam can still activate them by guessing tab position, but has no visual confirmation of where focus actually is at the exact moment they'd want to undo a mistake.

**Riley (Stress tester):** The culling logic for large boards is genuinely solid (off-screen-but-selected nodes are still force-rendered so the floating action bar never dangles). Riley's actual find is the save-debounce gap: kill the tab mid-stroke (an OS-level background-kill, not a graceful nav-away) and the last ~400ms of drawing can vanish with the app reporting nothing wrong — this is the P1 above, and it's the first thing a methodical edge-case tester would find.

**Casey (Distracted, one-handed mobile):** The FAB and drawing-mode row sit correctly in the thumb zone at a full 44×44. But the controls Casey reaches for when *not* actively drawing — back, export, settings, search, zoom — are all under the 44×44 floor at exactly the moment (interrupted, one hand, maybe gloved) those extra pixels matter most. Casey is also the persona most likely to trigger the invisible 2-finger-undo by accident while adjusting a one-handed pinch-zoom grip, with no toast explaining what just happened to their work.

## Minor Observations

- The Mindmap screen title uses Space Grotesk (`App.tsx:10960-10965`) — chrome, not note content, which the DESIGN.md rule says the mindmap-only fonts should never touch. Self-aware in the code's own comment, low stakes, but worth reconciling the rule and the implementation rather than letting them quietly diverge further.
- The custom-color "delete" swatch badge borrows the reserved magenta accent (`MindmapBoard.tsx:8009-8016`) for a delete affordance, not a region-highlight/lasso use — a small semantic drift from the documented "One Other Place" rule, still confined to the canvas.
- `mindmapClipboard.ts` fails silently on `sessionStorage` quota errors; a toast on failure would cost little.
- The CLI detector's `flat-type-hierarchy` finding ("10/11/13/14/16/17.5px, ratio 1.8:1") is a page-wide scan, not mindmap-specific — worth a look at some point but out of this surface's scope.
- Good anti-drift pattern worth reusing: the keyboard-shortcut list is single-sourced with the actual handler, so no shortcut is ever advertised without working (`MindmapBoard.tsx:419-420`). The undocumented multi-finger gesture is the one place this discipline wasn't applied to touch.

## Questions to Consider

- If the 2-finger-undo/3-finger-redo gesture is solid enough to ship, what would it cost to surface it once, the first time it's actually used, rather than never?
- The night-paper tone shows real thought about *when* this tool gets used — has the save path been tested against the actual failure mode of that moment (phone backgrounded mid-stroke because a nurse called), rather than just the graceful in-app board-switch case that's already well-handled?
- Given cards can already link out to Library articles, should algorithm/protocol edges eventually carry the same link capability — turning a drawn treatment algorithm into something a resident can tap through step by step?
