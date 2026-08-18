---
target: "DungThuocScreen (src/App.tsx:10690-11185)"
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-18T23-08-34Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: design review sub-agent · B: detector/browser evidence sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | `aria-live` CrCl block, drain-bar countdowns on destructive actions, "Ghim {clock}·{ago}" timestamps |
| 2 | Match System / Real World | 3 | Correct clinical vocabulary; search-result list uses `role="group"` + manual arrow keys instead of a standard listbox pattern |
| 3 | User Control and Freedom | 3 | Strong undo coverage everywhere except tab-switch loses scroll position (P1 below) |
| 4 | Consistency and Standards | 3 | Confirm-drain pattern reused consistently; creatinine lacks the magnitude check weight/height/age all get (P1 below) |
| 5 | Error Prevention | 3 | Character-level input guards are strong everywhere; creatinine magnitude isn't guarded like the other three vitals |
| 6 | Recognition Rather Than Recall | 4 | Sticky tab/group/route state, MRU tab ordering, "Đang dùng cho bệnh nhân" quick-access grid |
| 7 | Flexibility and Efficiency | 4 | Auto-select-when-one-match, cross-tab search, letter-jump index |
| 8 | Aesthetic and Minimalist Design | 3 | Density is a defensible domain tradeoff, but `DisclaimerBar` claims fixed above-the-fold space on every visit |
| 9 | Error Recovery | 4 | Explicit "coi như CHƯA NHẬP" messaging names exactly what was ignored and why |
| 10 | Help and Documentation | 3 | No manual, but contextual "chưa đối chiếu tài liệu gốc" strings substitute appropriately for a bedside tool |
| **Total** | | **34/40** | **Good** |

Trend for this slug (last 5 runs): 28 → 36 → 31 → 34 → 36 → **34** (out of 40, all runs). This run scores in the same healthy band as recent history; not a regression, but not the peak (36) either — the two P1s below are the gap.

## Design Specificity Verdict

**LLM assessment**: Not a generic "list + search" screen. The code is saturated with clinically-specific behavior no template would produce: severity-tinted running-drug entries that preserve a "GẤP N LẦN" danger signal into the handoff view, staleness detection that distinguishes *time elapsed* from *weight changed since pin* with different copy for infusion vs. intermittent dosing, a CrCl block that shows "—" rather than a technically-correct-but-clinically-wrong number when unusable, and a Y-site/interaction compatibility matrix with per-pair "verified vs. not yet reconciled" provenance. The extensive in-line Vietnamese commentary documenting prior `/impeccable` critique rounds confirms this screen has been iterated against real clinical-stakes feedback repeatedly, not shipped once and forgotten.

**Deterministic scan**: CLI `detect.mjs --json src/App.tsx` returned exit code 2 with exactly **one** finding for the entire 12,000-line file — an undocumented `#000` color at line 983, inside `SpecialtyPicker`, outside DungThuocScreen's scope entirely. **Zero CLI findings inside DungThuocScreen or its sub-components** (RunningPanel, ScreenHeader, PatientPanel, AntibioticsScreen, SearchField, DisclaimerBar).

**Visual overlays**: Browser-injected `detect.js` at `/?screen=mixing` found 10 anti-patterns page-wide: 2 `layout-transition` warnings, 2 `cramped-padding` (a flex div and a zero-vertical-padding button), 5 `undersized-ui-text` (10px labels — "Trang chủ", "Thư viện", "Hướng dẫn", "Mindmap", "Thẻ ghi nhớ"), and 1 `overused-font` (Plus Jakarta Sans = 98% of visible text, page-level). **Scope caveat**: the 5 undersized-text findings are all on the **global bottom nav bar**, not inside DungThuocScreen's own component tree — visible while this screen renders, but shared chrome, not this screen's defect. The `overused-font` finding is a false positive for this brief: DESIGN.md documents Plus Jakarta Sans as the deliberate single body typeface, with JetBrains Mono/Source Serif/Space Grotesk reserved for specific semantic roles (dose numerals, mindmap) — a 98% share is the intended outcome of that system, not drift. No live screenshot was captured this session (background-tab limitation), so the overlay claims rest on console findings + DOM measurement, not a rendered image.

One measurement Assessment B surfaced that Assessment A didn't have visibility into: **at 375px width, the active category tab measures 35px tall vs. 44px for all 9 inactive tabs** — a real, measured tap-target regression on the one tab a clinician has just tapped and may tap again. Folded into Priority Issues below as new P2.

## Overall Impression

This is a screen built by someone who has been paged at 2am and remembered it. The defensive input handling, staleness detection, and destructive-action grammar are unusually mature for what the codebase itself frames as a solo-developer personal tool. The gap between this run's 34/40 and its own recent peak of 36/40 comes down to two concrete, fixable inconsistencies — not a fundamental design problem — plus one newly-measured mobile tap-target regression the last several critique rounds didn't catch because none of them measured rendered tab heights directly.

## What's Working

1. **Severity travels with the data.** A dose flagged high/extreme at pin-time keeps its danger styling in the handoff/compatibility table (RunningPanel) — the exact place a dangerous number must not visually regress to "normal," matching the app's own protected-hazard-signal rule in DESIGN.md.
2. **Staleness detection is state-aware, not just time-aware.** It distinguishes "cân nặng đã đổi" from "đã lâu" and phrases each differently for infusion vs. intermittent dosing — a real clinical distinction most apps would collapse into one generic banner.
3. **Consistent destructive-action grammar.** Double-tap → visible drain-bar countdown → timed undo, applied identically to patient reset and unpin, sharing one visual vocabulary so clinicians only learn the pattern once.

## Priority Issues

**[P1] Tab switch doesn't reset shared scroll position**
- **Why it matters**: `scrollRef` wraps DisclaimerBar + PatientPanel + RunningPanel + tab content as one continuous scroller. `setTab(t.id)` on tab click (line 11078) never touches `scrollRef.current.scrollTop` — confirmed by reading the click handler directly; the only place `scrollTo({top:0})` fires is `openPatientPanel` (line 10911), unrelated to tab switching. A clinician who scrolled deep into a long antibiotic list, then taps "Vận mạch," lands mid-scroll in a shorter tab's content, potentially past the patient panel, with no visual cue why the screen looks wrong. This is exactly the fast-repeated-tab-hopping failure mode a night-shift power user hits hardest.
- **Fix**: On tab-button click, scroll `scrollRef.current` to top (or the tab content's top) alongside `setTab`.
- **Suggested command**: `/impeccable harden`

**[P1] Creatinine has no magnitude plausibility check**
- **Why it matters**: `checkWeight`/`checkHeight`/`checkAge` (imported from `lib/doseSafety`, used at lines 5452-5454) all return a three-tier `ok`/`check`/`implausible` severity. Creatinine (`patient.scr`) only gets `hasInvalidNumericInput` — confirmed by grep: no `checkScr` exists anywhere in the file. A typo like "0.1" instead of "1.0" mg/dL silently produces an inflated CrCl with `crclUsable = true` and no warning, feeding straight into antibiotic dose-tier selection — while the identical typo class on weight, height, or age surfaces a visible caution banner. This is the one visible asymmetry in an otherwise unusually defensive input-validation system, and it sits on the exact field most likely to silently corrupt a renal dosing decision.
- **Fix**: Add a `checkScr` plausibility range (e.g. 0.1–20 mg/dL) mirroring the existing `checkWeight`/`checkHeight`/`checkAge` pattern in `lib/doseSafety`.
- **Suggested command**: `/impeccable harden`

**[P2] Active category tab shrinks to 35px tall on mobile (measured, not visual-only)**
- **Why it matters**: Direct DOM measurement at 375px width found the active tab ("Kháng sinh") at 35px height vs. 44px for all 9 inactive tabs — below the 44×44pt minimum touch target this same critique's own persona checklist requires, and it's specifically the tab the clinician has just landed on and may need to re-tap or that sits adjacent to the next tap.
- **Fix**: Normalize active/inactive tab height in the `CHIP` class or its active-state override so selection state doesn't change hit-target size.
- **Suggested command**: `/impeccable audit` (to confirm no other selected-state size deltas exist elsewhere) then `/impeccable harden`

**[P2] DisclaimerBar has a fixed, non-dismissible slot on every visit**
- **Why it matters**: `<DisclaimerBar />` renders unconditionally at the top of the scroll region, above PatientPanel and RunningPanel, on every visit. On a screen whose own design doc explicitly justifies high density as a domain necessity, a static legal-boilerplate strip permanently claims prime above-the-fold space that could go to the patient summary or running-drug table — the two panels this screen exists to surface fast.
- **Fix**: Collapse it after first acknowledgment per session, or fold its text into the existing `DisclaimerGate` ack flow instead of repeating it as a persistent strip.
- **Suggested command**: `/impeccable distill`

**[P2] Interruption-tolerance mismatch between the two destructive-undo windows**
- **Why it matters**: `CONFIRM_DELETE_RESET_MS = 5000` (RunningPanel unpin) vs. `CONFIRM_PATIENT_RESET_MS = 20_000` (patient reset). The comment at PatientPanel explicitly reasons about surviving "a call/alarm interruption mid-shift" to justify the 20s window, but that same reasoning isn't applied to the 5s unpin window — even though unpinning silently drops Y-site/interaction coverage for that drug.
- **Fix**: Either lengthen `CONFIRM_DELETE_RESET_MS` or add a comment documenting why unpin genuinely warrants a shorter window than patient reset.
- **Suggested command**: `/impeccable harden`

**[P3] Global search results use a non-standard accessibility pattern**
- **Why it matters**: The cross-tab search dropdown is `role="group"` with manual `ArrowUp`/`ArrowDown` handling on plain `<button>` children, rather than `role="listbox"`/`option` or a combobox pattern — works for sighted/mouse and roughly for keyboard, but doesn't announce as a selectable list to a screen reader.
- **Fix**: Migrate to `role="listbox"` + `aria-activedescendant`, or explicitly accept and document the deviation.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**Alex (Power User, dozens of lookups per shift)**: Tab-switch scroll retention (P1 above) directly costs the muscle-memory speed this persona depends on. `orderedTabs` also freezes for a fixed window then silently reshuffles by MRU — Alex's spatial memory for "Vận mạch is third from the left" can be invalidated mid-shift with no visual signal that reordering happened.

**Riley (Stress Tester — typos, extreme values)**: The creatinine magnitude gap (P1 above) is the standout finding — `parseStrictNumber`/`hasInvalidNumericInput` correctly guard against garbage input everywhere else, but the one field driving antibiotic dose-tier selection most directly doesn't get the implausibility guard weight/height/age already have. Everything else Riley would try (non-numeric weight, empty patient state) is well-covered.

**Casey (Distracted Mobile User, thumb-only, interrupted mid-flow)**: The 35px active-tab tap target (P2 above) hits this persona hardest — thumb taps on a shrunk, just-selected target are the easiest to mis-tap. The 5s unpin window (P2 above) is also short relative to the interruption model the codebase's own comments argue for elsewhere on this exact screen.

## Minor Observations

- "Xem tất cả" in the antibiotic group chooser has no reverse toggle to re-collapse within the same session.
- The inline "Tìm" search panel has no explicit close/X — dismissing it requires retapping the same pill that opened it.
- Letter-jump index in AntibioticsScreen only appears after "Xem tất cả" — correct per the code's own reasoning (order isn't alphabetical before that), but easy to miss as a deliberate decision on a quick skim.
- The `overused-font` detector flag (98% Plus Jakarta Sans) is a false positive against this brief — DESIGN.md documents that as the intended single body typeface with other fonts reserved for specific semantic roles.

## Questions to Consider

- What if the MRU tab-order freeze were replaced with a "move at most one position per session" rule, so Alex's spatial memory degrades gracefully instead of resetting all at once when the freeze window expires?
- What if creatinine got the same three-tier `ok`/`check`/`implausible` treatment weight/height/age already have — closing the one visible asymmetry in an otherwise unusually defensive input-validation system?
- What if the shared scroll region simply reset to top on tab switch, matching the care already given to the search-jump flow's scroll-into-view behavior?
