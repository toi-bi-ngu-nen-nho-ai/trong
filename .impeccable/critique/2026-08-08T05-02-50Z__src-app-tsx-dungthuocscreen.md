---
target: src/App.tsx (DungThuocScreen)
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-08T05-02-50Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: design-review sub-agent · B: detector/browser-evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 10-tab category row conveys active state by color only, no aria-selected |
| 2 | Match System / Real World | 4 | Near-perfect Vietnamese clinical vocabulary and workflow order |
| 3 | User Control and Freedom | 4 | Two-step patient delete naming drug count, 10s undo, 5s deferred unpin |
| 4 | Consistency and Standards | 2 | JetBrains Mono committed in DESIGN.md for dose numbers but never applied (NUM = tabular-nums only) |
| 5 | Error Prevention | 4 | blocked gate hides result behind explicit confirmation, re-arms on any input change |
| 6 | Recognition Rather Than Recall | 3 | Patient panel auto-collapses on drug select; weight/CrCl must be recalled while reading dose |
| 7 | Flexibility and Efficiency | 3 | Cross-tab search pre-seeds destination steps, but 10 tabs cannot be reordered/favorited |
| 8 | Aesthetic and Minimalist Design | 1 | P0: 439px of content between dose input and result box |
| 9 | Error Recovery | 4 | missingReason lives inside the result box with a tappable fix |
| 10 | Help and Documentation | 1 | No in-context legend for NB/Nong n abbreviations; Huong dan is a separate screen |
| **Total** | | **29/40** | **Good** |

## Design Specificity Verdict

Not a generic admin panel: bidirectional dose<->rate calculator for shift handover, roundToStep reflecting real syringe pump quantization, per-lumen Y-site compatibility, CompatSource declaring per-pair verification status. Weakness is not specificity but unmanaged density at the exact moment the number is needed.

## Priority Issues

[P0] Result box sits 439px below the dose input it depends on; Noradrenaline's own default concentration unconditionally trips its peripheral-line warning. Suggested: /impeccable layout

[P1] JetBrains Mono committed in DESIGN.md for dose numbers, never wired into NUM/T.metric. Suggested: /impeccable typeset

[P1] 10-tab row has no role=tablist/aria-selected; zero page landmarks; blocked-state swap has no aria-live. Suggested: /impeccable harden

[P2] Stale empty-state copy references a removed "Liều chung" option. Suggested: /impeccable clarify

[P2] RunningPanel row controls consume 236/375px, forcing drug-name truncation. Suggested: /impeccable distill

## Persona Red Flags

Casey (distracted mobile): keyboard covers the result box after interruption; only visible content is the peripheral-line warning.
Sam (accessibility-dependent): tab row announces no selected state; zero landmarks; blocked state changes silently.

## Minor Observations

text-slate-500 (-> --c-text-muted) used broadly, some 10px instances near the AA floor. STALE_AFTER_MS (4h) misaligned with 12h shift/log window. "Metronidazole - 2" shows unexplained route count.

## Questions to Consider

1. Should the peripheral/central-line question be asked once per patient instead of warning unconditionally every time?
2. Is JetBrains Mono a real safety requirement for dose legibility, or should DESIGN.md's rule be removed?
3. If only one element could be visually louder than the dose number, is it styled that way today?
