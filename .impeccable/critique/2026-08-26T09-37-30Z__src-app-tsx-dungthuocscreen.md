---
target: DungThuocScreen
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-26T09-37-30Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: ad261913b7b17b835 · B: a15291d1bc190b01f)

Re-run after commit `69588b7` (4/5 fixes from the 2026-08-26T05-30-16Z critique) plus one additional inline fix applied while synthesizing this report (see below).

## Design Health Score

| # | Heuristic | Score | Key Issue | Change |
|---|-----------|-------|-----------|--------|
| 1 | Visibility of System Status | 4 | Tab reorder now has both a live scroll-position bar and a one-time cause toast — live-verified the bar tracks scroll precisely | **3→4** |
| 2 | Match System / Real World | 4 | Unchanged, still solid | — |
| 3 | User Control and Freedom | 4 | `DisclaimerBar` now has a real per-session exit; `DisclaimerGate`'s intentional no-escape untouched | **3→4** |
| 4 | Consistency and Standards | 3 | "Ghim liều này" vs. infusion-verb mismatch still open (pre-existing, out of this round's scope) | — |
| 5 | Error Prevention | 4 | Unchanged — 700kg still hard-blocks mg/kg math | — |
| 6 | Recognition Rather Than Recall | 4 | Disease-name search directly targets this — live-verified 4 correct hits for "màng não" | **3→4** |
| 7 | Flexibility and Efficiency | 3 | Untouched this round | — |
| 8 | Aesthetic and Minimalist Design | 3 | Dose-card warning density unchanged — correctly left alone, see below | — |
| 9 | Error Recovery | 4 | Unchanged, solid | — |
| 10 | Help and Documentation | 3 | Unchanged | — |
| **Total** | | **36/40** | **Good** | **+3** |

## Design Specificity Verdict

**LLM assessment:** Still genuinely grounded, and the fixes deepen rather than dilute it. The disease-name search re-derives the correct `IndicationDose` tier and writes `abx.disease` so the dose shown after the jump is disease-specific, not the drug's generic default — live-verified: searching "màng não" → Ceftriaxone opens pre-selected on "Viêm màng não vi khuẩn" showing "2 g mỗi 12h", not the community-pneumonia default. The tab-reorder toast and the disclaimer-bar dismiss both reuse established idioms already in the codebase (`TAB_SEARCH_HINT_KEY`'s one-time-toast shape; the sessionStorage-vs-localStorage split already established by `DISCLAIMER_KEY`) rather than inventing new interaction vocabulary.

**Deterministic scan:** `detect.mjs` found 1 finding in the whole 11,600-line file (a mask-gradient at App.tsx:942, unrelated mindmap-gallery code) — **0 in-scope**.

**Browser overlay:** 3 in-scope hits, all judged false positives / pre-existing documented trade-offs, not regressions from this round:
- `layout-transition` ×2 on `PatientPanel`'s `.disc-body` — a documented, dated trade-off (`index.css:971-992` explicitly explains reverting from `grid-template-rows` after reproducing a real Chromium bug; `prefers-reduced-motion` already handled).
- `line-length` on an `InputWarning` string — the actual string is 84 characters, single-line, no wrap; a heuristic false positive on prose-length rules applied to a short alert.
- `cramped-padding` on the "Thêm kháng sinh tự nhập" button — vertical centering is via flexbox on a fixed 44px box, not padding; 0px padding here is correct, not cramped.

Where the two assessments agree: both independently traced the same real regression this round introduced — `DisclaimerBar`'s new dismiss button was a 24×24px tap target (`w-6 h-6 -m-1`), well under this app's own 44px convention used two lines away in the same commit. **This has been fixed while synthesizing this report** (now `w-11 h-11 -m-2`, mirroring an existing precedent already in the file at App.tsx:10318) and live-verified at exactly 44×44px via `getBoundingClientRect()`. The heuristic-4 score above already reflects the fixed state.

## Overall Impression

+3 points, and the movement lands exactly where the fixes targeted it: visibility of system status, recognition-rather-than-recall, and user control all moved up one point each, with nothing regressed once the tap-target slip (introduced by this round, caught by both assessments, fixed immediately) is accounted for. Both subagents independently re-tested the deliberately-declined dose-card fix against a *fresh* worst-case scenario (Gentamicin + RRT + implausible weight) and both concluded, independently of each other and of the original decision, that leaving it alone was correct — the warning-before-number ordering is doing real error-prevention work, not just adding friction.

## What's Working

1. **The tab-progress bar's math is exactly right, not approximately right.** Live-measured across three scroll positions (0%, 50%, 100%): track 350px, bar width ≈144.6px, translateX values of 0px / 102.7px / 205.4px — each matching the formula to sub-pixel precision. This is a correctly-implemented scrollbar proxy.
2. **The disease-search fix composes with, rather than fights, pre-existing auto-selection logic.** `autoDisease` (auto-picks when a drug has exactly one indication) and the search-written `diseaseChoice` resolve consistently in both the single-indication and multi-indication cases — live-verified with Vancomycin (4 indications) landing correctly on the meningitis-specific tier.
3. **Both re-run assessments independently reproduced the exact clinical scenario the original "don't collapse this" code comments warned about** (an RRT patient where the CrCl-tier number shown doesn't actually apply) and confirmed the warning-before-number ordering is load-bearing, not incidental — this is stronger evidence for the original call than the code comments alone.

## Priority Issues

**[P2 — fixed during this re-run] `DisclaimerBar`'s dismiss button was a 24×24px tap target.** `w-6 h-6 -m-1` yields a real hit box of 24×24px (measured via `getBoundingClientRect()`), well under this app's 44×44px convention used on every other icon button on this screen (edit/delete buttons, the "Tìm"/theme-toggle header buttons). Fixed to `w-11 h-11 -m-2`, matching an existing precedent already in the file (App.tsx:10318). Live-verified at 44×44px post-fix.

**[P2 — carried over, correctly left unfixed] `AntibioticDoseCard` still stacks warnings before the dose number.** Both assessments independently re-confirmed via live reproduction (Gentamicin + IHD + missing height + implausible weight) that promoting the dose number above the warnings — the original suggestion — would let a rushed clinician grab a number a warning directly below says doesn't apply to this patient. The warning-before-number ordering and the un-collapsed RRT block (which has its own actionable "chưa nhập Qeff" link) are both load-bearing for the 4/4 error-prevention score this screen carries. No safe way to reduce the density was identified that doesn't touch patient-state-dependent safety gates; the one candidate raised (compacting the *static*, patient-independent drug-level nephro/oto warning into a single-line chip, since it never gates a number and doesn't change with patient state) is worth a future, narrowly-scoped look but was not attempted here to avoid scope creep on a re-run.

**[P3 — new, low-probability, not fixed] `tabReorderNotice` and `showTabHint` can double-stack.** Both are independent booleans with identical markup (`fade-in flex-none mx-5 mb-3`, same colors, same "Đã hiểu" button) — a user who hasn't dismissed the search hint and who then triggers a real tab reorder after 15+ minutes would see two near-identical banners back to back, distinguishable only by reading the text. Requires two independent conditions to coincide, so left as a known minor gap rather than fixed in this pass.

**[P3 — carried over, unrelated to this round] `Disclosure`'s overlapping source/reviewed-date sections and the "Ghim liều này" verb-mismatch remain open** from the original critique — out of scope for the fixes made so far.

## Persona Red Flags

**Alex (Power User):** The tab-reorder problem is neutralized twice over now — the one-time toast explains *that* it happened, the progress bar gives a persistent reference for *where* things are regardless of order. One residual, deliberate trade-off: the toast fires once per browser lifetime, so a second real reorder weeks later gets no notice — reasonable, but worth Alex knowing.

**Casey (Distracted Mobile User):** Directly benefits from disease-name search (the persona most likely to think in scenario terms under stress). The now-fixed dismiss-button regression was also most relevant to Casey specifically — a distracted, one-handed tap is exactly the scenario a 24px target fails. Casey's older, still-open gap (no scroll-position restoration after a mid-lookup interruption) remains unaddressed.

**Riley (Stress Tester):** Re-ran the original 700kg/age-200 stress input against a new drug (Gentamicin, RRT active) rather than just re-confirming the old finding — result holds, no silent wrong number anywhere in the chain. This is the strongest evidence behind leaving the dose-card ordering alone.

## Minor Observations

- The mutual exclusivity of `crclWarnActive` and `rrtWarnActive` (confirmed via `crclReliability()`) means the theoretical "3 concurrent warnings" ceiling from the original critique text was always actually a 2-warning ceiling in practice — both re-run assessments independently confirmed this by testing, not just reading the comment.
- `PatientPanel`'s inline weight-error text and the dose card's `weightImplausible` block use near-identical wording; not doubled up in the common flow (the panel auto-collapses when a drug is selected) but would repeat if a user manually re-expands the panel with a dose card open.
- `npx tsc --noEmit` is clean on `main` after both this round's fixes and the tap-target correction — no type regressions.

## Questions to Consider

- Is the one-candidate compaction idea for `AntibioticDoseCard` (shrinking the static, patient-independent drug-level warning into a single-line chip, leaving every patient-state-dependent warning untouched) worth a dedicated, narrow follow-up, or should the dose-card density question rest here?
- Worth a quick guard so `tabReorderNotice` and `showTabHint` never render simultaneously, even though the odds of both firing at once are low?
