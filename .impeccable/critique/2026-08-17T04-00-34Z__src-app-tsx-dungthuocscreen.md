---
target: DungThuocScreen
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-17T04-00-34Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Count-up on CrCl/dose, aria-live, per-line "Ghim {time}" staleness, toasts on every save/pin |
| 2 | Match System / Real World | 4 | Units, pump-step rounding, CrCl-tier language clinicians already use |
| 3 | User Control and Freedom | 3 | Two well-tuned undo windows, but pinning a dose the app flagged as likely a decimal/unit error has no extra brake |
| 4 | Consistency and Standards | 4 | One SEVERITY_STYLE table drives danger/warn/ok everywhere |
| 5 | Error Prevention | 4 | parseStrictNumber refuses silent coercion |
| 6 | Recognition Rather Than Recall | 3 | Only ~40% of the 10-tab row fits a 375px viewport |
| 7 | Flexibility and Efficiency | 4 | Typeahead auto-select, ward recipes, bidirectional dose/rate calculator |
| 8 | Aesthetic and Minimalist Design | 3 | Density is a defended principle, but one open drug card stacks many sections |
| 9 | Error Recovery | 4 | Every "—" result states a reason and, where possible, a tappable fix |
| 10 | Help and Documentation | 3 | Disclaimer + sourcing covered; no in-context explainer for screen mechanics |
| **Total** | | **36/40** | **Good** |

## Design Specificity Verdict

LLM assessment: authored software — two-tier doseAbsMax/doseMax gate, cross-tab disambiguated search, interruption-aware undo windows all argued from real clinical/operating context, not generic scaffolding.

Deterministic scan: static CLI scan found 1 whole-file finding (false positive, out of scope). Live browser overlay on the rendered screen found 16 anti-pattern hits — mostly plausible-but-unconfirmed attribution to DungThuocScreen's own disclosure/padding/typography, with bottom-nav 10px labels confidently out of scope and an h1.truncate overflow worth checking against ScreenHeader's MIXING_TITLES[tab].

## Priority Issues

[P0] Extreme-dose confirmation doesn't extend to pin/copy actions (InfusionCalculator, App.tsx:9304,9589-9604,9688-9713) — highest-consequence action gets same friction as lowest. Fix: re-arm confirm on pin/copy when severity is high/extreme.

[P1] Dose-entry keystrokes (dose/rateInput/conc/bagVolume, App.tsx:9214-9217) are plain useState while every other selection layer on this screen is useStickyState — interruption silently discards in-progress entry. Fix: persist via useStickyState keyed by drug id.

[P2] 10-tab row and 6-item unit-chip row exceed the screen's own minimal-choices bar; only last tab is sticky, no frequency ordering. Fix: reorder by usage or make search always-visible.

[P3] Patient-delete double-tap window (2.5s, App.tsx:5176) is short relative to the reasoning that justified the 20s undo window for the same interruption scenario.

## Persona Red Flags

Alex (power user): re-pays tab-discovery cost every time for non-adjacent categories, no MRU ordering.
Casey (interrupted mobile): dose/conc silently reset to defaults after interruption with no visual cue anything was lost.

## Minor Observations

- Count-up animation runs identically on OK and extreme-severity results.
- Peripheral-line warning collapsed-by-default; extreme-dose block always-expanded (correct).
- h1.truncate overflow (39px) plausibly ScreenHeader's MIXING_TITLES[tab].
- First-run state stacks 4 competing attention claims before any drug content.

## Questions to Consider

1. Why does confirming "50x normal dose" unlock the same unguarded pin/copy affordance as a correct dose?
2. Why is the actual number being typed the one layer that doesn't survive interruption?
3. Would a task-first default view (search + running + recents) beat the 10-way taxonomy split?
