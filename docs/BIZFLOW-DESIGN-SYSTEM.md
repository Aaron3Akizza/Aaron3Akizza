# BizFlow — Design System

This documents the visual system already implemented across
`src/pages/LandingPage.jsx` and `src/pages/AppShell.jsx`. Treat this as the
contract for any new UI — new screens should look like they belong next to
these two files, not like a different product.

## Design intent

Clean, professional, calm, business-focused software that a real shop owner
would trust with their money. Not a generic AI-startup aesthetic.

**Avoid:** navy as a primary color, purple-heavy UI, neon colors, excessive
gradients, glassmorphism, excessive animation, huge decorative illustrations.

---

## Color system

| Role | Hex | Tailwind class | Usage |
|---|---|---|---|
| Primary / Growth | `#16A34A` | `green-600` | Primary buttons, brand accents, positive stats, growth indicators, active nav state |
| Secondary | `#F0FDF4` | `green-50` | Soft backgrounds, highlight sections, selected states |
| Dark text | `#111827` | `gray-900` | Headings, primary nav, important labels |
| Danger | `#DC2626` | `red-600` | Critical alerts, failed transactions, destructive actions only — **never decorative** |
| Warning | `#D97706` | `amber-600` | Low stock, pending actions, things needing attention |
| Information | `#2563EB` | `blue-600` | Neutral analytics, secondary chart indicators — used sparingly |
| Background | `#FFFFFF` | `white` | Primary page background |

### Implementation constraint — read before adding colors

Do **not** use Tailwind arbitrary-value classes like `bg-[#16A34A]` or
opacity-modifier classes like `bg-green-50/60`. Earlier in this project's
history those classes silently failed to render because the preview
environment used a pre-built stylesheet rather than a JIT compiler. The
fix was switching to Tailwind's named palette classes (`green-600`,
`green-50`, etc.), which happen to match the brand hex values exactly. This
project's real Vite build **can** compile arbitrary-value classes correctly
(confirmed — Tailwind's JIT runs normally under Vite), but stick to the
named classes above for consistency with the existing codebase rather than
mixing conventions.

---

## Typography

Sans-serif throughout (Inter or system sans-serif fallback — no font loader
is currently wired up; see `docs/BIZFLOW-STATUS.md`).

- Large, bold hero/page headings (`text-3xl` / `text-4xl`, `font-bold` /
  `font-extrabold`, `text-gray-900`)
- Section headings (`text-lg` / `text-xl`, `font-bold`)
- Body copy (`text-sm` / `text-base`, `text-gray-500` / `text-gray-600`)
- Small muted labels and captions (`text-xs`, `text-gray-400`)
- Dashboard labels (`text-xs font-medium text-gray-500`)

No decorative or display fonts anywhere in the codebase.

---

## Spacing

- Page/section padding: `px-6 lg:px-8` horizontally, `py-16`–`py-20`
  vertically for marketing sections; `p-5 lg:p-8` for app screens.
- Card padding: `p-4`–`p-6` depending on density.
- Consistent gap scale: `gap-2` / `gap-3` / `gap-4` / `gap-5` for related
  groups, `gap-6`–`gap-14` for section-level separation.

---

## Buttons (`Button` component)

Both page files define their own local `Button` component with the same
API: `variant` (`primary` / `secondary` / `ghost` / `danger` in the app
shell), `size` (`sm` / `md` / `lg`), optional `href` (renders an `<a>`
instead of a `<button>` — used for real future routes like `/login` and
`/signup`).

- **Primary:** `bg-green-600 text-white hover:bg-green-700` — the strongest
  call to action on any screen (Start Free Trial, Save product, etc.)
- **Secondary:** white background, gray border, `hover:bg-gray-50`
- **Ghost:** text-only, `hover:bg-gray-100` — used for lower-emphasis
  actions like "Log in" in the navbar
- **Danger** (app shell only): `bg-red-600 text-white hover:bg-red-700` —
  reserved for destructive actions

Note: these two `Button` components are currently duplicated (one per page
file) rather than shared. Extracting a single `src/components/Button.jsx`
is a reasonable near-term refactor — see `docs/BIZFLOW-STATUS.md`.

---

## Cards

`bg-white rounded-xl border border-gray-100 p-4`–`p-6`. Subtle borders, no
heavy shadows. Stat cards, feature cards, and dashboard panels all follow
this same base pattern with minor padding/content variation.

---

## Forms

`TextField` pattern: label above input, `rounded-lg border border-gray-200`,
`focus:ring-2 focus:ring-green-600`. Selects follow the same border/focus
treatment. Modals (see `AddProductModal` in `AppShell.jsx`) use a centered
white panel over a `bg-black/40` overlay, `rounded-2xl`, with a close button
top-right.

---

## Navigation

- **Marketing navbar** (`LandingPage.jsx`): sticky, white background, logo
  left (links to `/`), links center, Log in / Start Free Trial right,
  hamburger on mobile, scroll-spy active state using a subtle
  `bg-green-50 text-green-600 font-semibold` pill — never a bright or
  distracting highlight.
- **App sidebar** (`AppShell.jsx`): dark (`bg-gray-900`) fixed sidebar
  containing the 8 core modules, `HelpCircle`/user profile/`LogOut` pinned
  to the bottom, active module shown with a solid `bg-green-600 text-white`
  row. Collapses to a slide-in drawer on mobile.

---

## Status indicators / alerts (`Badge` component)

Small pill badges with four tones, used consistently for stock levels,
payment methods, debt status, etc.:

- `positive` → `bg-green-50 text-green-600`
- `warning` → `bg-amber-50 text-amber-600`
- `danger` → `bg-red-50 text-red-600`
- `neutral` → `bg-gray-100 text-gray-600`

**Red is reserved for genuinely dangerous or destructive states** —
critical stock shortages, failed transactions, delete confirmations. It is
never used decoratively. Green always represents growth/success/healthy
activity; amber always represents "needs attention," not danger.

---

## Tables

Used for Recent Sales, Products, and (planned) Reports. Pattern: `text-sm`,
light `text-xs text-gray-400` header row with a bottom border, row dividers
via `border-b border-gray-50`, hover state `hover:bg-gray-50/60` on
interactive rows (e.g. expandable IMEI rows in the Products table).

---

## Dashboard cards

Stat cards follow: small label (`text-xs text-gray-500`) → large bold value
(`text-2xl font-bold text-gray-900`) → optional delta line colored by tone
(green for positive, amber for warning, gray for neutral). This pattern
repeats across the landing page's dashboard *preview* and the real
`DashboardScreen` in the app shell — keep them visually identical if one is
updated.

---

## Animation

Restrained: hover-state color/background transitions
(`transition-colors duration-150`) and simple `transition-transform` on
expand/collapse chevrons. No parallax, no floating elements, no constant
motion. This is deliberate — see `docs/PHONE-SHOP-MVP.md` framing of
BizFlow as calm, trustworthy business software.
