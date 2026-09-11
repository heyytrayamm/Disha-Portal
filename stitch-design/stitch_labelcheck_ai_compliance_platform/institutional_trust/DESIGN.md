---
name: Institutional Trust
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444651'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  status-pass: '#10b981'
  status-fail: '#ef4444'
  status-review: '#f59e0b'
  border-subtle: '#e2e8f0'
  text-main: '#0f172a'
  text-muted: '#475569'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is engineered for **LabelCheck**, a government-grade SaaS platform focused on compliance and verification. The brand personality is authoritative, transparent, and unwavering. It prioritizes the "Indian Digital Public Infrastructure" (DPI) aesthetic—balancing modern technical sophistication with extreme accessibility and high-density information clarity.

The visual style is **Corporate / Modern**, characterized by:
- **Exceptional Clarity:** Generous whitespace to prevent cognitive load in data-heavy environments.
- **Reliability:** A stable, structured layout that conveys "National Scale" infrastructure.
- **Precision:** Fine lines, subtle borders, and a rigorous adherence to a 4px grid system.

## Colors

The palette is anchored by **Deep Blue**, a color associated with institutional stability and government oversight. 

- **Primary:** Used for primary actions, active navigation states, and brand-identifying headers.
- **Status Colors:** These are non-negotiable semantic indicators. **Pass (Green)**, **Fail (Red)**, and **Review (Amber)** must maintain high contrast against the light neutral background to ensure accessibility.
- **Backgrounds:** Use a tiered neutral system. The page background is a soft off-white (`#f8fafc`), while card surfaces are pure white (`#ffffff`) to create subtle distinction without heavy shadows.

## Typography

The system utilizes **Inter** exclusively to ensure maximum legibility across all screen densities. 

- **Headlines:** Use a tighter letter-spacing and heavier weights to establish clear hierarchy.
- **Data Tables:** Use `body-md` for standard entries. For numerical data or OCR confidence scores, ensure tabular lining figures are enabled if supported by the environment.
- **Labels:** Use uppercase for small `label-md` elements (like table headers or status tags) to improve scannability in dense layouts.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop to maintain the density required for professional audit tools, while transitioning to a fluid model for mobile.

- **Grid:** 12-column system on desktop (1280px max-width container). 4-column system on mobile.
- **Rhythm:** All margins and paddings must be multiples of 4px. Use `lg` (24px) for major component grouping and `md` (16px) for internal card padding.
- **Density:** This system supports a "Compact" mode for data-heavy tables where vertical padding is reduced to `xs` (4px).

## Elevation & Depth

To maintain a "Professional/Government" feel, this design system avoids heavy, dramatic shadows. Depth is achieved through:

- **Low-Contrast Outlines:** All cards and containers use a 1px border (`#e2e8f0`).
- **Surface Tiers:** Background is `#f8fafc`. Active surfaces (Cards, Modals) are `#ffffff`.
- **Minimal Elevation:** Only two levels of shadows are permitted. 
    1. **Resting:** 1px border only, no shadow.
    2. **Raised (Modals/Dropdowns):** A soft, neutral shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`.

## Shapes

The shape language is structured and approachable.
- **Standard Radius:** 8px (`rounded-md`) for buttons and small inputs.
- **Card Radius:** Specifically 12px (`rounded-lg`) as per the requirement for a modern SaaS aesthetic.
- **Circular Elements:** Score rings and status indicators use a full 100% radius (pill/circle).

## Components

- **Circular Score Rings:** Use a 4px stroke width. The ring color should map to the Status Colors (Pass/Fail/Review). Display the percentage in `headline-md` at the center.
- **Verification Checklists:** Rows should have a subtle hover state (`#f1f5f9`). Each item must include a status icon (Check, X, or Alert) in its respective color.
- **Data-Dense Tables:** Use a 1px horizontal-only divider. Row height should be 48px for standard and 40px for compact. Headers use `label-md` with `text-muted` color.
- **OCR Confidence Indicators:** Displayed as a small badge next to extracted text. Use a background tint of the status color at 10% opacity with 100% opacity text (e.g., Light Red background with Deep Red text for "Low Confidence").
- **Buttons:**
    - **Primary:** Solid `#1e3a8a` with white text.
    - **Secondary:** White fill with `#e2e8f0` border and `#1e3a8a` text.
- **Input Fields:** 1px border (`#e2e8f0`). On focus, the border changes to Primary Blue with a 2px outer "halo" of the primary color at 15% opacity.