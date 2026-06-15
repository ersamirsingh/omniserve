---
name: KitchenMind OS
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#494456'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#7a7488'
  outline-variant: '#cbc3da'
  surface-tint: '#6a23fb'
  primary: '#4900be'
  on-primary: '#ffffff'
  primary-container: '#6311f4'
  on-primary-container: '#d4c5ff'
  inverse-primary: '#cebdff'
  secondary: '#006a64'
  on-secondary: '#ffffff'
  secondary-container: '#61f6ea'
  on-secondary-container: '#006f69'
  tertiary: '#762404'
  on-tertiary: '#ffffff'
  tertiary-container: '#963a1a'
  on-tertiary-container: '#ffbfab'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e8ddff'
  primary-fixed-dim: '#cebdff'
  on-primary-fixed: '#20005e'
  on-primary-fixed-variant: '#5100cf'
  secondary-fixed: '#65f8ed'
  secondary-fixed-dim: '#40dcd1'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#00504b'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390b00'
  on-tertiary-fixed-variant: '#7f2a0a'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
  surface-subtle: '#FDFDFD'
  border-base: '#E2E8F0'
  ai-accent: '#E6F9F8'
  data-blue: '#2563EB'
  success-green: '#10B981'
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
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  mono-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered for efficiency, clarity, and reliability within the high-pressure environment of restaurant operations. It adopts a **Modern Corporate** aesthetic that prioritizes data density without sacrificing visual breathing room. 

The brand personality is authoritative yet helpful—acting as a silent, intelligent partner in the kitchen. By utilizing high-contrast layouts, expansive white space, and a refined technical palette, the system communicates a sense of "operational calm." The visual language moves away from the "dark mode" aesthetic of enthusiast tools toward a professional, enterprise-grade SaaS environment that feels at home in a brightly lit office or a busy commercial kitchen workstation.

## Colors

The palette is anchored by a vibrant **Electric Indigo** primary color, signaling professional-grade technology. This is paired with a **Soft Teal** secondary color specifically reserved for AI-driven insights, automated suggestions, and "smart" kitchen features, creating a distinct visual cue for machine-learning interactions.

The background architecture uses a "layered white" approach: pure `#FFFFFF` for the base canvas and a nearly-white `#FDFDFD` for secondary containers to provide subtle structural differentiation. Neutrals are kept cool-toned to maintain a clean, clinical feel, while `#FF8A63` (Coral) is used sparingly as a tertiary accent for high-priority alerts or urgent kitchen tickets.

## Typography

This design system utilizes a dual-font strategy to balance character with utility. **Hanken Grotesk** is used for headlines to provide a modern, sharp, and slightly tech-forward personality. **Inter** is employed for all body copy, labels, and data visualizations due to its exceptional legibility at small sizes and high x-height, which is critical for reading order lists and inventory tables.

For dense data views (like order history or ingredient lists), use the `body-sm` or `mono-data` roles. Tracking is slightly tightened on headlines to maintain a compact, "designed" feel, while body copy maintains standard spacing for maximum accessibility under varying kitchen lighting conditions.

## Layout & Spacing

The system follows a **Fixed-Fluid Hybrid** grid. The main content area is capped at 1440px for readability on large monitors, while internal dashboard widgets utilize a fluid 12-column system. 

A strict 4px baseline grid ensures vertical rhythm. Dashboards should prioritize horizontal density—allowing kitchen managers to see more information at a glance—while maintaining generous gutters (24px) between distinct modules to prevent cognitive overload. On mobile devices, the side margins contract to 16px, and complex data tables should transform into stacked card views.

## Elevation & Depth

Visual hierarchy is established through **Low-Contrast Outlines** and **Tonal Layering** rather than heavy shadows. The primary method of separation is a 1px border using `#E2E8F0`. 

For interactive elements or floating modals, a "Whisper Shadow" is used: a very soft, multi-layered shadow with zero spread and high blur (e.g., `0 4px 20px rgba(0, 0, 0, 0.04)`). Surfaces that require the user's immediate attention (like active order cards) use a subtle vertical lift, while inactive or background containers remain flat with a light grey stroke. AI-suggested content uses a background tint of `ai-accent` (#E6F9F8) instead of elevation to signify its "smart" nature.

## Shapes

The design system uses a **Rounded** corner language (8px base) to soften the industrial feel of the data. This radius is applied to buttons, input fields, and standard cards. Larger containers, such as dashboard sections, should scale to `rounded-lg` (16px) to create a clear container hierarchy. Interactive icons and status indicators (chips) use a fully pill-shaped radius to distinguish them from structural elements.

## Components

### Buttons
- **Primary:** Solid Indigo (#6311F4) with white text. 8px radius.
- **Secondary:** White background with Indigo border and text. 
- **AI-Action:** Teal gradient or solid Teal (#00C2B8) to indicate automated processing.

### Inputs & Fields
- Fields use a white background with an `#E2E8F0` border. On focus, the border transitions to Primary Indigo with a 3px soft indigo glow.
- Labels sit above the field in `label-sm` Inter, using a mid-grey color to maintain hierarchy.

### Cards & Modules
- Base containers use a white background, 1px `#E2E8F0` border, and 8px - 16px corner radius.
- "Live" cards (e.g., active orders) feature a 4px left-border accent in the primary or status color.

### Chips & Badges
- Used for order status (e.g., "In Progress," "Ready"). 
- High-chroma background with 10% opacity and 100% opacity text of the same hue for a "modern pill" look.

### Data Tables
- Header rows use `#FDFDFD` with `label-md` typography.
- Row hover states use a very subtle `#F8FAFC` tint to guide the eye without adding visual weight.