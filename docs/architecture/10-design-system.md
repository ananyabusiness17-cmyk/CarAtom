# 10 — Design system and visual constitution

## Visual source of truth

The customer-home references establish a specific interaction language:

- service discovery is dense, direct, and consumer-oriented;
- top chrome exposes service location and selected vehicle;
- service modes behave like visible tabs rather than hidden navigation;
- real car imagery and cutouts explain choices faster than generic icons;
- brand selection is a searchable three-column logo grid;
- model selection is a photo grid;
- emergency assistance is map-led and visually scannable;
- home contains service tiles, offers, proof, and persistent bottom navigation.

The references are inspiration, not permission to copy logos, imagery, copy, or another company’s visual identity. CARATOM’s own photography and brand assets must be used in production.

## Design character

The customer app should feel bright, calm, practical, and automotive. It is mostly white and neutral, with real imagery carrying richness. Light blue is an accent used purposefully, not a page-wide tint. One-man Job tiles should read as quick, focused tasks rather than full package cards: concise label, clear starting price, expected duration, and one direct action.

Use hierarchy and editorial composition rather than a wall of interchangeable rounded cards. A section may be open text, a list, a media strip, a grid, or a card depending on the meaning it groups.

Avoid gradients, glassmorphism, blur, decorative floating elements, excessive pills, emoji icons, oversized hero copy, fake dashboard widgets, and repeated generic illustrations.

## Color tokens

Use semantic names in code and map them to platform tokens. Initial values are a starting point, not a substitute for contrast testing.

```text
canvas                 #F7FAFC   cool near-white page background
surface                #FFFFFF   primary cards and sheets
surface-subtle         #F1F6F9   restrained grouping surface
text-strong            #142532   headings and primary values
text                    #243744   body text
text-muted             #6A7B86   secondary descriptions
border                 #DCE8EF   structural dividers
brand                   #5DB7E8   light-blue primary accent
brand-strong           #176B9E   pressed/link/high-contrast blue
brand-soft             #EAF6FC   selected/background emphasis
success                #2D8A61   confirmed/genuine/warranty states
success-soft           #E9F6EF
warning                #B56A22   caution and pending attention
warning-soft           #FFF3E5
danger                 #C64242   SOS, destructive, urgent
danger-soft            #FDECEC
```

Blue is most visible on primary actions, active tabs, selected borders, vehicle pills, and links. Keep large surfaces white or neutral. Promotional content may use photography and a controlled secondary accent; do not force every banner blue.

## Typography

Use a highly legible system sans on mobile and a matching web sans for admin. A final licensed brand face is an ADR, not an assumption.

```text
display       28/34, 700   only for short home/service titles
h1            24/30, 700
h2            20/26, 700
h3            16/22, 700
body          15/22, 400
body-medium   15/22, 600
caption       12/16, 500
price         18/22, 700
label         13/18, 600
```

Avoid all-caps body copy. Use sentence case and short labels. Price hierarchy should be obvious without relying on color alone.

## Spacing and geometry

Base unit: 4 dp/px.

```text
space-1  4
space-2  8
space-3  12
space-4  16
space-5  20
space-6  24
space-8  32
space-10 40
```

Touch targets are at least 44x44 points. Use 16–20 horizontal page padding. Section rhythm is usually 24–32. Do not use radius as decoration.

```text
radius-control  10
radius-card     14
radius-sheet    20
radius-pill     999   # only compact status/filter controls
```

## Borders and elevation

Borders are structural: `border` at 1 px, with stronger `brand` only for selected/focused controls. Prefer a very subtle platform elevation for sheets and navigation only; do not stack shadows on every card.

## Imagery

Use real vehicle cutouts on plain surfaces for selection, and real service photography/video for hero and trust content. Every image needs an explicit crop/focal point, loading placeholder, failure fallback, and accessible label. Do not use generic AI illustrations as operational evidence.

## Components and controls

- Primary button: filled brand blue, concise verb, full width in mobile finalization; disabled state retains readable contrast.
- Secondary button: white/subtle surface with structural border or brand-soft fill.
- Destructive button: danger only for cancellation, SOS, delete, or irreversible action.
- Tabs: compact folder-like or underline treatment; active state uses brand color and weight, not large decorative containers.
- Inputs: visible label, helper text only when useful, focused border, inline error, native keyboard type.
- Cards: use for a coherent decision or summary. Lists for repeated records.
- Bottom navigation: 3–4 destinations, clear icon + label, active state in brand. Do not add tabs that merely duplicate a screen.
- Bottom sheets: use for small selection and contextual actions; forms requiring multiple fields use a full screen.

## States and motion

Every data surface has loading, empty, error, and success/recovery treatment. Use skeletons only where layout stability helps. Motion is short and functional: sheet presentation, selection feedback, progress, and status change. Respect reduced-motion settings.

## Accessibility

Maintain WCAG AA-equivalent contrast for text and controls, never encode state by color alone, expose labels/hints to screen readers, support dynamic text without clipping, announce async errors/status changes, and keep focus visible on web/admin.

## Asset organization

```text
assets/
  brand/                 logo, wordmark, approved icons
  vehicles/              make/model cutouts with attribution/license
  services/              service photography and controlled illustrations
  campaigns/             dated promotional media
  trust/                 vans, technicians, equipment, warranty proof
  emergency/             roadside category art
```

Asset metadata records source, license, focal point, alt text, and crop variants. The six current PNGs remain design references under `docs/inspiration`, not runtime assets.
