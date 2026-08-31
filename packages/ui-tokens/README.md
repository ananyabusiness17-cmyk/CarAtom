# @caratom/ui-tokens

Canonical visual tokens for CARATOM, matching [`docs/architecture/10-design-system.md`](../../docs/architecture/10-design-system.md).

## Usage

Light blue is a **selective accent**, not a page-wide tint.

- `brand` (`#5DB7E8`) — active tabs, selected borders, links, icons
- `brandStrong` (`#176B9E`) — filled primary CTAs, pressed, high-contrast text on `brandSoft`
- `brandSoft` (`#EAF6FC`) — small selected fills and policy-note backgrounds only

Keep large surfaces white or near-white (`canvas`, `surface`). Prices and body copy use `textStrong` / `text`, not brand. Green, amber, and red are **semantic only** (`success` / `warning` / `danger`).

Do not fill large regions with `#5DB7E8`. Do not treat walkthrough CSS green as brand.

## Consumers

- Customer Expo app: `StyleSheet` via this package
- Admin Next.js: Tailwind `extend.colors` mapped from the same hex values
