---
name: The Imperial School
description: A boarding school's admissions office at night: navy ground, one gold, ivory serif, with the working reservation tool set on the letterhead.
colors:
  navy-950: "#060d1f"
  navy-900: "#0a1630"
  navy-800: "#0f2247"
  navy-700: "#163063"
  navy-600: "#1f3f7a"
  gold-500: "#c9a75a"
  gold-300: "#e3c98a"
  ivory: "#f5f0e6"
  muted: "#a9b4cc"
  success: "#5cc29a"
  warning: "#e6b85c"
  danger: "#ef8a8a"
  neutral: "#8c97ae"
typography:
  display:
    fontFamily: "Cormorant Garamond, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "4rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.005em"
    fontFeature: "lining-nums"
  headline:
    fontFamily: "Cormorant Garamond, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.08
  title:
    fontFamily: "Cormorant Garamond, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.08
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.07em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.gold-500}"
    textColor: "{colors.navy-950}"
    rounded: "{rounded.sm}"
    padding: "10px 22px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.gold-300}"
    textColor: "{colors.navy-950}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    rounded: "{rounded.sm}"
    padding: "10px 22px"
    height: "44px"
  button-disabled:
    backgroundColor: "{colors.navy-700}"
    textColor: "{colors.neutral}"
  input:
    backgroundColor: "{colors.navy-950}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.sm}"
    padding: "11px 14px"
    height: "46px"
  card-registration:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.lg}"
    padding: "36px"
  card-place:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.md}"
    padding: "24px"
  badge-status:
    rounded: "{rounded.pill}"
    padding: "3px 12px"
  nav-link:
    textColor: "{colors.muted}"
    padding: "0 16px"
  nav-link-active:
    textColor: "{colors.gold-300}"
---

# Design System: The Imperial School

## Overview

**Creative North Star: "The Letterhead Office"**

The site reads as a prestigious boarding school's admissions office after dark: a deep navy ground, one gold used for action, hairlines and the crest, and ivory serif headings. The working admission tool is not hidden behind marketing; it sits on the letterhead, as the double-ruled registration card in the first viewport.

Density is calm and editorial. Sections are ruled lists, timelines and ruled tables rather than grids of boxed cards. Public pages (Home) may be expressive; operating pages (places board, reservation, my applications, Registrar) trade expression for clarity because the guardian is working against a hold timer.

**Key Characteristics:**
- Dark only (`color-scheme: dark`); depth comes from stepping through five navy tones plus gold hairlines.
- One gold. Gold marks the action, the rules, the crest and the current state; nothing else is saturated except the four tinted states.
- Cormorant Garamond for headings and numerals, Inter for everything that is read or operated.
- Thin gold hairlines (28% and 14% alpha) separate content instead of boxes and fills.
- Drawn inline SVG for crest and icons; no image files, glyph icons or icon fonts.

## Colors

A navy-and-gold palette with ivory text; state colours appear only as tinted grounds with a coloured label.

### Primary
- **Brass Gold** (gold-500): Primary button fill, active-nav underline, step and ring progress, icon strokes, count pills, hairline source.
- **Pale Gold** (gold-300): Links, focus ring, caret, hover state of the primary button, active nav text, mottos, big dates and timeline numerals.

### Neutral
- **Midnight Page** (navy-950): Page background, top bar, footer, input fill, text on gold.
- **Chapel Navy** (navy-900): Sticky header, hero, page heads, alternate sections, table frame.
- **Panel Navy** (navy-800): Cards, popovers, table header, form cards.
- **Raised Navy** (navy-700): Hover on raised pills, disabled button fill.
- **Border Navy** (navy-600): Scrollbar thumb only.
- **Ivory** (ivory): Primary text and headings.
- **Slate Mist** (muted): Secondary text, hints, table headings, inactive nav.
- **Hairline Gold**: gold-500 at 28% (`--line`) for structural rules and card borders; 14% (`--line-soft`) for inner dividers.

### Semantic
- **Success** (success, tint 14%): Available seats, confirmed, valid student ID.
- **Warning** (warning, tint 14%): Filling, held, and the countdown ring when urgent.
- **Danger** (danger, tint 14%): Last places, cancelled, field errors, invalid input.
- **Neutral** (neutral, tint 16%): Full, expired, placeholders.

### Named Rules
**The One Gold Rule.** There is a single gold family. A second accent hue is not introduced; new emphasis uses ivory, muted, or a hairline.

**The Tint, Never Fill Rule.** State colours are a 14-16% tinted ground with the full colour only on text, dot, or border. A bright solid state fill does not appear.

**The Paper Exception.** The admission letter is a white sheet with near-black text (it is a printable document). It is the only light surface.

## Typography

**Display Font:** Cormorant Garamond (with Iowan Old Style, Palatino Linotype, Georgia), weights 600 and 700, italic 600 for mottos; self-hosted via @fontsource.
**Body Font:** Inter (with system-ui stack), weights 400, 500, 600; self-hosted via @fontsource.

**Character:** A heraldic serif for voice and numerals against a neutral, legible interface sans. Lining figures are forced everywhere (Cormorant's old-style figures make "11" read as two small marks).

### Hierarchy
- **Display** (600, clamp 2.4rem to 4rem, 1.04): Hero headline only.
- **Headline** (600, clamp 1.75rem to 2.5rem, 1.08): h2 section titles; page h1 is clamp 2.25rem to 3rem.
- **Title** (600, 1.625rem, 1.08): h3 and card/class names (1.35 to 1.6rem in cards and tables).
- **Body** (400, 0.9375rem, 1.6): Interface text; lead paragraphs 1.0625rem in muted, capped at 52 to 62ch; hints capped at 70ch.
- **Label** (600, 0.8125rem, 0.07em, uppercase): Table column headings, phone-card cell labels and the ring caption only.
- **Numerals**: stat figures and dates in Cormorant 600 (2.5rem stat, 3.1rem news day); the countdown is Inter 600 at 2.7rem, tabular lining.

### Named Rules
**The Lining Figures Rule.** `font-variant-numeric: lining-nums` is set on body; any element using the `font:` shorthand must re-declare it, and data columns add `tabular-nums`.

**The Serif Speaks Rule.** Cormorant is for headings, numerals and mottos (gold italic). Inter carries every control, label and paragraph.

## Layout

A single 1180px container with 24px side margins (16px under 560px). Page sections breathe at `clamp(56px, 8vw, 96px)` vertical padding; page heads sit on navy-900 with a gold hairline beneath; page bodies pad 40px top, 96px bottom. Alternating sections switch between navy-950 and navy-900 with soft hairlines at the seams.

Home opens as a split hero (1.1fr copy, 0.9fr portal card). Content grids are 4-up (timeline, houses, stat register), 3-up (live places), and 2-up (FAQ with visit card, Registrar form with note), each collapsing at 960px to 2 columns and at 640px to one. At 960px the nav becomes a menu button with a stacked panel, and the hero reorders so the portal card follows the lead. Gaps run 8, 12, 16, 24, 32, 40px.

Tables become stacked cards under 640px: headings hide, each cell shows its `data-label`, the action goes full width.

## Elevation & Depth

Tonal layering first, shadow second. Surfaces step up navy-950, 900, 800, 700; gold hairlines do most of the separating. Shadows are soft, black and ambient, used only on things that float or are the focal card.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 10px 30px rgba(0,0,0,0.35)`): Reservation card.
- **Lift** (`box-shadow: 0 24px 60px rgba(0,0,0,0.45)`): Hero portal card, popovers, toasts, the letter sheet.
- **Current step halo** (`box-shadow: 0 0 0 4px rgba(201,167,90,0.16)`): The current step dot.

### Named Rules
**The Hairline First Rule.** Reach for a gold hairline before a shadow or a fill. Shadows are reserved for surfaces that float above the page.

## Shapes

Quietly rounded: 6px on buttons, inputs and the skip link; 12px on panels, tables, notices and place cards; 16px on the two registration cards; full pill for status badges, count pills and the student-ID pill; circles for timeline numerals, step dots, the countdown ring and state icons. The crest is a shield.

The signature silhouette is the **double rule**: a 1px line border plus an inner 1px soft line inset 6px (radius 11px), as on a printed registration card.

## Components

### Buttons
- **Shape:** 6px radius, minimum 44px tall, 10px 22px padding, Inter 600 15px.
- **Primary:** Brass gold fill, midnight text; hover lightens to pale gold.
- **Outline:** Transparent, ivory text, 28% gold border; hover adds 10% gold wash and full gold border.
- **Press / Disabled:** Press scales to 0.98; disabled is raised navy with neutral text and no pointer.
- **Text and arrow links:** Pale gold, 1px underline offset 3px; hover to ivory; arrow nudges 3px right.

### Inputs / Fields
- **Style:** Midnight fill, 1px hairline-gold border, 6px radius, 46px tall; placeholder in neutral.
- **Hover / Focus:** Border to brass gold on hover; focus shows the 2px pale-gold ring, offset 1px, with a pale-gold border.
- **Error:** Border turns danger; message is 13px danger text beneath.
- **Checkbox:** 18px with gold accent.

### Navigation
Sticky 72px header on chapel navy with a gold hairline; crest, serif wordmark (700) and small tracked subline. Links are muted Inter 500; hover ivory; current page is pale gold with a 2px brass underline flush to the header edge. The student-ID pill (pill radius, panel navy) opens a lift-shadow popover. Below 960px: menu button and stacked panel; below 640px the subline hides and the pill shortens.

### Registration Card (signature)
Panel navy, 1px line border, 16px radius, lift shadow, double rule inset. Hosts the Admissions Portal (student-number field plus three ruled links) on Home and the reservation flow (class title, step tracker, countdown, details) on the reservation page. Ruled links are full-width rows with a bottom hairline, brass chevrons, and a hover wash plus 6px indent.

### Crest
Inline SVG: navy shield with brass double outline, brass crown, twelve laurel leaves, pale-gold serif "I". A smaller house shield takes a house colour at 22% fill. Used in header, footer and letter.

### Countdown Ring
212px SVG ring, 7px stroke: ivory 10% track, brass value with round caps, switching to warning when urgent. Centre shows the time in Inter 600 tabular lining numerals and a tracked caption.

### Status Badges and Availability
Pill with 6px leading dot, 12.5px 600 text, tint ground and full-colour text via a `--tone` variable. Availability uses success, warning, danger, neutral; reservation status uses confirmed, held, cancelled, expired. A 4px availability bar uses the same tone.

### Ruled Tables
Frame of 1px hairline on chapel navy with 12px radius; header row on panel navy with muted tracked labels; rows divided by soft hairlines, hover with a 5% gold wash; numeric columns right-aligned tabular; class names in Cormorant 1.35rem. Stacked cards on phones.

### Editorial Lists
Timeline (numbered gold-outlined circles joined by a hairline), houses (four columns divided by soft hairlines, italic gold mottos), news (big gold serif day, muted month), FAQ (details rows with a rotating chevron), stat register (four serif figures between vertical hairlines).

### Notices
Toast: panel navy, lift shadow, a full coloured border for error or info, drawn icon, slide-in of 0.24s. Inline strips: 14% tinted ground with a 45-50% coloured full border.

## Do's and Don'ts

### Do:
- **Do** build new surfaces from the variables in tokens.css; components only consume tokens.
- **Do** separate content with gold hairlines (`--line` for structure, `--line-soft` for inner dividers) before reaching for a box or shadow.
- **Do** use brass gold for the single primary action per view and pale gold for links, focus and numerals.
- **Do** keep the visible 2px pale-gold focus ring, themed selection, caret and scrollbars.
- **Do** force lining, tabular figures on any number a guardian must read, and re-declare lining-nums after any `font:` shorthand on a serif element.
- **Do** present lists as ruled editorial rows; turn tables into stacked labelled cards under 640px.
- **Do** honour `prefers-reduced-motion` (animations and transitions collapse to near zero).
- **Do** draw icons as inline SVG in gold-500 or a state colour.

### Don't:
- **Don't** add a second accent hue or a bright solid state fill; states are tints.
- **Don't** use thick coloured side borders on cards, strips or notices.
- **Don't** use glyph or emoji icons, or icon fonts.
- **Don't** put the serif on controls, or Inter on headings and mottos.
- **Don't** use a row of identical icon cards to describe features.
- **Don't** put a light surface on the page other than the printable admission letter.
- **Don't** put gradient text or heavy shadows on content cards; the hero's faint gold glow and diagonal hairline texture are the only gradients.
