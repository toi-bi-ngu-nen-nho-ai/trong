---
target: src/App.tsx DungThuocScreen
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 1
timestamp: 2026-08-17T17-38-15Z
slug: src-app-tsx-dungthuocscreen
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | 20s patient-delete arm window has no visible countdown; no "this may be stale" signal on old values |
| 2 | Match Between System and Real World | 4 | Fluent clinical Vietnamese, workflow matches how a physician actually thinks (weight -> dose -> rate -> pump instruction) |
| 3 | User Control and Freedom | 3 | Good undo coverage, but no way to detect/clear a stale sticky value short of already knowing to hit "Lam moi" |
| 4 | Consistency and Standards | 2 | Three different double-tap-confirm implementations on one screen, no shared affordance; severity styling vanishes once a value lands in RunningPanel |
| 5 | Error Prevention | 2 | Strong guardrails undermined by a verified gap: "Xoa benh nhan" doesn't clear the sticky calculator inputs it exists to guard against |
| 6 | Recognition Rather Than Recall | 3 | MRU tab reordering trades stable recall for efficiency, reshuffles more often than intended |
| 7 | Flexibility and Efficiency of Use | 3 | Cross-tab search, sticky fields, saved recipes, MRU tabs, solid for a touch-first tool |
| 8 | Aesthetic and Minimalist Design | 3 | Progressive disclosure keeps real domain density navigable; decoration stays out of the dose zone (verified live) |
| 9 | Help Users Recover from Errors | 2 | missingReason pattern is excellent where it fires, but the P0 condition below produces zero error signal |
| 10 | Help and Documentation | 3 | Inline source/reviewed-date citations, one-time search hint, disclaimer gate |
| Total | | 28/40 | Good |

## Design Specificity Verdict

LLM assessment: Authored, not templated. The shared "Benh nhan hien tai" context feeding every calculator, CrCl-tier antibiotic logic, Y-site interaction cross-check, pump-step rounding tied to a real syringe driver, all trace to one specific bedside workflow. Specificity is uneven though: the safety machinery built for the calculator (severity coloring, confirm gates) does not extend into the running-drug list, the one place a rushed clinician glancing for handoff would actually look.

Deterministic scan: CLI scan of the whole App.tsx (~11,400 lines) found exactly one finding total, and it falls outside DungThuocScreen (an alpha-channel #000 in an unrelated component's CSS mask, itself a likely false positive). Zero in-scope static findings. The live-injected browser detector (4 passes: desktop/mobile x antibiotics/InfusionCalculator) found a handful of advisory items, a Disclosure max-height transition, a Creatinin-toggle padding pattern, tab-pill padding, desktop-only long text lines, and Assessment B independently traced most of these to source comments documenting them as deliberate trade-offs, not oversights. Two text-occlusion findings on the desktop antibiotics title could not be confirmed real (contradicted by DOM hit-testing; likely an artifact of this session's non-compositing browser pane) and are reported as unresolved, not as defects.

Where detector and design review diverge: the detector, static pattern-matching plus a single-render snapshot, is structurally blind to the two P0s below, both of which are multi-step state bugs (delete patient -> reopen calculator; delete patient -> enter new weight) that only exist across an interaction sequence. This is exactly the gap dual-agent critique is meant to catch: a clean detector run does not mean a clean screen.

## Overall Impression

The four fixes from the prior critique (2026-08-17T04:00) all work correctly for the specific scenario they targeted, Assessment A independently re-verified all of them live. But building "sticky calculator state that survives interruption" (P1) and a clean-slate patient reset in the same session, without an explicit ordering rule between them, opened a real gap: deleting a patient no longer guarantees a clean slate, and the confirm-gate meant to catch exactly this kind of danger doesn't re-arm on the input that actually changed (weight). The single biggest opportunity is closing that boundary, then carrying the calculator's excellent severity signaling out to the one screen (RunningPanel) that's actually used for handoff.

## What's Working

1. The extreme-dose confirm gate, on the happy path, is excellent, unambiguous red block with exact numbers compared, plus a genuinely layered defense (viewing != committing) on pin/copy.
2. The missingReason pattern. Every blank result names the specific missing input and, where possible, a tappable fix, done consistently everywhere rather than once.
3. Progressive disclosure earns its keep in a genuinely dense domain (10 categories, multi-field calculator) without deleting information nobody asked to see.

## Priority Issues

[P0] Deleting the patient doesn't clear the calculator's remembered dose, and a weight-only change re-computes an unconfirmed extreme result (InfusionCalculator, resetPatient) - verified live: pin Noradrenaline at 50 mcg/kg/phut (70kg, triggers extreme gate), delete patient (executes, toast confirms), reopen same drug card, still shows the extreme warning and value. Enter a new weight for the "new" patient and a complete ready-to-pin rate renders without ever re-showing the confirm gate, because the reset useEffect only watches [dose, rateInput, conc, unitId, mode], not weight/patient identity. Fix: on resetPatient(), also reset confirmed/confirmPin/confirmCopyExtreme on every mounted calculator, or add weightKg/a patient-generation id to that useEffect's dependency array. Suggested command: /impeccable harden

[P0] Pinned doses lose all severity signal once they land in "Dang dung" (RunningDrug/RunningPanel) - RunningDrug has no severity field; every entry renders in the same muted gray regardless of how extreme it was. Verified live with the pinned 50 mcg/kg/phut entry, which required a double-tap "50x normal" confirmation to pin, looking identical to a routine dose in the handoff/cross-check panel. Fix: capture severity in pinRunning() (calculator already computes it) and apply severityStyle to running entries that were high/extreme at pin time. Suggested command: /impeccable harden

[P1] The 20-second patient-delete confirm window has no visible countdown (App.tsx, patient-delete button, CONFIRM_PATIENT_RESET_MS) - unlike ConfirmIconButton's animated countdown ring used for "Xoa cong thuc nay", this button only changes label/color. An interrupted clinician returning within 20s of the first tap, believing it's fresh, executes the delete instead of arming it, the exact scenario the window was lengthened for. Fix: reuse the countdown-ring pattern on the patient-reset button. Suggested command: /impeccable polish

[P2] The headline dose number and the "Dat bom" pump instruction can disagree at rates >=100 mL/h (formatDoseNumber vs rateDecimals) - formatDoseNumber drops to 0 decimals above 100, but "Dat bom" always shows 1 decimal. Verified live: "2063 mL/gio" hero number alongside "Dat bom 2062.5 mL/gio" one line below, a 0.5 mL/h discrepancy at exactly the high-rate, high-stakes scenario. Fix: derive the hero number's decimals from the pump step consistently. Suggested command: /impeccable harden

[P2] MRU tab reordering can reshuffle mid-shift, not just between shifts (orderedTabs useMemo, DungThuocScreen) - order is computed once per mount (correct, avoids jumping during a visit) but DungThuocScreen fully unmounts on any screen navigation, so a five-second detour to another screen and back can reshuffle the row, breaking positional muscle memory more often than intended. Fix: persist the computed order in sessionStorage (same pattern as useStickyState) so it's stable within one active app session, not just one screen-mount. Suggested command: /impeccable polish

## Persona Red Flags

Alex (Power User): MRU reorder fights the muscle memory Alex is building, "third chip from the left" can silently point at a different category after a five-second detour, no transition marking the change. Three inconsistent confirm-timer treatments mean Alex can't build one reliable habit across the screen.

Casey (Distracted Mobile, the screen's own target persona): Casey is exactly who triggers the P0, interrupted mid-shift, deletes a patient one-handed between beds, returns, and the calculator silently still holds the old extreme value. Casey also gets no help distinguishing "arming" from "about to execute" on the 20s window. Positives: primary actions sit in the thumb zone, touch targets are consistently 44x44px, and the sticky-state fix genuinely works for its intended case (interruption without patient reset).

Sam (Accessibility-Dependent): Core flow scores well, aria-live wraps both blocked/result branches, aria-labels update with state, focus rings follow the documented pattern. But RunningPanel's severity loss is a screen-reader problem too, and the 20s arm window has no aria-live "still armed" announcement either.

## Minor Observations

- The drug-picker's inline mini-badge ("Noradrenaline - 2625.0 mL/gio") inherits the same severity-blind styling as RunningPanel, same root cause as the P0, worth fixing together.
- A 50 mL bag emptying in "1 phut" at an extreme rate is itself a strong implicit danger signal not cross-checked against the severity system.
- "Lam moi" correctly restores sticky fields, a real escape hatch for the P0 scenario, but nothing connects it to "you may be looking at stale data."
- Detector-flagged, confirmed intentional: Disclosure's max-height transition (documented ResizeObserver fix), the Creatinin-toggle padding (documented pixel-alignment decision), antibiotics-tab title truncation (documented min-w-0 fix, working as designed though it does ellipsis-clip on a 375px phone).
- Detector-flagged, not yet addressed: category-tab pills render with 0px vertical padding at 12px text; bottom-nav labels render at 10px app-wide (shared app-shell code, not DungThuocScreen's own, but visible on every visit here).
- The tab row's left-edge "more to scroll" fade gradient renders unconditionally, including at scrollLeft:0 where there's nothing to scroll back to.
- Two text-occlusion findings on the desktop antibiotics view could not be confirmed real (contradicted by DOM hit-testing), flagged as unresolved, not as defects.

## Questions to Consider

- Is "Xoa benh nhan" meant to guarantee a clean slate for every open calculator, or only for the patient-context fields and running-drug list?
- Given RunningPanel already does cross-drug interaction checking, should it become the primary place severity is surfaced, since it's the actual handoff view?
- Three confirm-timer treatments grew independently for good local reasons, worth consolidating into one shared component now that there's a fourth candidate?
