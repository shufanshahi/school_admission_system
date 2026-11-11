---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: []
---

# Surface brief: The Imperial School admission site

## Scope and mode
Whole frontend, replacing the plain light UI. Home is **Persuade** (a school selling a place, with the working admission tool in the first viewport). Places board, reservation, my applications and Registrar are **Operate** (a guardian against a clock; clarity outranks expression). Brief-pinned world: `frontend-redesign.md`. Product behaviour, API contract and test contracts do not change.

## Audience, job, proof
Guardians applying under time pressure; a school admin creating classes. Proof is the live product: real seat counts, a real countdown. Everything else (houses, news, fees, FAQ) is fictional and labelled illustrative, kept in one content file.

## Direction contract

THESIS: A prestigious boarding school's admissions office, where the working tool sits on the letterhead. Refuses the generic SaaS hero, the eyebrow-label scaffold and the row of identical icon cards.

OWN-WORLD: Deep navy ground (#060D1F to #163063), one gold (#C9A75A) used for action, hairlines and the crest, ivory text. Cormorant Garamond for headings and numerals, Inter for the interface (both pinned by the brief). Thin gold hairlines, a double-ruled "registration card", an inline SVG crest (shield, laurel, crown). Sections are editorial lists and ruled tables, not boxed cards.

STORY: A guardian understands in seconds that this is a serious school with places open now, believes it because the numbers are live, and acts: enters the student number and reserves a place without leaving the first screen.

FIRST VIEWPORT: 1366x768. Slim top bar, sticky header (crest, name, nav, student-ID pill). Left: headline "A place at Imperial begins here.", two lines of copy, gold "Reserve a place" and outline "My applications". Right: the Admissions Portal registration card with the real student-number field and three ruled links (browse and apply, my applications with count, how admission works). Primary action: the gold button and the field.

FORM: the direction was pinned by the user's brief (`frontend-redesign.md`: navy and gold, Cormorant and Inter, split hero with the working portal), and a user-pinned direction beats the roll, so the concept roll was skipped on purpose. It was not unavailable. seed: none (roll skipped, direction pinned by the user)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
Fictional school content (houses, fees, news, contact details) is placeholder and must be replaced before real use.
