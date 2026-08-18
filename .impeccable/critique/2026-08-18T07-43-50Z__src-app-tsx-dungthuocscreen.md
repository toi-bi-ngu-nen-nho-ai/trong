---
target: "DungThuocScreen (src/App.tsx:10545-11032)"
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-18T07-43-50Z
slug: src-app-tsx-dungthuocscreen
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Excellent instrumentation (aria-live CrCl, pop-in count, confirm-drain countdowns, dual staleness clocks) — but the staleness nudge itself reports the wrong thing for intermittent drugs (see P1 below) |
| 2 | Match System / Real World | 4 | Deeply idiomatic Vietnamese clinical language throughout; CrCl/TTM/mg·kg⁻¹·phút⁻¹ conventions match how clinicians actually think |
| 3 | User Control and Freedom | 3 | 20s undo on patient reset, 5s "Hoàn tác" on unpin, two-step confirm everywhere destructive — but no bulk clear for multiple stale/finished items at once |
| 4 | Consistency and Standards | 4 | Confirm-copy pattern explicitly unified across ConfirmIconButton/"Xoá bệnh nhân" (traceable to a dated prior critique fix); token system enforced app-wide |
| 5 | Error Prevention | 4 | parseStrictNumber rejects "70abc" instead of silently truncating; disease-first gating blocks "generic dose used for wrong indication" |
| 6 | Recognition Rather Than Recall | 3 | Nothing hidden behind icon-only affordances; alphabet jump + sticky state — but SearchField's only accessible name is its placeholder (verified live in the a11y tree), which disappears once typed |
| 7 | Flexibility and Efficiency of Use | 3 | PWA quick-launch bypasses Home, per-tab sticky selection, auto-select on unique match — genuine accelerators, but no bulk actions |
| 8 | Aesthetic and Minimalist Design | 4 | Progressive disclosure (Disclosure component) is the load-bearing device for real domain density; flat cards, disciplined color |
| 9 | Help Recognize/Diagnose/Recover from Errors | 3 | Inline warnings are specific and near-source ("Cân nặng 'x' có ký tự không phải số") — but the intermittent-drug staleness message misdiagnoses what to check |
| 10 | Help and Documentation | 3 | Per-drug source/verification-date citation (SourceLine) functions as embedded documentation; no searchable glossary for renal-mode abbreviations, acceptable given the clinician audience |
| **Total** | | **34/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: This reads as authored specifically for a clinician working a shift, not a generic "medical calculator" template. The clearest evidence: `RunningDrug.kind` treats intermittent antibiotic dosing and continuous IV infusion as genuinely different mental models (different badge, different dose-text shape, a code comment stating outright that calling an intermittent dose "đang truyền" would be a category error) — a generic dosing-calculator template would flatten both into "current medications" with a rate field. The patient-context panel shared across all 10 tabs, the sticky per-tab selection state, and the PWA quick-launch shortcut straight into this screen are all decisions that trace directly back to the stated usage context (one-handed, interrupted, at the bedside) rather than to category convention. The screen also visibly carries the scar tissue of several already-closed critique cycles — comments citing specific dated P0–P3 findings next to their fixes — which is unusual discipline and argues against "looks templated."

**Deterministic scan**: `detect.mjs --json src/App.tsx` returned exit code 2 with exactly one finding total, and it falls outside DungThuocScreen (`design-system-color`, an undocumented `#000` at src/App.tsx:982). Zero in-scope static findings. The live browser detector (injected into the running app, not a static scan) found more: 14 anti-patterns on the antibiotics tab (6× `layout-transition`, 3× `cramped-padding`, 5× `undersized-ui-text`) and 17 on an infusion tab (adds 3× `clipped-overflow-container`). Cross-checked against source and the design system:
- The 5 `undersized-ui-text` hits are the global bottom-nav labels (src/App.tsx:11086-11090) — outside DungThuocScreen, and DESIGN.md documents the 10px nav-label size as a deliberate, contrast-checked constraint, not an oversight.
- The 6 `layout-transition` hits match `.disc-body`'s `max-height` transition (src/index.css:657-684), used by the in-scope `Disclosure` component. Source comments (App.tsx:5103-5147) show this is a previously-litigated choice — `grid-template-rows 0fr/1fr` was tried and reverted after reproducing a real stuck-UI bug — with an existing `prefers-reduced-motion` fallback. Not a defect; a confirmed trade-off.
- The 3 `cramped-padding` and 3 `clipped-overflow-container` hits could not be attributed to exact source lines by either assessment (the injected detector's scan globals self-delete after logging, blocking a second-pass fiber walk). Reported as an open item below, not asserted as real — see Priority Issue P2 (detector attribution gap).

**Visual overlays**: Script injection succeeded and the detector ran live in the real app (not a static/blank page) — but the Browser pane itself was never opened/visible to the user during this session (screenshot calls returned "pane not displayed" both times attempted), so there is no live visual overlay to point to. All findings above are reported as data/console output, not a `[Human]`-tab overlay.

## Overall Impression

This is a genuinely mature screen — the product of several already-closed critique cycles, and it shows in exactly the places that matter most (destructive-action confirmation, patient-context persistence, disease-gated dosing). The single biggest opportunity left is less about individual polish and more about one recurring pattern: two places (the staleness nudge, and to a lesser extent the search field's accessible name) treat all running drugs / all form fields as interchangeable when the app's own domain model already knows they aren't. The fix in both cases is "finish applying a distinction the code already makes," not "invent a new one."

## What's Working

1. **The intermittent-vs-continuous distinction is real, not cosmetic.** `RunningDrug.kind`, the "ngắt quãng" badge, and dose text that omits a fabricated rate for intermittent drugs all point at one clinical fact: a q8h antibiotic and a titrating vasopressor are different kinds of "running." Generic dosing-calculator templates collapse this into one list with a rate column; this one didn't.
2. **The feedback loop is visibly closing.** Nearly every non-trivial interaction pattern on this screen (confirm-copy consistency, the antibiotic alphabet-jump bar, the CrCl-reset "hoàn tác" window) is commented with a direct citation back to a dated prior critique finding it fixed. That's a rare discipline to find in a codebase.
3. **Patient-context persistence removes the single highest-frequency failure mode for the stated usage pattern.** Getting pulled away mid-lookup is a near-certainty at the bedside; sticky per-tab state plus a shared patient panel means the clinician returns to exactly where they left off across all 10 tabs, with nothing to re-enter.

## Priority Issues

**[P1] The staleness nudge tells clinicians to check the wrong thing for intermittent drugs**
- **What**: `staleReason()` (src/App.tsx:5919-5925) always emits "Ghim đã lâu — đối chiếu lại với bơm thật" ("pinned a while ago — cross-check against the real pump") once `STALE_AFTER_MS` (4h) passes, for every running drug — it never branches on `RunningDrug.kind`.
- **Why it matters**: For an intermittent antibiotic (the pinned Vancomycin, q8-12h) there is no pump running 5 hours after it finished infusing — the message describes a device state that doesn't exist for this drug. The code's own doc comment on `kind` (src/lib/runningDrugs.ts:31-32) already states explicitly that treating an intermittent dose as "currently infusing" is a known category error — this specific message reintroduces exactly that error in one place while the rest of the RunningPanel correctly avoids it. A clinician reading this on a finished antibiotic dose either gets confused about what to actually check, or learns to dismiss the nudge as noise — right when the real, useful question ("is a repeat dose now due?") goes unasked.
- **Fix**: Branch the message on `r.kind`. Continuous infusions keep "đối chiếu lại với bơm thật"; intermittent drugs get something like "Liều gần nhất đã lâu — còn đúng lịch dùng không?"
- **Suggested command**: `/impeccable clarify`

**[P2] Search field has no accessible name once the clinician starts typing**
- **What**: `SearchField` (src/App.tsx:5025-5050) has no `<label>` or `aria-label` — confirmed live in the mobile accessibility tree that its only exposed name is the `placeholder` text ("Tìm kháng sinh..."), which disappears the moment text is entered.
- **Why it matters**: Every other input on this screen (`PatientField`-wrapped weight/height/age/creatinine) has a persistent, real label. This is the one exception, and it's the field a screen-reader user relies on to jump straight to a drug by name rather than tabbing through 20+ chips.
- **Fix**: Add `aria-label={placeholder}` (or a fixed label like "Tìm thuốc").
- **Suggested command**: `/impeccable audit`

**[P2] Two detector findings on the infusion tab (`cramped-padding` ×3, `clipped-overflow-container` ×3) couldn't be attributed to source**
- **What**: The live browser detector flagged these on the infusion-tab view but exposed no file:line (its scan globals self-delete after the console log), and static grep couldn't confirm which in-scope component they belong to.
- **Why it matters**: They may be false positives from the app's own documented `position: fixed; inset: 0` shell technique (DESIGN.md notes this is deliberate, done to fix an iOS PWA `100dvh` gap) — or they may be real. Neither assessment could tell.
- **Fix**: A dedicated inspection pass with fiber/DOM access (not a one-shot console injection) to get exact locations before deciding whether anything needs to change.
- **Suggested command**: `/impeccable audit`

**[P2] The antibiotics list shows up to 22 chips (across 11 alphabet groups) before any narrowing**
- **What**: When no group is selected and no query is typed, `AntibioticsScreen` (src/App.tsx:8567-8592) renders all 22 antibiotic-name chips at once.
- **Why it matters**: Fails the cognitive-load "≤4 visible options at a decision point" guideline on first look. Well-mitigated by the search field and the alphabet-jump bar (both themselves prior critique fixes) and by this being a "browse a known catalog" task rather than a decision under pressure — but for a first-open or unfamiliar user it's still a wall of options before any scaffolding kicks in.
- **Fix**: Consider defaulting to a collapsed "gần đây / hay dùng" (recent/frequent) subset with an explicit "xem tất cả" expand — mirroring the tab-order MRU pattern this same screen already uses one level up.
- **Suggested command**: `/impeccable layout`

**[P3] "Xoá bệnh nhân" sits outside the one-handed thumb zone**
- **What**: The screen's most destructive control lives in `PatientPanel`'s always-visible header row (src/App.tsx:5490-5544), which is the first scrollable content below the header/tabs — i.e., near the top of the screen.
- **Why it matters**: For a clinician holding the phone one-handed at the bedside, top-of-screen is the hardest zone to reach with a thumb. This may well be intentional (destructive actions placed away from casual reach, and it's already behind a two-step confirm + 20s undo), but it isn't stated anywhere as a deliberate trade-off the way the `Disclosure` max-height choice is.
- **Fix**: None required — worth a one-line decision (keep it top-placed on purpose, or move it) so a future contributor doesn't "fix" it into the thumb zone by accident.
- **Suggested command**: none (design question, see below)

## Persona Red Flags

**Casey (distracted, one-handed, interrupted at the bedside)**
- "Xoá bệnh nhân" sits above the thumb zone (see P3 above) — a real reach, not a tap, on a one-handed hold.
- Opening "Tìm" auto-focuses the input, which raises the OS keyboard on a real device; combined with the alphabet-jump row sitting just below the search field, it's worth confirming on an actual small phone that the jump row isn't pushed under the keyboard — this environment couldn't verify real on-device keyboard-overlay behavior, so flagging as untested rather than confirmed broken.
- Positive: sticky per-tab state means an interruption mid-lookup costs nothing to recover from — no explicit save step, nothing to re-enter.

**Sam (screen-reader / keyboard-only)**
- Confirmed: `SearchField`'s only accessible name is its placeholder (P2 above) — the one input on this screen without a persistent label.
- The 11 alphabet-jump buttons ("Nhảy tới chữ A"..."V") sit in Tab order before the actual drug chips — a sighted user's eye skips this row in an instant, but a keyboard/AT user pays 11 extra stops on every visit to this tab. Worth confirming this doesn't meaningfully slow down repeat use.
- Positive: `aria-live="polite"` + `aria-atomic="true"` on the CrCl result, `inert` correctly applied to background content while `DisclaimerGate` is open, and real `<label>` elements via `PatientField` show accessibility was actually implemented, not assumed.

**Alex (repeat power user, every shift)**
- Positive: PWA quick-launch, sticky per-tab selection, and auto-select-on-unique-match are genuine accelerators aimed exactly at Alex's repeat-use pattern.
- Clearing multiple finished/stale running drugs at shift handoff requires N separate two-step confirm sequences — no bulk "clear stale items" action, even though `staleReason()` already computes exactly which ones qualify.

## Minor Observations

- The "Vẫn đúng" (still-correct) dismiss buttons on the stale-patient/stale-renal banners write a field's *current* value back to itself purely to bump its timestamp (`setPatientField("weight", patient.weight)`). This works correctly — `setField` unconditionally stamps `updatedAt` — but it's a non-obvious technique that would silently break if `setField` were ever changed to skip no-op writes.
- The app deliberately remaps Tailwind's `slate-*` palette to the `--c-*` design tokens app-wide (src/index.css:356-368), so the ~11 in-scope `text-slate-*` call sites (DisclaimerGate, PatientPanel summary, RunningPanel labels, CalcLogSheet) are NOT the token-bypass violation they'd appear to be reading source in isolation — verified live that dark-mode contrast on these elements is fine (e.g. 16.9:1 on the CalcLogSheet title). Worth knowing before "fixing" them into `C.*` unnecessarily.
- Empty-search states ("Không tìm thấy kháng sinh phù hợp." / "Không tìm thấy thuốc phù hợp.") don't point at the one recovery action that's already visible right below them ("Thêm kháng sinh tự nhập").

## Questions to Consider

- "Intermittent" drugs already get their own badge and their own dose-text shape — should they get their own staleness *clock* too (tied to the dosing interval, e.g. q8h), not just different copy?
- Is "Xoá bệnh nhân" top-placed on purpose (anti-accidental-tap) or just where `PatientPanel`'s header happened to land? Worth a one-line decision either way.
- The antibiotics tab earned an alphabet-jump bar at 22 items — is there a count where an infusion category (currently maxing out at 9, in "Khác") would earn the same treatment, or is that intentionally antibiotics-only?
