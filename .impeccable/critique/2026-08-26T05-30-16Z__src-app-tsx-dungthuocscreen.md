---
target: DungThuocScreen
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-26T05-30-16Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: a8be9d18f9de819d0 · B: ac6eb888e07a63d75)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | MRU tab reorder happens with zero visible cause — a rearranged row can read as a glitch |
| 2 | Match System / Real World | 4 | Vietnamese clinical terminology and abbreviations used correctly throughout, no dumbing-down |
| 3 | User Control and Freedom | 3 | `DisclaimerGate` has no Escape/backdrop-dismiss by design — correct call, but reads as unresponsive to a reflexive first tap |
| 4 | Consistency and Standards | 3 | "Ghim liều này" vs. the infusion-card equivalent uses a different verb for the same "add to running list" action |
| 5 | Error Prevention | 4 | Best-in-class: implausible weight/age/Scr blocks dose math outright rather than silently computing a wrong number |
| 6 | Recognition Rather Than Recall | 3 | Alphabet jump bar requires already knowing the drug's spelling — minor tax on first-timers |
| 7 | Flexibility and Efficiency | 3 | No way to quick-reference a drug's standard dose without going through the live-patient-context flow |
| 8 | Aesthetic and Minimalist Design | 3 | A fully-loaded dose card can stack 3 warnings + 5 more content blocks before the usable number |
| 9 | Error Recovery | 4 | Every blocked calculation names the exact missing/rejected field and links straight to the fix |
| 10 | Help and Documentation | 3 | Inline source/review-date disclosure on every dose card, but two disclosures describe overlapping content |
| **Total** | | **33/40** | **Good** |

## Design Specificity Verdict

**LLM assessment (Assessment A):** Genuinely grounded in the product, not a reskin. Dose numbers are hard-wired to JetBrains Mono specifically because digit-ambiguity is a clinical-safety issue (confirmed live via computed style). The CrCl-tier/RRT/AKI/weight-basis warning stack encodes real nephrology logic that would be meaningless in an unrelated app. The Y-site/interaction compatibility matrix, the 20-second reset-undo tuned explicitly to "a code call can interrupt you mid-tap," and the dose-cap/rounding-excess machinery are load-bearing domain logic, not decoration. This could not be dropped into a to-do app or a recipe app unchanged.

**Deterministic scan (Assessment B):** `detect.mjs` found exactly **1 finding in the entire 11,400-line `App.tsx`** (a `design-system-color` mask-gradient at line 942), and it sits well before `ScreenHeader` (1022) — outside the DungThuocScreen surface entirely. **Net in-scope CLI findings: 0.**

**Browser overlay (live-injected `detect.js`, capture only — no overlay is currently open):** The dev server tab and the live-detector server (port 8400) were both closed/stopped after evidence capture, per the critique's server-hygiene rule, so there is no overlay for you to view live right now; findings were captured and are reported here instead.

- `clipped-overflow-container` ×3 — traced and judged **likely false positives**: both real horizontally-scrollable strips on this screen (the alphabet jump bar at 8887, the 10-tab group row at 11459) already have their own correct `overflow-x-auto` container with visible edge-fade scroll hints (11491–11492); the detector's heuristic appears to walk past that container to the outer app-shell wrapper instead.
- `layout-transition` ×2–3 — traced to `.disc-body` (index.css:979–993) driving every `Disclosure` on this screen. Not a false positive, but a **documented, deliberate trade-off**: `grid-template-rows` was tried and rejected for cross-browser auto-height reasons, and a `prefers-reduced-motion` override already exists.
- `undersized-ui-text` ×5 — bottom-nav labels at 10px (below an 11px floor). Confirmed by direct measurement; contrast is fine (5.08:1 in dark mode, passes AA) — this is a size-only issue. **Scope note: this is the global bottom nav shared by every screen, not something specific to DungThuocScreen's own components.**
- `overused-font` ×1 — a single dominant brand font page-wide; typically a positive, not a defect, in a token-driven system like this one.

Where the two assessments agree: neither found a specificity problem, and both independently landed on "this screen's real risk is density/findability under time pressure, not genericness." Where the detector added something the LLM review didn't independently flag: the exact 10px bottom-nav measurement (Assessment A didn't measure the nav directly since it's outside the ten in-scope functions). Where the detector's raw output needed judgment before trusting it: the three `clipped-overflow-container` hits, which evidence-tracing showed were very likely mis-attributed to the wrong ancestor element.

## Overall Impression

This screen is unusually disciplined about the one thing that actually matters for a dosing tool: it will not hand a clinician a wrong number. Error prevention and error recovery both scored 4/4, and that isn't grade inflation — implausible weight/age/creatinine values are traced all the way through the calculation chain and block the math itself, not just a warning label next to a number that still computes. The gap isn't correctness, it's *findability under time pressure*. The single biggest opportunity: the one moment this screen was explicitly built to be reached instantly — the home-screen shortcut straight into `?screen=mixing` — is also the one screen that can't reach the dark-mode toggle, and the one screen where the primary navigation device (10 tabs) can silently reorder itself and offers no sense of position within itself.

## What's Working

1. **The implausible-input firewall is structural, not cosmetic.** `weightImplausible` is computed once and gates `doseTargetMg` itself, so every downstream consumer (mix panel, autoUsage, dose cap) inherits the block automatically. Live-verified: a 700 kg entry doesn't just show a warning next to a number — it stops the number from existing.
2. **Cross-tab search collapses the 10-tab needle-in-haystack problem into two taps.** Live-verified: searching "adren" surfaces all three Adrenaline entries across two tabs with their tab labels attached, and picking one pre-selects the destination tab's state before switching to it, so the destination renders already on the right card.
3. **The CrCl-null-reason split (missing vs. rejected input) is a subtle, correct fix to a real prior bug.** Telling a doctor who *did* enter their numbers to "enter age, weight..." again — as if nothing was typed — would send them in a circle. The code deliberately distinguishes the two cases and gives distinct, correct copy for each.

## Priority Issues

**[P1] The dark-mode toggle is unreachable from the screen the app's own shortcut opens.** `ThemeToggle` only renders on `HomeScreen`'s floating button cluster; `/?screen=mixing` — the exact URL the installed PWA shortcut uses to skip Home for urgent lookups — has no theme control anywhere in its header or body.
- **Why it matters:** The documented primary use case is a doctor going straight into dosing at a bedside, often at night. Forcing a detour through the screen the shortcut exists to bypass, just to cut screen glare, is friction at exactly the wrong moment.
- **Fix:** Surface `ThemeToggle` (or a compact icon-only variant) in `ScreenHeader.actions` on `DungThuocScreen`, or make the toggle a persistent app-shell control independent of which screen is active.
- **Suggested command:** `/impeccable layout`

**[P1] The 10-tab row has no positional indicator, and can silently reorder itself.** Live-verified `scrollWidth: 937` vs `clientWidth: 390` (≈2.4 screens) with only two 24px edge gradients signaling "more content" — no dots, no counter. The row is also not static: usage-based MRU sorting (refreshing every `TAB_ORDER_REFRESH_MS`) live-verified to actually reorder tabs after use.
- **Why it matters:** The screen's core value proposition is "find drug X fast." A doctor's spatial memory of "antidotes are the last tab" is undermined by a row that can rearrange itself between shifts, with the change happening invisibly (also heuristic #1's key issue).
- **Fix:** Add a lightweight position affordance (e.g. a dot/page strip under the fade), and/or make a reorder event visible once via a brief toast the first time it actually happens — the app already has this exact pattern for the search hint (`TAB_SEARCH_HINT_KEY`).
- **Suggested command:** `/impeccable layout`

**[P2] A fully-loaded dose card can stack 3 warnings plus 4–5 more content blocks before the usable number.** Live-verified with an implausible weight+age combination that RRT/AKI, weight-basis, and CrCl-missing warnings can co-occur above the actual dose line.
- **Why it matters:** Works directly against the "look up one number fast" mandate at the exact moment (multiple real clinical complications at once) when speed matters most.
- **Fix:** Promote the usable dose line above the fold with a single collapsed "N cảnh báo — chạm để xem" summary strip, rather than warnings-then-dose in document order.
- **Suggested command:** `/impeccable layout`

**[P2] Cross-tab search only matches drug name, not the clinical indication.** `searchResults` filters on `normalizeSearch(d.name)` only — a doctor who thinks "the meningitis drug" before the generic name gets zero results, even though the app already has structured `DiseaseEntry` data.
- **Why it matters:** ER doctors plausibly think in scenario-first terms before drug-name-first terms, especially outside their own subspecialty.
- **Fix:** Extend the search index to also match against `disease.name` for antibiotics with disease-scoped tiers.
- **Suggested command:** `/impeccable clarify`

**[P3] `DisclaimerBar`'s reminder is a permanent fixture on every visit, dozens of times a shift.** It's intentionally shrunk to one line, but still occupies screen space above the patient panel on every load — the highest-traffic real estate on the screen.
- **Why it matters:** `DisclaimerGate` already extracts full informed consent once per app version; the recurring bar's marginal safety value against its permanent per-visit cost is worth re-litigating.
- **Fix:** Consider dismissing per-session rather than showing on every screen load, or shrinking further once acknowledged.
- **Suggested command:** `/impeccable distill`

## Persona Red Flags

**Alex (Power User):** The search → jump → dose path is genuinely fast (verified in two round trips), and sticky per-tab state means a habitual antibiotic/route combo survives tab-hopping. But the MRU tab reorder (P1 above) actively fights Alex's learned spatial memory — the more correctly Alex uses the app, the more the tab row rearranges itself out from under that memory.

**Riley (Deliberate Stress Tester):** Stress-tested with weight=700 kg + age=200 simultaneously — both the patient panel and the dose card independently produced correct, specific, blocking warnings; no silent wrong number appeared anywhere in the calculation chain. This is a strong result. Garbage numeric input ("70abc"/"1.2.9") is explicitly treated as not-entered at the source level rather than silently truncated to a plausible-looking number.

**Casey (Distracted Mobile User):** The 20-second reset-undo (vs. a 5-second undo elsewhere) is explicitly tuned for Casey's exact interruption scenario and verified working end-to-end. But Casey returning after being pulled away mid-drug-lookup (not mid-reset) lands wherever the shared scroll position was left — there's no "resume where I was" scroll restoration the way there is state restoration for the disease/route wizard selections.

## Minor Observations

- Bottom-nav labels render at 10px, one pixel under the detector's 11px floor (confirmed by direct measurement; contrast itself passes AA at 5.08:1 in dark mode) — global to every screen, not specific to DungThuocScreen, but flagged here since the detector caught it on this surface's shared chrome.
- `CalcLogSheet`'s multi-select model ("nothing selected = applies to everything") is compact but could read backwards to a first-time user who selects one item expecting the action scoped to just that item by default.
- The alphabet jump bar disappears the instant a query is typed or a group selected (correct, since it would misrepresent a filtered list) — but a user who picks the wrong drug by mistake has to explicitly clear the selection to get back to letter-jumping.
- `ThemeToggle`'s state label ("Chủ đề: Tối. Chạm để đổi.") is genuinely well-written — it states current state, not just an icon — it's just stranded on the wrong screen (see P1).
- The three `clipped-overflow-container` detector hits look like false positives from the detector walking past the correct scroll-container ancestor to an outer wrapper; worth a detector-side fix if the same pattern recurs on other screens, but not a defect in this screen's own markup.

## Questions to Consider

- If the home-screen shortcut is explicitly designed to skip Home for urgent lookups, why does the one control that changes environmental readability (light/dark) live only on the screen the shortcut was built to avoid?
- The tab row already tracks usage frequency well enough to silently reorder itself — could that same signal instead power a *persistent* "your 3 most-used drugs" quick-access row above the 10-tab scroller, so the primary action doesn't require scrolling through tabs at all for the common case?
- Given the dose card already blocks on implausible weight/age before showing a number, would a single unified pre-flight checklist strip ("✓ cân nặng ✓ tuổi ⚠ creatinin") reduce the vertical scanning needed to find out *why* a number isn't showing?
