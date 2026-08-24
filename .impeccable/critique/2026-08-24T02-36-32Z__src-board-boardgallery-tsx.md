---
target: MindMapScreen (src/board/BoardGallery.tsx)
total_score: 26
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 1
timestamp: 2026-08-24T02-36-32Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: general-purpose Sonnet 5 · B: general-purpose Sonnet 5)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Strong load/warning states, but delete-undo toast has no `aria-live` |
| 2 | Match System / Real World | 4 | Physical card metaphor, real Vietnamese clinical terminology |
| 3 | User Control and Freedom | 3 | Layered undo (2-tap confirm + toast + persistent panel); no bulk actions or full trash screen |
| 4 | Consistency and Standards | 3 | 44px targets on "+"/"⋯"/back, but the options-menu rows and the "⋯" trigger itself both undercut that same standard |
| 5 | Error Prevention | 3 | 2-step delete confirm works well; 0px gap between "Đổi tên" and destructive "Xoá" |
| 6 | Recognition Rather Than Recall | 1 | Fails at real scale — 11 of 15 live boards read identically |
| 7 | Flexibility and Efficiency | 2 | Efficient create→rename flow; no in-gallery search/filter as the list grows |
| 8 | Aesthetic and Minimalist Design | 4 | Flat cards, restrained texture, matches DESIGN.md discipline |
| 9 | Error Recovery | 3 | Clear chunk-load-failure screen with retry; generic reload message for open failures |
| 10 | Help and Documentation | n/a | Not expected for this screen type, consistent with rest of app |
| **Total** | | **26/36** | **Good (72%)** |

#### Design Specificity Verdict

**LLM assessment**: Authored at the interaction layer, generic at the identity layer. The gallery commits to a real physical-object metaphor — a stable per-id hash tilt (not random, so it doesn't jitter on re-render), a pointer-tracked 3D hover gated to fine-pointer devices, a bouncy "plop" landing distinct from a gentler "settle," a rotate+slide exit on delete. That's genuine craft. But the one color reserved specifically to make Mindmap feel distinct from the rest of the app — "Mindmap Magenta" (`--c-accent-2`, explicitly commented in `src/index.css` as Mindmap-only) — is never referenced anywhere under `src/board/`. Strip the tilt physics away and the palette alone wouldn't tell you which feature you're in.

**Deterministic scan**: `detect.mjs --json src/board` returned exit 0, zero findings — the static regex pass has nothing to say here because the real issues (stale-ref timestamp logic, computed touch-target sizes, recency semantics) only show up at runtime, not in source patterns. The live-injected browser detector (`detect.js`) separately flagged `undersized-ui-text` (10px bottom-nav labels, below its 11px floor) and `clipped-overflow-container` on `main.has-nav`. Both are **flagged as likely false positives relative to this project's own intent, not new issues**: DESIGN.md explicitly documents 10px nav labels as a deliberate, separately contrast-checked choice ("small enough that label color must independently clear AA 4.5:1 at that size"), and both findings anchor to the shared app shell (`App.tsx`'s `has-nav` wrapper used by every screen), not anything specific to `BoardGallery.tsx`/`DanhSachBang.tsx` — out of this critique's scope.

**Browser evidence**: The Browser pane didn't composite frames in this unattended run (a known environment limitation, not a page defect), so both assessments substituted real DOM interaction (`javascript_tool`-driven clicks, `getBoundingClientRect`/`getComputedStyle`) for screenshots. That evidence is concrete and independently corroborated in two places — see Priority Issues below.

#### Overall Impression

The card interactions here are genuinely well-crafted — a bespoke physical-object feel most generic card grids don't bother with, plus a delete-safety-net (2-tap confirm → 5s toast → persistent recovery panel) that specifically accounts for a doctor getting interrupted mid-shift. But the screen's actual job — helping someone recognize and resume the right board fast — breaks down at real usage scale: live data on this dev instance had 11 of 15 boards reading the identical "Bảng chưa đặt tên · 1 giờ trước," and the recency signal that's supposed to help sort them out turns out to be silently unreliable. The biggest opportunity is closing that gap between the polish already spent on *how a card moves* and the near-total absence of *how to tell two cards apart*.

#### What's Working

1. **Physical-metaphor card interactions** — stable-hash tilt, pointer-tracked 3D hover, differentiated plop/settle/slide-out animations. Bespoke, not a template.
2. **Interruption-aware delete safety net** — the 2-tap confirm → toast → *persistent* "Đã xoá gần đây" panel directly honors the "soft-delete, recoverable" product promise even if the user is called away before the 5s toast expires; the code comments explicitly cite the on-call interruption scenario as the reason the persistent panel exists, not just the toast.
3. **Failure isolation at the architecture level** — a failed vendor-chunk load is caught by an error boundary scoped to just the Mindmap tab (doesn't crash the app), and `EdgelessBoard.tsx` shows an explicit warning when IndexedDB sync times out rather than silently losing data.

#### Priority Issues

**[P1] Indistinguishable boards break both findability and the undo safety net**
Why it matters: Confirmed on live data — 11 of 15 real boards read "Bảng chưa đặt tên · 1 giờ trước" with identical placeholder thumbnails, and the same ambiguity appears *inside the recovery panel*: two deleted-board entries both read "Bảng chưa đặt tên," with no way to tell which one you're about to restore. The recoverability promise depends on being able to identify what you're recovering — right now you can't, at exactly the moment (post-interruption, deciding whether to undo) it matters most.
Fix: Give every board an automatic, non-text visual anchor that doesn't depend on the user typing a name — a deterministic color chip (a legitimate use for the currently-unused `--c-accent-2`) or a creation-order badge — shown in both the grid and the recovery panel.
Suggested command: `/impeccable layout` (or a direct fix) targeting `DanhSachBang.tsx`'s card and recovery-panel rendering.

**[P2] "Last updated" silently means "last opened," and even a no-op action bumps it**
Why it matters: Two independent pieces of evidence converge on this. Assessment A found live that simply opening a board with zero edits flips its label from "1 giờ trước" to "Vừa xong" and jumps it to the top of the recency-sorted grid — `boardMeta.ts`'s own comment admits there's no real change-detection yet. Assessment B found something stronger: dispatching `Escape` on the rename input (cancelling a rename with the text unchanged) *also* bumped the timestamp to "Vừa xong." So the "last updated" signal a rushed doctor relies on to find what they were just building can be triggered by literally opening a board to look at it, or by starting and cancelling a rename — it's misleading in more places than a first look suggests.
Fix: Either rename the label to something honest ("Mở gần đây" instead of implying edit-recency), or gate the timestamp bump on content actually changing rather than on view/no-op interactions.
Suggested command: `/impeccable clarify` for the label semantics, or a direct fix to `boardMeta.ts`'s `capNhatAnhXemTruoc` call sites.

**[P2] `vuaTao` "just created" flag uses a stale mount-time snapshot**
Why it matters: `DanhSachBang.tsx` captures `bayGio = useRef(Date.now())` once at mount, then computes `vuaTao = bayGio - bang.taoLuc < 3000`. For any board created *after* the gallery is already open (exactly the flow the previous critique round introduced — tap "+" → inline rename in the list), `taoLuc > bayGio`, so the difference is negative and always under the threshold: `vuaTao` stays permanently true for the rest of that viewing session instead of resetting after 3 seconds. Live inspection showed the affected card frozen at the animation's start-keyframe transform for 2.5+ seconds, with its "⋯" touch target shrunk to ~37px during that window (see next issue).
Fix: Compute against `Date.now()` at render/effect time instead of a frozen mount-time ref.
Suggested command: direct fix — `/impeccable audit` first if you want a broader pass over `DanhSachBang.tsx`'s other `useRef`/timing logic while in there.

**[P3] Sub-44px touch targets in two places, corroborated independently by both assessments**
Why it matters: Assessment A measured the options-menu rows ("Đổi tên"/"Xoá") at ~62.6×30.6px with 0px gap between them — a destructive action directly adjacent to a safe one, well under this same file's own 44px standard. Assessment B, working independently, measured the "⋯" trigger button itself at 37×37px at a 390px mobile width. Two different elements, same file, same standard, both failing it — this reads as systemic rather than a one-off, on a screen explicitly designed for one-handed bedside use.
Fix: Pad menu rows to a 44px minimum height with a gap/divider before the destructive item; bump the "⋯" trigger to 44×44px at narrow widths.
Suggested command: `/impeccable audit` (touch-target pass) → direct fix.

**[P3] Two small accessibility gaps**
Why it matters: The delete-undo toast (`.toast-in-full`) has no `role="status"`/`aria-live`, unlike the parallel warning banner in `EdgelessBoard.tsx` which correctly has both — screen-reader users get no announcement that a delete happened or that undo is briefly available. Separately, Assessment B found the rename `<input>` has `aria-label: null` once its value is cleared — a screen-reader user who clears the field to retype loses the accessible name entirely.
Fix: Add `role="status" aria-live="polite"` to the toast (matching the existing `EdgelessBoard.tsx` pattern); give the rename input a static `aria-label` independent of its current value.
Suggested command: direct fix, small enough not to need a dedicated command.

#### Persona Red Flags

**Alex (daily power user)**: Relies on recency sort to resume work, but the P2 finding means Alex's actual active board can get buried under boards Alex merely glanced at. Accumulates many identically-named boards over weeks (live data already shows 11) with no in-gallery search/filter to recover from it.

**Casey (distracted, one-handed mobile)**: The 30.6px-tall, zero-gap "Đổi tên"/"Xoá" pair is exactly the shape of target that fails under thumb-only taps without a clear visual buffer — a fat-finger slip lands on "Xoá" (recoverable via undo, but still a jolt mid-shift).

**Riley (stress-tester)**: Rapid create-and-rename-in-place hits the `vuaTao` stale-ref bug directly (frozen animation, shrunk target). With many boards, the indistinguishability problem means Riley must open boards one-by-one to find the right one — the worst case for exactly the "many boards" scenario this persona probes.

#### Minor Observations

- Rename `<input>` measures 25.5px tall vs. 44px for every other interactive element on the same card.
- "Mindmap Magenta" (`--c-accent-2`) — the palette reserved specifically for this feature — is unused anywhere in `src/board/`; see Design Specificity Verdict.
- Theme toggle resolves through a smooth ~300ms transition; a snapshot taken mid-transition can look like a broken light/dark mismatch but settles correctly — noted so it isn't misread as a bug later.
- The empty-canvas placeholder icon is identical for every board without a thumbnail, compounding the P1 identity problem specifically for freshly-created, not-yet-drawn boards.
- Assessment B observed one board-open landing back on the Home tab unexpectedly on a first attempt, succeeding on a second, independent attempt — likely explained by the same concurrent-session Yjs churn Assessment B flagged elsewhere in this dev environment (board count grew 4→11→12 with no action from either assessment), not a reproducible defect. Worth a second look only if it recurs outside a shared/concurrent dev session.

#### Questions to Consider

1. Live data shows doctors *do* leave boards named "Bảng chưa đặt tên" — 11 of them, right now. If naming is optional in practice, should the gallery give every board an automatic, non-text visual identity from the moment it's created, rather than treating identity as something the user opts into by typing a name?
2. Mindmap has a color reserved specifically so the feature feels distinct from the rest of the app — should that identity start at the gallery, the screen a doctor sees every single time before drawing anything, or is it acceptable that the front door is currently indistinguishable in palette from any other list screen?
3. Is "last updated" supposed to mean "last edited" or "last opened"? Right now it silently means the latter (and can even be triggered by a cancelled action) — is that the intended semantic for a tool where recency is meant to help someone resume clinical work under time pressure?
