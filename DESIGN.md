---
name: Bác sĩ Trọng
description: Thư viện kiến thức lâm sàng cá nhân — tra cứu bệnh học, liều thuốc theo CrCl/cân nặng, sơ đồ tư duy, thẻ ghi nhớ
colors:
  primary: "#1E96EB"
  primary-strong: "#1979be"
  primary-deep: "#135c90"
  primary-soft: "#edf3f7"
  primary-line: "#c2ddf0"
  primary-line-2: "#9ac6e6"
  on-primary: "#121212"
  accent-2: "#b8196f"
  danger: "#b91c1c"
  danger-icon: "#dc2626"
  danger-soft: "#fef2f2"
  warn: "#92400e"
  warn-icon: "#b45309"
  warn-soft: "#fffbeb"
  green: "#15803d"
  green-soft: "#f0fdf4"
  surface: "#ffffff"
  surface-alt: "#eeeeee"
  note: "#faf3e4"
  page: "#f4f4f5"
  text: "#121212"
  text-muted: "#757478"
  line: "#e3e2e4"
  line-soft: "#ececee"
typography:
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Plus Jakarta Sans"
    fontWeight: 700
  mono-dose:
    fontFamily: "JetBrains Mono"
    fontWeight: 600
  mindmap-emphasis:
    fontFamily: "Source Serif 4"
    fontWeight: 600
  mindmap-heading:
    fontFamily: "Space Grotesk"
    fontWeight: 600
rounded:
  sm: "14px"
  pill: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "var(--c-on-bright)"
    rounded: "{rounded.pill}"
  tab-chip-active:
    backgroundColor: "{colors.primary}"
    textColor: "var(--c-on-bright)"
    rounded: "{rounded.pill}"
  tab-chip-inactive:
    backgroundColor: "{colors.line-soft}"
    textColor: "var(--c-text-soft)"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  filter-chip-inactive:
    backgroundColor: "transparent"
    textColor: "var(--c-text-muted)"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  checkbox:
    backgroundColor: "{colors.surface}"
    textColor: "var(--c-on-bright)"
    rounded: "5px"
    size: "18px"
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "var(--c-on-bright)"
    rounded: "5px"
    size: "18px"
---

# Design System: Bác sĩ Trọng

## Overview

**Creative North Star: "The Bedside Precision Panel" — now in AFFiNE Blue**

Every screen exists to answer one question fast and correctly, then get out of the way. The system is token-driven end to end — every color in the app reads from a `--c-*` CSS custom property, never a hardcoded hex — so a single palette swap recolors the entire product without touching component code. That architecture is itself a design principle: it makes the system honest about what's decoration and what's load-bearing. It's also what made both rebrands (2026-08, Deep Azure → Electric Indigo; 2026-09, Electric Indigo → AFFiNE Blue) token-file changes rather than component-by-component rewrites.

The palette is **AFFiNE Blue** (`#1E96EB` light / `#1C9EE4` dark) — the second rebrand of this app, replacing the 2026-08 Electric Indigo identity (which itself replaced an earlier Deep Azure, which replaced an original teal). This time the primary hue and the entire neutral gray scale were pulled directly from AFFiNE's own theme tokens (the same design system the vendored BlockSuite canvas already runs on), specifically so the app chrome and the board canvas finally read as one blue instead of two adjacent-but-different brand colors. The system deliberately draws a hard line between two zones: **decoration** (navigation, tabs, cards, screen transitions) and **diagnosis** (dose numbers, safety-tier colors, warning language). Delight — spring/bounce motion, a livelier accent color — lives entirely in the first zone. The second zone is untouchable: red always means danger, amber always means caution, and neither one bounces, glows, or competes with a decorative accent for attention. This isn't timidity; it's the system's one non-negotiable rule, confirmed directly against real clinical stakes rather than assumed, and it survived both rebrands untouched — the original reason indigo was chosen over a green/teal candidate (and the reason AFFiNE's blue was acceptable as its successor) was to keep the brand hue maximally distinct from all three safety hues, not just red and amber.

Night-shift use is a first-class constraint, not an afterthought: dark mode is not a lightened/darkened mirror of light mode — it's an independently authored identity, not a mechanical inversion of light mode, so light and dark read as two confident executions of one brand. As of the 2026-09 rebrand this identity is deliberately *less* extreme than before: surfaces moved from a near-OLED-black indigo tint to AFFiNE's own dark gray (`#141414`/`#252525`) — noticeably lighter than the old near-black, a tradeoff the owner accepted in exchange for matching AFFiNE's real palette. The reason dark mode exists hasn't changed — clinicians often leave their phone in light mode system-wide but need this one app dark at 2am in a darkened room — only how dark "dark" needs to be. Both themes are independently contrast-verified (WCAG AA, most pairs well past AAA), and a manual in-app override beats the OS preference.

**Key Characteristics:**
- Every color is a CSS custom property; there are no hardcoded hex values in components.
- Danger/warning/success semantics are colorblind-safe (never color-only) and are a separate, protected token family from the primary brand color — unchanged across both the 2026-08 and 2026-09 rebrands.
- Motion answers a specific question ("did my tap register," "did this number change," "did this action finish") — never pure decoration, with one exception zone (nav/tabs/cards) that now also carries brand personality.
- Both light and dark mode are independently authored and contrast-verified, not generated by inverting one palette — and now deliberately *not* the same lightness relationship either (dark is darker and more saturated-glow than a simple light-mode inversion would produce).

## Colors

The palette reads as one confident, cool-blue system: AFFiNE Blue as the single brand color, a true neutral gray (hue=0, 0% saturation) for every surface and border, and a fully separate, untouched hazard-signal family for clinical safety states.

### Primary
- **AFFiNE Blue** (`#1E96EB` light mode / `#1C9EE4` dark mode): the app's one brand color, taken directly from AFFiNE's own `--drt-brand-color` token rather than a bespoke tint. Used for solid fills, borders, and focus rings (primary buttons, active tab/chip fills, the checkbox check, `--ring`) — anywhere the WCAG non-text 3:1 floor applies, not the 4.5:1 text floor. That distinction matters here in a way it didn't for the old indigo: `#1E96EB` alone only clears **3.17:1** on `--c-surface`, so it is *not* safe as body-sized text or icon color on a light surface — see `--c-primary-strong` below. In dark mode `#1C9EE4` clears **6.19:1** on `--c-page`, comfortably past AA on its own, so light and dark are treated differently for this one reason (not because the brand hue itself differs — it's nearly the same blue in both themes, unlike the old indigo's light/dark split of `#2d3a94`/`#6ea8fe`).
- **Primary Strong** (`#1979be` light / `#36a9e7` dark): the text/icon-safe tier — 4.65:1 on `--c-surface` in light mode. Every tab label, link, and small primary-colored icon on a light surface must use this instead of raw `--c-primary`; the fill of a button or chip still uses full-strength `--c-primary`. (On `--c-page` rather than a card, `-strong` itself drops to 4.23:1 — see Primary Deep.) In dark mode `-strong` isn't an AA fix — base `--c-primary` already clears AA there — it's simply a brighter emphasis step above the base.
- **Primary Deep** (`#135c90` light / `#76c5ef` dark): the highest-emphasis tier, 7.09:1 on `--c-surface` — used where `-strong` still isn't enough, e.g. primary-colored text sitting directly on `--c-page`.
- **Primary Soft** (`#edf3f7` light / `#112d3b` dark): background tint for icon badges and secondary surfaces that want to feel "in the brand" without full-strength color.
- **Primary Line** (`#c2ddf0` light / `#225977` dark): border/accent-line weight, one step down from full-strength primary. **Primary Line 2** (`#9ac6e6` light / `#2c749b` dark) is one step further still — same hue, one HSL-lightness step darker (light) / lighter (dark) than `-line`.
- **On Primary** (`--c-on-primary`, `#121212`, fixed in both themes — does not flip like `--c-on-bright`): the ink for text/icons drawn on a *solid* `--c-primary` fill (a primary button's label, an active tab chip's text). White text on `#1E96EB` only reaches 3.17:1, so this rebrand moved that ink to dark instead of white; because the new primary is nearly the same blue in both themes, a single dark value clears AA everywhere (5.90:1 light, 6.30:1 dark) without needing the per-theme flip `--c-on-bright` uses elsewhere.

### Secondary
- **Mindmap Magenta** (`#b8196f` light / `#f175a6` dark): a second hue reserved exclusively for the Mindmap **canvas** (region highlights, lasso selection) and the transient undo toast. **The One Other Place Rule.** This color appears nowhere outside the Mindmap board — not in the dosing screens, not in navigation — specifically so it never competes with the hazard-signal palette for visual priority. Unchanged by either the 2026-08 or 2026-09 rebrand.

  **The scope is the canvas, not the whole Mindmap tab (tightened 2026-09-04).** Board Gallery's list-management chrome — the "Đã xoá gần đây" tray, the specialty filter strip — had drifted into magenta, and two independent failures came out of it. **(a) Repetition kills an accent.** With four deleted boards the tray showed five magenta labels ("Hoàn tác" ×4 + "Chọn tất cả") as its brightest ink while the *board names*, the thing you must read to pick the right row, sat in `--c-text-muted` — the reading order was inverted by the accent. A hue used N times per screen is not an accent, it is the body color. **(b) It landed next to a hazard signal.** In the bulk-action strip, magenta "Khôi phục" sat 4px from `--c-danger` "Xoá vĩnh viễn"; measured ΔE(CIE76) = 26 between `#f175a6` and `#ff8585` — two pinks at 12px, one restoring and one destroying permanently. That is the exact adjacency the indigo-over-teal brand decision exists to prevent. Both were repaired by removing magenta from the tray entirely: **in a bulk-action strip the only colored action is the destructive one.** Magenta lost nothing — it is the color of the drawing surface, and a list-management tray is not one.

### Neutral
- **Cool Paper** (`#ffffff` surface / `#f4f4f5` page, light mode): a true neutral gray (hue=0, 0% saturation), taken directly from AFFiNE's own light background scale, so white cards visibly lift off a faintly-gray page background without needing a border or shadow. As of the 2026-09 rebrand this neutral no longer carries any brand-hue tint — earlier it rode the same cool-violet family as Electric Indigo; now `--c-primary` is the only token in the system that carries color, and surface/page/border are pure gray.
- **Night Glass** (`#252525` surface / `#141414` page, dark mode): AFFiNE's own dark gray scale, independently tuned — text/background pairs were re-measured for AA rather than assumed to transfer. **This is a deliberate step back from the previous near-OLED-black identity** (`#14162c`/`#0b0c1c`, 2026-08): the owner was warned the new values would land noticeably lighter and chose to match AFFiNE's real dark palette anyway, so the app chrome and the BlockSuite canvas finally share one true dark gray instead of two adjacent-but-different blacks. The reason dark mode exists hasn't changed — this is still a night-shift app and a clinician opening it in a darkened room shouldn't be hit with a bright screen — this palette is simply less extreme about how dark "dark" needs to be than the 2026-08 identity was.
- **Note Paper** (`--c-note`, `#fbfaf7` light / `#efece3` dark, both near-white — the paper does not theme-swap to dark): reserved exclusively for the Mindmap board-card surface (`.mind-note-card`, `DanhSachBang.tsx`) — same "One Other Place Rule" as Mindmap Magenta above, scoped to material rather than hue. Revised 2026-08-26 from a second, more literal user-supplied reference (a white sticky note, curled bottom-left corner, drop shadow, pinned by a round-head pin): the card now carries a real `box-shadow` and a curled-corner pseudo-element (`.mind-note-card::before`) to read as a physical object lifted off the page. This is a deliberate, scoped exception to the Floating-Layer-Only Rule below — the Mindmap surface brief calls for literal material realism, so its resting cards are allowed a permanent shadow that the rest of the app's resting cards are not. `--c-note-shadow` uses **one 3-slot recipe shared across both themes** (ambient drop, contact drop, 1px edge) with identical offsets/blur — only the third slot flips role: a faint dark hairline in light (paper edge on a light ground), a faint warm rim in dark (paper edge catching light on the near-black ground, since a black drop shadow is invisible on `#0b0c1c`). Same object, two grounds — not an inverted filter and not two different effects (revised 2026-08-30 after "shadow/clip/curl differ a lot dark≠light"; the earlier dark-only 4th spread ring was dropped for cluttering the curl). The board grid behind these cards sits on the plain themed `--c-surface`, same as every other screen (a cork/desk-textured ground was tried 2026-08-28 and pulled back by the owner — the note cards carry the material load on their own). The **"+" new-board tile** (`.mind-o-tao-bang.mind-o-moi`) deliberately does *not* wear the paper material: it is a **dashed 1px border (short dashes) over a faint `--c-accent-2` wash (~0.05 alpha)** so it reads as an empty "create" slot that recedes behind the real cards. Owner preference recorded 2026-08-30 (reverses a 2026-08-29 critique that had solidified the border) — the dashed "+ new" convention is widely legible here and is *not* a fixed rule; a future pass may revisit it, but not silently re-solidify it.

  **The paper material is create-only, and so is the dashed border (enforced 2026-09-04).** Two leaks were found and closed on the same screen. **(a) The material leaked.** The empty-search escape button ("Xoá bộ lọc") was wearing `.mind-o-tao-bang` — the class's own comment already said *"CHỈ ô này, KHÔNG áp cho nút Xoá bộ lọc"* while the code did the opposite. In dark mode this made a reset control render as a near-white cream slab, the highest-contrast object on the screen, inviting the one action the user had *not* asked for; worse, its `--c-accent-2` label on `--c-note` measured **2.27:1 — a hard AA failure**. It now uses `button-secondary` (see Components). **(b) The convention leaked.** The specialty filter's "Chuyên khoa" button had a dashed border, sitting under 40px from the dashed "+" tile — two unrelated meanings ("create a board" vs "open more filters") sharing one signal, which blurs both. Filter chips now use a single solid 1px `--c-line` outline; **a dashed border in this app means "make a new thing", nowhere else.**

### Specialty Identity Colors (a separate, non-token family)

Eleven fixed hex values in `src/data/specialties.ts` — one per clinical specialty (Tim mạch `#b13a34`, Hô hấp `#0079a8`, Tiêu hoá `#008030`, Thận học `#1468bf`, Nội tiết `#9f5300`, Thần kinh `#6f52b8`, Huyết học `#ad385f`, Nhiễm `#008248`, Cấp cứu `#b91c1c`, Sinh lý (bệnh) `#5b6470`, Dược lâm sàng `#7a6300`). They are **data, not design tokens**: they identify a domain the way a book spine color does, and they are the one place in the app where a color is not a `--c-*` custom property. That exception is deliberate and load-bearing — several call sites concatenate two alpha characters onto the hex (`${spec.color}15`), which only works on a hex literal, never on a `var()` reference.

The set is tuned as a set, not individually: all eleven sit at L≈52, C≈0.155–0.20 so no specialty visually outranks another in a list, and each clears 4.5:1 on the light page. Cấp cứu deliberately *is* `--c-danger`'s red (it **is** the emergency) while Tim mạch was pushed to a different hue so the two most-adjacent specialties don't blur together.

- **`--c-khoa-nang`** (`0%` light / `34%` dark) + **`--c-khoa-nang-toi`** (`#ffffff`): the one sanctioned bridge between this hex family and the theme system. The eleven values are tuned for a light ground, and the file itself records that a second dark set would mean touching ~15 call sites at high regression risk. Rather than that, any surface drawing a specialty color as a small graphic on a dark ground wraps it: `color-mix(in oklab, <hex>, var(--c-khoa-nang-toi) var(--c-khoa-nang))`. At 0% in light mode this is a no-op on the original value; at 34% in dark it lifts `#5b6470` and `#7a6300` off `#141414` (the current dark `--c-page`; `#14162c` before the 2026-09 rebrand), where a 7–8px dot in the raw hex all but disappears. **Narrow by design** — currently only the Board Gallery filter-chip dot and the specialty-picker dot. Do not widen it into a general "make hex work in dark" helper; the real fix remains a second authored palette.

### Accent — Favorite Gold
- **Favorite Gold** (`--c-fav` `#a16207` light / `#facc15` dark; `--c-fav-soft` `#fdf3d6` / `#2c2411`; `--c-fav-bright` `#facc15` both): the *only* warm hue in the app, scoped to one thing — the "pin this group to the front of the tab row" star toggle on `DungThuocScreen` (`icons.starPin`, used in two places: on the active tab chip, and in the search-panel jump list). Added 2026-09-03 at the owner's explicit direction ("the favorite star must be yellow"). A filled gold star is the universal favorite/bookmark affordance. **A deliberate, scoped exception to the cool-blue system** — same "One Other Place Rule" as Mindmap Magenta and Note Paper, scoped to a single ~14px glyph. It is **not** part of the `--c-warn*` family: the hue is pulled toward yellow-gold and away from clinical amber (`--c-warn-icon` `#b45309` rust / `#f0b429` orange-amber) so the two never read as the same signal, and it lives only in tab-row chrome, never on a dose or safety surface.

  **The saved design (2026-09-03, revised twice): the star is a bare glyph living inside the control that owns it — no background plate, no border, no pill/circle boundary, no separate press or hover effect. The ONLY thing that changes on toggle is the star glyph itself** (outline↔filled, colour, opacity). The owner rejected every version where the toggle read as its own button — a visible edge, a `dose-press` scale, anything that draws a line between it and the chip. It is two `<button>`s for correct semantics (select tab vs pin tab) but must look and feel like one chip with a star in its corner.
  - **On the active tab chip:** the star is an `absolute`, transparent icon button flush to the chip's right edge (the chip reserves `pr-10`), no `dose-press`, no visible focus plate. *On* = filled `--c-fav-bright`, **flat fill, no keyline / outer stroke of any kind** (owner call 2026-09-03 — "no border around the star"). `--c-fav-bright` is theme-aware so it always keeps a real luminance contrast against the chip's primary fill (which, under the pre-2026-09 indigo palette, inverted sharply between a dark chip in light mode and a light chip in dark mode): **light mode** `#facc15` bright lemon-gold (~7:1 measured against the pre-2026-09 chip); **dark mode** `#7e4f0c` deep amber-gold (~3.3:1, same caveat). *Note:* `--c-fav*` was explicitly left untouched by the 2026-09 primary rebrand, but the chip fill it sits on changed (`--c-primary` is now nearly the same AFFiNE Blue in both themes, not a light/dark-inverted indigo) — these two ratios haven't been re-measured against the new fill and shouldn't be assumed current without checking a real browser. *Off* = hollow (outline) star in `--c-on-bright` at `opacity: 0.5` — a faint "tap to pin" hint. Every cue is on the glyph, nothing on a container.
  - **In the search-panel jump list:** same bare-glyph treatment on the list's `--c-surface` row. *On* = filled `--c-fav` (theme-aware: dark gold on white in light mode clears 3:1, bright lemon-gold on near-black in dark mode), no stroke. *Off* = hollow `--c-text-soft` at `opacity: 0.5`.
  - Light mode's `--c-fav` is a dark gold on purpose: a bright yellow cannot clear 3:1 as a filled mark on a light ground. `--c-fav-soft` is retained as a token but no longer painted as a plate behind the star; keep it for any future "favorited" surface tint.

### Named Rules
**The Untouchable Signal Rule.** `--c-danger*`, `--c-warn*`, and `--c-green*` are a separate token family from `--c-primary*`/`--c-accent*` and are never restyled, retinted, or animated as part of a brand refresh — confirmed by surviving both the 2026-08 Azure→Indigo and the 2026-09 Indigo→AFFiNE-Blue rebrands completely unchanged, byte-for-byte. Red is always danger, amber is always caution, and neither one gets the bounce/pop/glow treatment the rest of the UI uses for delight — a flat, serious presentation at the exact moment a clinician needs to trust the color without a second thought. **Favorite Gold (`--c-fav`) is not part of this family** and not a signal — it is a scoped decorative accent (see above), kept chromatically distinct from clinical amber on purpose.

**The Decoration/Diagnosis Split Rule.** Delight (spring motion, brand color, glow, playful entrance animation) is scoped to navigation, tabs, cards, and screen transitions. Dose numbers, calculated results, and safety-tier text are typographically and chromatically calm by comparison — the loudest thing on a dosing screen is always the danger signal, never the brand. A calm "ok" dose result reads in `--c-text`, not `--c-primary` — brand color is chrome, not a stamp of approval on a clinical number.

## Typography

**Body Font:** Plus Jakarta Sans (with -apple-system, BlinkMacSystemFont, 'Segoe UI' fallback) — replaced Inter in the 2026-08 rebrand purely for visual identity (Inter reads as "internal tool"); kept the same reasoning Inter was originally chosen for — a geometric, highly legible grotesk with full Vietnamese diacritic support, weighted 300-800 — so the *reason* for the choice didn't change, only the typeface.
**Dose/Number Font:** JetBrains Mono — reserved for numeric doses and concentrations, where reading each digit correctly matters more than anywhere else on screen. **Untouched by the rebrand** — this is a clinical-safety choice, not an aesthetic one, and the two are deliberately kept independent.
**Mindmap-only Fonts:** Source Serif 4 (formal emphasis), Space Grotesk (headings/emphasis) — used exclusively inside Mindmap note formatting, never in the main app chrome.

**Character:** A confident, highly legible geometric sans for everything a clinician reads under time pressure, with monospace reserved as a signal: "this number is exact, read every character."

### Hierarchy
- **Title** (700, ~22px): screen headers, kept to one line — a second descriptive line was deliberately removed because it pushed content down without helping a rushed reader.
- **Body** (400/500, ~14-15px): drug names, descriptions, general reading text.
- **Label** (700, 10px): bottom nav labels — small enough that label color must independently clear AA 4.5:1 at that size, checked and documented as its own constraint.
- **Input/Dose** (16px minimum, forced via `input, textarea, select { font-size: 16px }`): never smaller, for two stacked reasons — iOS Safari auto-zooms on any input below 16px, and the number being typed (weight, dose, concentration) is the single most safety-critical text on the screen.

### Named Rules
**The 16px Floor Rule.** No input, textarea, or select ever renders below 16px, without exception — this is an accessibility fix (prevents unwanted iOS zoom) and a safety fix (dose entry text is never allowed to be small) enforced by the same line of CSS.

## Layout

Single-page app shell with a fixed bottom tab bar (`Trang chủ` / `Thư viện` / `Hướng dẫn` / `Mindmap` / `Thẻ ghi nhớ`); the medication screen adds its own internal horizontal-scrolling tab row above a single shared scroll region (patient context, running-drug list, and drug list all scroll together rather than each owning separate scroll containers).

**Screen header — one shared component.** Every tab-level screen (Thư viện / Dùng thuốc / Ôn tập / Mindmap) renders `<ScreenHeader>` (`src/components/ScreenHeader.tsx`) as a `flex-none` row *outside* its `scroll-ios` region (screen wrapped in `h-full flex flex-col`), so the title stays pinned while the body scrolls. Fixed spec: `px-5 pt-3 pb-3`, a `min-h-9` title row (so the baseline doesn't shift whether or not `actions` are present), `h1` at `text-[20px] font-bold leading-[1.3]` in `--c-text`, an optional `--c-text-soft` subtitle, no border and no background. Mindmap was the last screen still carrying a bespoke header (17px, a border, a `--c-page` fill, an extra "+ Bảng mới" button); folded into `ScreenHeader` 2026-08-28. New tab screens use this component — never a title composed inline.

Safe-area insets (`env(safe-area-inset-top/bottom)`) are read into two shared variables (`--safe-top`, `--safe-bottom`) rather than applied ad hoc, so the notch/home-indicator area is handled once and consistently across every screen. The body is pinned with `position: fixed; inset: 0` rather than `100dvh`, specifically because 100dvh under-measures on iOS PWA fullscreen mode and left a visible gap at the bottom edge.

Density is high by domain necessity (a 10-tab medication picker, dense drug cards) — progressive disclosure (collapsible `Disclosure` sections) is the primary tool for managing that density rather than reducing information. This is why the rebrand stayed a *skin* change (color, type, shape, shadow, motion) rather than a structural one — an airy marketing-style layout (bento grids, massive whitespace) would fight the actual job this screen does at 2am.

## Elevation & Depth

Flat by default at rest. Cards lift off the page purely through the surface/page color contrast — no border or shadow needed. Shadow is reserved for genuinely floating layers: pickers, toasts, modals, and sheets that visually sit *above* the page, using a tonal shadow color (`var(--c-shadow)`, a true neutral black in both themes as of the 2026-09 rebrand — light mode was previously tinted toward the brand hue) rather than a generic drop shadow. Dark-mode floating layers additionally use a soft primary-glow halo (`0 0 24px rgba(var(--c-primary-rgb), .18)`) alongside the drop shadow — the "Ethereal Glass" signature of the rebrand, glowing AFFiNE Blue since 2026-09 rather than indigo — reserved for the *same* floating-layer set the shadow rule already covers, never added to resting cards.

### Named Rules
**The Floating-Layer-Only Rule.** `box-shadow` (and, in dark mode, the glow halo) appears only on elements that are genuinely elevated above the page in z-order (dropdowns, toasts, modals, sheets). A card at rest never has a shadow or a glow; if something needs one to look important, it should have moved into a floating layer instead.

## Shapes

Global corner radius of 14px (`--radius`, up from 10px pre-rebrand — a deliberately softer, more premium curve), pill-shaped (`rounded-full`) chips and buttons throughout for tap targets and filter/selection controls. Borders are thin (1px) and used sparingly — most separation comes from surface-color contrast rather than drawn lines.

## Components

### Buttons / Chips
- **Shape:** pill (`rounded-full`) for filters, chips, and most tappable controls; 14px radius for cards and larger containers.
- **Active/Selected:** solid primary-color fill with `var(--c-on-bright)` text (white in light mode, near-black in dark mode — deliberately flipped per theme so text-on-bright-fill always clears AA, rather than assuming white text works in both modes).
- **Press feedback:** every interactive control presses to `scale(0.94–0.97)` on `:active` via a shared transition class (`dose-press`, `nav-press`, `card-press`, `mind-btn`) using a custom spring-style cubic-bezier (`cubic-bezier(0.34, 1.4, 0.64, 1)` family) rather than linear/ease — this is universal and applies even under `prefers-reduced-motion` (only the *decorative* animations are disabled for reduced motion; tap confirmation always stays).
- **Delight:** navigation tabs and the medication screen's tab row play a `pulse-scale` bounce (0.8→1.12→1, 0.45s) when a tab becomes active — scoped entirely to navigation, never to dose-result values.

- **Secondary button** (`button-secondary`): `--c-primary-soft` fill, 1px `--c-primary-line` border, `--c-primary` label, pill, 44px min-height (measured 6.54:1 dark / 8.48:1 light). Use it for a real action that is not the screen's goal — the empty-search "Xoá bộ lọc" escape is the canonical case. **The fill is not optional.** No border token in this system reaches the 3:1 WCAG 1.4.11 floor against the page (`--c-line` measures 1.61 dark / 1.21 light; `--c-primary-line` 1.99 / 1.45), so an outline-only button on a bare page has no reliable shape. The fill carries the form, the border the edge, the brand-colored label the identity.

### Checkbox
- **Style** (`.mind-check`): 18px square, 5px radius, 1.5px `--c-text-muted` border, `--c-surface` fill; checked flips to `--c-primary` fill with an `--c-on-bright` tick drawn by `clip-path` polygon (not a font glyph), springing in over 0.14s. Wrapped in a 34px touch target.
- **Why not the native control:** `accent-color` only paints the *checked* state — an unchecked `<input type=checkbox>` is still drawn by the OS, which in dark mode puts a gray box belonging to no palette at the head of every row, reading as "disabled" rather than "tickable".
- **Border token:** `--c-text-muted` (5.08:1 dark / 4.57:1 light on the tray), **not** `--c-line`, which measures ~1.3:1 in dark — below the 3:1 WCAG 1.4.11 floor for a control boundary. A control's outline is not a divider; it does not get the divider token.
- **Radius:** 5px is a sanctioned sub-scale exception. `rounded.sm` (14px) on an 18px box is 78% of the square and reads as a radio button; `pill` is semantically wrong for a checkbox.

### Filter chips (Board Gallery)
- **One outline for the whole row.** Every chip — "Tất cả", each specialty, and the picker button — shares a single 1px `--c-line` pill outline. Selected state is a solid fill, never a different border style. The row previously mixed solid-fill / solid-outline / **dashed** across four chips; dashed is reserved for "create new" (see Note Paper above).
- **Membership is data, not array order.** The strip carries the three specialties with the most boards *in this user's library*, tie-broken by canonical specialty order so the row doesn't reshuffle on every save. A specialty with no boards never takes a slot, and the picker button hides entirely when no other specialty has boards — a control that can only produce an empty result should not be reachable.
- **Identity survives the off state.** An unselected chip carries the specialty's 7px identity dot (lifted for dark via `--c-khoa-nang`). The filter row is where a user picks *by specialty*; it is the last place that specialty's color should be missing.
- **Wrap, don't scroll.** A short filter row wraps to a second line rather than scrolling horizontally. An edge-fade mask on a row that doesn't overflow dims the default "Tất cả" chip to signal content that isn't there.

### Cards
- **Corner Style:** 14px radius (`rounded-2xl` in Tailwind terms).
- **Background:** `var(--c-surface)`, flat, no border or shadow at rest.
- **Entrance:** home-screen resource cards stagger in with `rise-in` (translateY + fade, 22ms delay per index, capped at 8 steps so a long list doesn't feel sluggish).

### Disclosure (expand/collapse)
- **Mechanism:** `max-height` transition rather than `grid-template-rows` — a deliberate compatibility tradeoff, reconfirmed 2026-08 by reproducing a real stuck-UI bug with grid-template-rows on modern Chromium (not just old iOS Safari, as first assumed) — the auto-height DOM structure here makes CSS Grid's `fr` track resolve as `auto` regardless of the value written, so it never animates. `max-height` remains the correct choice for this specific DOM shape.
- **State:** closed sections use `visibility: hidden` in addition to `max-height: 0`, so keyboard/screen-reader focus can't land on hidden content — not just a visual hide.

### Focus Rings
- **Style:** 2px solid `var(--ring)` (aliases primary), 1px offset (tightened from 2px in 2026-08 — the wider offset was clipping against `overflow: hidden` disclosure containers on some inputs), `:focus-visible` only (never on tap/click) — applied explicitly wherever the app's global `input:focus { outline: none }` reset would otherwise leave keyboard users with no visible focus indicator (the medication screen, the mindmap canvas, the search pill).

### Navigation (bottom tab bar)
- **Style:** frosted/blurred background (`backdrop-filter: blur(20px) saturate(1.8)`), active tab gets a pill-shaped background (`var(--c-nav-active-bg)`) that grows in width with a bounce easing on selection change, primary-colored icon/label, 700-weight label vs. 500 for inactive.
- **Mobile:** full-width safe-area-aware bar; labels always shown (never icon-only), which independently protects against the icon-only-nav failure mode for first-time users.

## Do's and Don'ts

### Do:
- **Do** read every color from a `--c-*` CSS custom property — a hardcoded hex anywhere in a component is a bug, not a style choice.
- **Do** keep `--c-danger*`, `--c-warn*`, and `--c-green*` completely independent of the primary/accent palette, including through any future rebrand.
- **Do** verify new color pairs against WCAG AA (4.5:1 for text, higher for small label text) before shipping them, the way every existing token was verified.
- **Do** keep tap-confirmation motion (`:active` scale) working even under `prefers-reduced-motion`; only decorative motion should respect that media query.
- **Do** scope new delight/motion/glow additions to navigation, tabs, cards, and transitions — never to dose numbers or safety-tier text.
- **Do** let dark mode be a *deliberately distinct* execution of the brand (deeper, more saturated-glow) rather than a mechanical inversion of light mode.
- **Do** count how many times an accent color appears on one screen before shipping it. Used once it is emphasis; repeated per row it becomes the body color and quietly outranks the content it decorates.
- **Do** give a secondary action a real fill (`button-secondary`), not an outline alone — no border token in this system clears 3:1 against the page.

### Don't:
- **Don't** add bounce, pop, glow, or celebratory motion to a danger or warning state, ever — this is the system's one hard line, confirmed directly against clinical risk rather than a generic accessibility guess.
- **Don't** use the Mindmap-only magenta accent (`--c-accent-2`) anywhere in the medication or dosing screens.
- **Don't** let any input, textarea, or select render below 16px font size.
- **Don't** invert one theme to produce the other — light and dark are both independently authored and contrast-checked.
- **Don't** let brand color (`--c-primary`) sit on a calm/"ok" clinical result — reserve it for chrome, navigation, and actions; a normal dose reads in `--c-text`.
- **Don't** place a decorative accent immediately beside a hazard signal. Measure it: magenta `#f175a6` next to danger `#ff8585` is ΔE(CIE76) 26 at 4px apart — close enough to read as "two pinks" on a permanent-delete control. In any bulk-action strip, the destructive action is the *only* colored one.
- **Don't** dress a non-create action in the paper material (`.mind-o-tao-bang`) or a dashed border. Both mean "make a new thing"; a reset, filter, or dismiss control wearing either is lying about what it does.
- **Don't** hand a control's outline the divider token (`--c-line`). Dividers may sit near 1.3:1; a control boundary owes 3:1 (WCAG 1.4.11) and needs `--c-text-muted` or stronger.
