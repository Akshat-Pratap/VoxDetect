---
name: Premium Analytics Ethos
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#444748'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#b71422'
  on-secondary: '#ffffff'
  secondary-container: '#db3237'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00210c'
  on-tertiary-container: '#00984e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930014'
  tertiary-fixed: '#6bfe9c'
  tertiary-fixed-dim: '#4ae183'
  on-tertiary-fixed: '#00210c'
  on-tertiary-fixed-variant: '#005228'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 32px
  gutter: 24px
  card-gap: 16px
  margin-sm: 16px
  margin-md: 24px
  margin-lg: 48px
---

## Brand & Style

The design system is rooted in **Corporate Modernism** with a focus on data density and clarity. It balances the high-stakes nature of security (VoiceGuard AI) with the refined, airy aesthetic of premium SaaS analytics. The brand personality is authoritative yet approachable, evoking feelings of control, precision, and trust.

The visual language emphasizes a "Restrained Premium" feel:
- **Minimalism:** Use of generous white space and a "less is more" approach to decorative elements.
- **Precision:** Perfect alignment and a strict mathematical grid to reflect the accuracy of AI monitoring.
- **Subtlety:** High-end feel achieved through minute details—micro-borders, soft inner shadows, and deliberate typographic hierarchy.

## Colors

The palette is built on a sophisticated "Ink & Paper" foundation. We use a deep, almost-black neutral for primary actions and text to maintain high authority.

- **Primary:** High-contrast off-black used for primary buttons, headers, and navigation anchors.
- **Secondary (Accent):** A vibrant coral/red, used sparingly for critical alerts, high-priority status indicators, or "Live" recording states.
- **Tertiary (Success):** A muted emerald for positive growth metrics and "Secured" statuses.
- **Neutrals:** A multi-layered greyscale palette. Backgrounds use a very slight cool-grey tint (`#F8F9FA`) to reduce eye strain compared to pure white.
- **Data Visualization:** Use a distinct secondary palette of desaturated teals, purples, and ambers to differentiate multi-series charts without breaking the professional tone.

## Typography

The design system utilizes **Hanken Grotesk** across all roles to maintain a cohesive, technical-yet-modern feel. The hierarchy is driven by significant weight contrasts and deliberate use of uppercase labels for metadata.

- **Headlines:** Use SemiBold (600) or Bold (700) with slight negative letter spacing for a "tight" professional look in dashboard headers.
- **Body:** Regular (400) weight for maximum legibility in data tables and descriptions.
- **Data Labels:** Medium (500) or SemiBold (600) for small labels and buttons.
- **Mono-spacing:** For specific AI logs or security hashes, use a system monospace fallback to signify "raw data."

## Layout & Spacing

This design system uses a **Fluid Grid with Fixed Constraints**. Content lives within a maximum width of 1440px for desktop to ensure readability of metrics.

- **The 8px Rule:** All spacing and padding must be multiples of 8px to ensure mathematical harmony.
- **Dashboard Layout:** A 12-column grid. Sidebar navigation is fixed (approx 240px), while the main content area expands. 
- **Card Hierarchy:** Large "Overview" cards span 3 or 4 columns. Secondary "Detail" cards or lists span 6 or 8 columns.
- **Mobile Reflow:** On mobile (<768px), all columns collapse to a single-stack layout. Sidebars transform into a bottom-tab bar or a burger-menu overlay. Margin scales down to 16px.

## Elevation & Depth

We avoid heavy shadows in favor of **Tonal Layering** and **Micro-Borders**. This creates a "flat-plus" aesthetic that feels lighter and more modern.

- **Level 0 (Surface):** The main background (`#F8F9FA`).
- **Level 1 (Cards):** Pure white (`#FFFFFF`) cards with a subtle 1px border in a very light grey (`#E9ECEF`).
- **Elevation Shadows:** Use a single, very soft "ambient" shadow for interactive elements like cards and dropdowns: `0px 4px 20px rgba(0, 0, 0, 0.03)`.
- **Active State:** When an element is focused or active, use a 2px inner-glow or a stronger border rather than a larger shadow.
- **Glassmorphism:** Use sparingly for floating action buttons or navigation overlays, with a `blur: 12px` and `80%` opacity white fill.

## Shapes

The shape language is "Softly Geometric." We avoid the clinical feel of sharp corners while steering clear of overly bubbly "consumer" rounds.

- **Standard Radius:** 8px (`0.5rem`) for cards, input fields, and buttons.
- **Large Radius:** 16px (`1rem`) for large dashboard containers or "Pro" upgrade banners.
- **Pill:** Reserved exclusively for status tags (e.g., "Active", "Secured") and segment controls.

## Components

### Buttons
- **Primary:** Solid dark (`#1A1A1A`), white text, 8px radius.
- **Secondary:** White background, 1px light grey border, dark text.
- **Ghost:** No background/border, dark text, used for secondary dashboard actions.

### Cards & Metrics
- Dashboard cards must have a 24px internal padding.
- Key metrics (e.g., "Voice Threats Blocked") use `headline-lg` for the number and `label-sm` for the category.
- Sparkline charts within cards should be monochromatic to the primary color.

### Input Fields
- Subtle grey borders that transition to a 1px primary-color border on focus.
- Labels are always positioned above the field using `label-md` in a medium-grey.

### Tables
- No vertical borders. Horizontal borders only, using the lightest grey.
- Hover state: Background change to a very light tint of the primary color (`#F1F3F5`).

### Chips/Badges
- Small, uppercase text. Background colors should be highly desaturated versions of the status color (e.g., soft light red for "Critical").