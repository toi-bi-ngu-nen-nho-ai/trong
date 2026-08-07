---
target: màn hình dùng thuốc (DungThuocScreen)
total_score: 37
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-07T15-38-12Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: design-review sub-agent · B: detector/browser-evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | CrCl/IBW/ABW and every drug dose recompute live as patient fields change; log badge scopes to last 12h only |
| 2 | Match System / Real World | 4 | Correct Vietnamese clinical vocabulary, indication-first workflow, IBW/ABW/AdjBW distinctions clinicians actually use |
| 3 | User Control and Freedom | 4 | 10s undo on patient delete (restores running-drug list too), 5s delayed unpin, double-tap-with-countdown-ring deletes |
| 4 | Consistency and Standards | 3 | 10-tab flat pill row departs from standard mobile nav (≤5 primary + overflow) with no overflow affordance |
| 5 | Error Prevention | 4 | `parseStrictNumber` rejects "70abc" rather than silently truncating; implausible-value guards on weight/height/age |
| 6 | Recognition Rather Than Recall | 4 | Single shared "Bệnh nhân hiện tại" context; every dose caption states which number it used and where from |
| 7 | Flexibility and Efficiency | 4 | Sticky tab/selection state, cross-tab drug search, bidirectional dose↔rate calc, saved/pinned ward recipes |
| 8 | Aesthetic and Minimalist Design | 3 | Inherently dense domain; detector also flags cramped-padding/undersized text on Antibiotics & Vasoactives tabs |
| 9 | Error Recovery | 4 | Six-tier severity system, ALL-CAPS + multiplier language ("×N lần") for dangerous tiers, distinct softer amber tier |
| 10 | Help and Documentation | 3 | Every drug cites a source or explicitly admits "chưa ghi nguồn" — but SLED/CRRT/AUC24-MIC have no inline definitions |
| **Total** | | **37/40** | **Excellent** |

A 37/40 is unusually high — earned by specific, verifiable evidence (AKI-aware CrCl invalidation, peripheral-line concentration thresholds with catheter gauge/timing, decimal-slip-tuned dose language), not a generous read. The detector's independent findings pull the same two heuristics down (8 and 10) that the design review already flagged as weakest.

## Design Specificity Verdict

**Clearly authored for ICU/IM dosing work, not a reskinned generic calculator.** LLM assessment: renal-replacement-modality awareness (AKI/IHD/CRRT/SLED/PD) that invalidates Cockcroft-Gault CrCl and cascades that invalidation into every open drug card with modality-specific text; a peripheral-vs-central-line concentration safety flag for Noradrenaline citing an actual mg/mL threshold, catheter gauge, and monitoring interval; dose-safety language tuned to the real-world dominant error (decimal/unit slip) rather than generic range checks. No generic form template produces this.

**Deterministic scan**: static CLI scan of `src/App.tsx` (`detect.mjs`) found 3 findings — `bounce-easing` ×2 (lines 931, 11607) and `layout-transition` ×1 (line 11607, animating `width`). Given `index.css`'s own extensive comments justify each bounce curve by name (`pickerPop`, `mindFabIn`, `mindBorn`, `toastIn` — each answers a specific "did my tap register / did the value change" question, with an explicit `prefers-reduced-motion` carve-out), these read as **likely false positives**: the motion system is unusually deliberate, not decorative slop. The `width` transition is a legitimate minor performance note (layout-triggering property) worth a look during `/impeccable optimize`.

Live-overlay scanning (rendered pages) reported far higher counts — 57 on the Antibiotics tab, 24 on Vasoactives, 22 on the Noradrenaline drug card — dominated by `ai-color-palette`, `cramped-padding`, `undersized-ui-text`, and `line-length`. Two caveats from Assessment B itself: (1) the initial 59-count reading on first load was inflated by scanning while the onboarding disclaimer sheet still covered the page (its `text-occlusion` findings are an artifact of timing, not a real occlusion bug); (2) repeated scans of the *same* page state returned different counts (53 vs 57), indicating timing-sensitive nondeterminism in the detector's own re-scan behavior, not a confirmed defect count. The `ai-color-palette` volume is also plausibly a false positive against intent: the codebase deliberately locks every surface to one hue family (196°) for light/dark coherence — a policy, not an oversight — though it may still cost real scanability between drug categories (see Priority Issues).

**Visual overlays**: not available this run. Both sub-agents' browser panes failed to composite frames for screenshots ("the Browser pane is not displayed"), in isolated tabs separate from your own. Script injection itself succeeded (detect.js ran and reported via console), but no user-visible overlay was produced — treat this as a fallback-signal limitation of this session's environment, not evidence the app itself is screenshot-broken.

## Overall Impression

This is a materially above-average clinical tool — the safety logic (tiered dose danger levels, renal-modality-aware invalidation, shared patient context) is the kind of domain-specific rigor a generic dosing-calculator template cannot produce, and the review agent's heuristic scores reflect that. The gap is entry, not execution: once a clinician is inside a drug card, the tool is careful and forgiving; getting to the right drug fast, one-handed, under time pressure is where both assessments independently found friction.

## What's Working

1. **Cross-tab shared patient context with explicit attribution** — removes the highest-risk failure mode (re-typing weight into three different vasoactive cards) and every dose caption states which number it used and where it came from.
2. **Tiered, actionable dose-safety system** (`doseSafety.ts`) — six severities, multiplier-based language matched to the real error mode (decimal/unit slips), a genuine hard-stop distinct from a "clinically plausible but high" tier.
3. **Restraint at the right moment** — no bounce/confetti on danger states, haptic-style feedback reserved for low-stakes chip taps. The emotional design correctly treats a dosing-danger flag as serious, not decorative.

## Priority Issues

**[P1] Search buried under a flat 10-tab / 22-item wall**
Why it matters: cross-tab drug search is the fastest path to any of 100+ drugs, but it's hidden behind a small icon, closed by default, while the first thing a rushed clinician sees is a 10-tab strip plus a 22-item alphabetical antibiotic list — a decision point far past the ≤4-item working-memory guideline.
Fix: promote search to a default-visible field on dense tabs, or add scenario bundles (e.g., "Sốc nhiễm khuẩn") above the alphabetical wall.
Suggested command: `/impeccable layout`

**[P2] Mobile viewport resize silently drops the open drug calculator**
Why it matters: Assessment B observed that resizing from desktop width to 375px while the Noradrenaline mixing calculator was open reverted the screen to the unselected drug list — losing calculator state exactly in the scenario (phone reorientation/interruption mid-shift) that Assessment A's persona walkthrough independently flagged as this screen's fragile point. Neither assessment could confirm whether this is an intentional master-detail collapse or a bug.
Fix: confirm intent; if unintentional, preserve the selected-drug id across breakpoint changes.
Suggested command: `/impeccable adapt`

**[P2] Renal-function context can go stale for a whole shift with no reminder**
Why it matters: the 6-way renal-function toggle (Không lọc/AKI/IHD/CRRT/SLED/PD) is shared across the session with no expiry or re-check nudge. If dialysis starts mid-shift and the clinician forgets to update it, a later lookup silently uses the wrong tier — the invalidation logic is excellent only if the input stays current.
Fix: prompt to reconfirm renal status after some elapsed time or before a new antibiotic lookup.
Suggested command: `/impeccable onboard`

**[P2] Noradrenaline ships with "chưa ghi nguồn" (no citation)**
Why it matters: the app's own stated philosophy is to never silently omit sourcing, which it honors — but shipping without a citation on arguably the single most-used ICU drug in the tool is a real content gap on a safety-relevant screen.
Fix: source and cite before next content pass.
Suggested command: `/impeccable harden`

**[P3] Cross-tab search toggle is a 32px tap target**
Why it matters: shrunk to visually match adjacent title text (per code comment), while the tab row elsewhere targets 44px. In gloved-hand or one-handed ICU use, this is exactly the control most likely to be mis-tapped — and it's also the control from the P1 fix above.
Fix: raise to ≥44px without changing its visual weight (padding, not icon size).
Suggested command: `/impeccable audit`

## Persona Red Flags

**Riley (stress tester)**: implausible-value guardrails work as designed (700 kg → rejected as a likely typo; "70abc" refused rather than silently truncated to 70). The `requiresConfirm` gate for extreme infusion doses — arguably the single highest-leverage interaction in the app — could not be independently driven through the live UI this session (tool instability during testing, not a reported app defect); whether it takes a single tap (risk of reflexive dismissal) or something more resistant is unverified and worth confirming directly.

**Sam (accessibility-dependent)**: above-average diligence — `aria-expanded`/`aria-controls`/`aria-pressed` throughout, severity always paired with text (never color-only), a `prefers-reduced-motion` implementation that correctly keeps functional tap feedback while killing decorative animation, and a hand-tuned (not blanket-inverted) dark-mode danger/warn palette. Red flag: no `aria-live` region evident on the CrCl number that recomputes as you type — a screen-reader user may not learn the value changed. Also inherits the 32px search-target issue above.

**Casey (distracted mobile clinician)**: the concrete red flag is the same 32px target, compounded by the 10-tab horizontal scroll strip at 375px width — a tap aimed at "Co bóp" landed on the adjacent "Vận mạch" tab during testing, exactly the failure mode a shaky one-handed swipe produces on a tightly packed pill row. This is the same fragility class that produced the P2 resize-state-loss finding above: entry into the right drug is the weak point, not the calculation once you're there.

## Minor Observations

- Renal-function selector appears on every tab including ones where it's clinically inert (Điện giải, An thần) — a defensible simplification cost of one shared patient panel.
- No inline definitions for SLED/CRRT/AUC24-MIC for a less experienced reader (medical-student audience, per PRODUCT.md) — candidate for `/impeccable clarify`.
- Detector's `cramped-padding`/`undersized-ui-text` findings on the Antibiotics and Vasoactives tabs converge with the design review's own "screens are still long/dense" note — worth a density pass even though the domain is inherently dense.
- `ai-color-palette` volume is plausibly a false positive against the codebase's deliberate single-hue (196°) policy, but if the user pursues a broader palette change (see open color question), re-run the detector after — it may surface real issues once more hues are in play.
