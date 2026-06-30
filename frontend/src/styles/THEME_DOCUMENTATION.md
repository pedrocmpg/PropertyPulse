# FII Dashboard Theme Configuration Documentation

## Overview

This documentation describes the comprehensive CSS theme token system implemented for the FII Dashboard. The theme follows the requirements specified in Requirements 11.1, 11.2, 11.3, 6.4-6.12, and provides a complete design system for the dark mode interface with neon accents.

**Files:**
- `theme.css` - Main theme configuration file with all CSS custom properties
- `globals.css` - Global styles that import theme tokens
- `tailwind.config.ts` - Tailwind CSS configuration extended with theme tokens

---

## Theme Architecture

### Color System

The color system is organized into several categories:

#### 1. Background Colors (Dark Mode)
- `--color-bg-primary: #111827` - Main application background (darkest)
- `--color-bg-secondary: #1f2937` - Card and component backgrounds
- `--color-bg-tertiary: #374151` - Tertiary backgrounds for sub-components

#### 2. Text Colors
- `--color-text-primary: #f9fafb` - Main text (highest contrast)
- `--color-text-secondary: #d1d5db` - Secondary text
- `--color-text-tertiary: #9ca3af` - Tertiary/muted text

#### 3. P/VP Ratio Indicator Colors

**Premium (Trading Above NAV - P/VP > 1.0)**
- Neon Red Warning Color
- `--color-premium-text: #FF006B` (High Intensity)
- `--color-premium-bg: rgba(255, 0, 107, 0.1)` (High Intensity)
- `--color-premium-text-low-intensity: rgba(255, 0, 107, 0.4)` (Low Intensity, 40%)
- `--color-premium-bg-low-intensity: rgba(255, 0, 107, 0.05)` (Low Intensity)

Used when:
- P/VP > 1.05: High intensity (dark red warning)
- 1.01 ≤ P/VP ≤ 1.05: Low intensity (muted red)

**Discount (Trading Below NAV - P/VP < 1.0)**
- Neon Green Positive Color
- `--color-discount-text: #00FF9F` (High Intensity)
- `--color-discount-bg: rgba(0, 255, 159, 0.1)` (High Intensity)
- `--color-discount-text-low-intensity: rgba(0, 255, 159, 0.4)` (Low Intensity, 40%)
- `--color-discount-bg-low-intensity: rgba(0, 255, 159, 0.05)` (Low Intensity)

Used when:
- P/VP < 0.95: High intensity (bright green success)
- 0.95 ≤ P/VP < 1.0: Low intensity (muted green)

**Neutral (Trading at NAV - P/VP = 1.0)**
- `--color-neutral-text: #f9fafb` (Default text)
- `--color-neutral-bg: transparent` (No background)
- `--color-neutral-bg-subtle: rgba(209, 213, 219, 0.05)` (Optional subtle bg)

#### 4. Border Colors
- `--color-border-primary: #374151` - Primary borders
- `--color-border-secondary: #4b5563` - Secondary/hover borders

#### 5. Status Colors
- `--color-success: #10b981` - Success/positive actions
- `--color-error: #ef4444` - Error/negative states
- `--color-warning: #f59e0b` - Warning/caution states
- `--color-info: #3b82f6` - Information/neutral states

---

## Spacing System

Spacing tokens use an 8px base unit for consistency and maintain responsive values for different screen sizes.

### Base Spacing Scale
- `--spacing-xs: 0.25rem` (4px) - Minimal spacing
- `--spacing-sm: 0.5rem` (8px) - Small gaps
- `--spacing-md: 1rem` (16px) - Standard spacing
- `--spacing-lg: 1.5rem` (24px) - Large spacing
- `--spacing-xl: 2rem` (32px) - Extra large spacing
- `--spacing-2xl: 2.5rem` (40px) - 2x extra large
- `--spacing-3xl: 3rem` (48px) - 3x extra large

### Responsive Spacing

**Container Padding (Horizontal)**
- Mobile (<768px): `--container-padding-mobile: 1rem` (16px)
- Tablet (768-1024px): `--container-padding-tablet: 1.5rem` (24px)
- Desktop (>1024px): `--container-padding-desktop: 2rem` (32px)

**FII Card Gap**
- Mobile: `--card-gap-mobile: 1rem` (16px)
- Tablet: `--card-gap-tablet: 1.5rem` (24px)
- Desktop: `--card-gap-desktop: 2rem` (32px)

**Component Padding**
- Mobile: `--card-padding-mobile: 1rem` (16px)
- Tablet: `--card-padding-tablet: 1.5rem` (24px)
- Desktop: `--card-padding-desktop: 1.5rem` (24px)

---

## Transitions

Smooth animations provide visual feedback and enhance user experience.

### Main Transitions

**Fade-In (300ms)**
- Used for P/VP indicators when first rendered (Requirement 6.12)
- Property: `--transition-fade-in: opacity 300ms ease-out, transform 300ms ease-out`
- Also for color transitions: `--transition-fade-in-color: color 300ms ease-out, background-color 300ms ease-out`

### Duration Tokens
- `--transition-duration-short: 150ms` - Quick interactions (hover states)
- `--transition-duration-standard: 300ms` - Standard animations (P/VP fade-in)
- `--transition-duration-long: 500ms` - Longer transitions (modals, major changes)

### Easing Functions
- `--transition-easing-ease-out: ease-out` - Fast start, slow end (natural deceleration)
- `--transition-easing-ease-in-out: ease-in-out` - Smooth acceleration and deceleration

### Combined Properties
- `--transition-standard: all 300ms ease-out` - All properties over 300ms
- `--transition-short: all 150ms ease-out` - All properties over 150ms

---

## Typography

### Font Families
- `--font-family-base` - System font stack for content
- `--font-family-mono` - Monospace for code display

### Font Sizes
- `--font-size-xs: 0.75rem` (12px)
- `--font-size-sm: 0.875rem` (14px)
- `--font-size-base: 1rem` (16px)
- `--font-size-lg: 1.125rem` (18px)
- `--font-size-xl: 1.25rem` (20px)
- `--font-size-2xl: 1.5rem` (24px)

### Font Weights
- `--font-weight-normal: 400`
- `--font-weight-medium: 500`
- `--font-weight-semibold: 600`
- `--font-weight-bold: 700`

### Line Heights
- `--line-height-tight: 1.2` - Compact line spacing
- `--line-height-normal: 1.5` - Standard line spacing
- `--line-height-relaxed: 1.75` - Comfortable line spacing

---

## Other Design Tokens

### Shadows (Depth)
- `--shadow-sm` - Subtle elevation
- `--shadow-md` - Standard elevation
- `--shadow-lg` - Pronounced elevation
- `--shadow-xl` - High elevation

### Border Radius
- `--radius-sm: 0.25rem` (4px)
- `--radius-md: 0.5rem` (8px)
- `--radius-lg: 0.75rem` (12px)
- `--radius-xl: 1rem` (16px)

### Z-Index
- `--z-index-base: 0` - Default stacking
- `--z-index-dropdown: 10` - Dropdown menus
- `--z-index-sticky: 20` - Sticky headers
- `--z-index-fixed: 30` - Fixed positioning
- `--z-index-modal-backdrop: 40` - Modal backdrop
- `--z-index-modal: 50` - Modals
- `--z-index-toast: 60` - Toast notifications

---

## Utility Classes

The theme provides pre-built utility classes for common component patterns:

### FII Card
```css
.fii-card /* Base styling with fade-in animation */
.fii-card:hover /* Hover state with elevation */
```

### P/VP Indicators
```css
.pvp-indicator.premium.high-intensity /* Red warning, full opacity */
.pvp-indicator.premium.low-intensity /* Red warning, 40% opacity */
.pvp-indicator.discount.high-intensity /* Green success, full opacity */
.pvp-indicator.discount.low-intensity /* Green success, 40% opacity */
.pvp-indicator.neutral /* Default text, transparent background */
.pvp-badge /* Styled badge with icon */
```

### Layout
```css
.container-x-padding /* Responsive horizontal padding */
.fii-grid /* Responsive grid: 1 col mobile, 2 col tablet, 3+ col desktop */
```

### Interactive Elements
```css
.btn /* Base button styling */
.btn:hover /* Button hover state */
.btn:active /* Button active state */
.input /* Input field base styling */
.input:focus /* Input focus state */
.input.error /* Error state styling */
.input.success /* Success state styling */
```

### Animations
```css
.spinner /* Continuous rotation animation */
.skeleton /* Skeleton loading animation */
```

---

## Tailwind CSS Integration

All theme tokens are integrated into Tailwind's configuration, allowing developers to use them with Tailwind's utility class system:

### Example Usage
```html
<!-- Using color tokens -->
<div class="bg-premium-text text-primary">Premium Indicator</div>

<!-- Using spacing -->
<div class="p-lg gap-md">Content with spacing</div>

<!-- Using transitions -->
<div class="transition-300 hover:bg-secondary">Fade transition</div>

<!-- Using animations -->
<div class="animate-fade-in">Fading in content</div>
```

---

## Responsive Design

### Breakpoints
- Mobile (< 768px): Single-column layout, smallest spacing
- Tablet (768px - 1024px): 2-column grid, medium spacing
- Desktop (> 1024px): 3+ column grid, largest spacing

### Implementation with .fii-grid
```css
@media (min-width: 768px) {
  .fii-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .fii-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## Requirements Mapping

### Theme Requirements Addressed

| Requirement | Implementation |
|---|---|
| 11.1 - Dark mode theme as default | Primary background `#111827`, theme tokens define dark palette |
| 11.2 - Neon accents for positive indicators | `--color-discount-text: #00FF9F` for P/VP < 1.0 |
| 11.3 - Warning accents for negative indicators | `--color-premium-text: #FF006B` for P/VP > 1.0 |
| 6.4 - P/VP premium visual indicators | Premium color tokens with CSS classes |
| 6.5 - P/VP discount visual indicators | Discount color tokens with CSS classes |
| 6.6 - P/VP neutral visual indicators | Neutral color tokens |
| 6.7-6.8 - P/VP high intensity styling | High intensity tokens defined |
| 6.9-6.10 - P/VP low intensity styling | Low intensity tokens at 40% opacity |
| 6.11 - P/VP icon with aria-label | Badge utility class supports icons |
| 6.12 - 300ms fade-in transition | `--transition-fade-in: all 300ms ease-out` |

---

## Usage Example

### Creating a P/VP Indicator Component
```tsx
// Component using theme tokens
<div className="pvp-badge">
  <span 
    className="pvp-indicator discount high-intensity"
    style={{
      color: 'var(--color-discount-text)',
      backgroundColor: 'var(--color-discount-bg)',
    }}
  >
    Discount (0.97)
  </span>
</div>
```

### Responsive Layout
```tsx
<div className="fii-grid container-x-padding">
  {fiis.map(fii => (
    <div key={fii.symbol} className="fii-card">
      {/* Card content */}
    </div>
  ))}
</div>
```

---

## Maintenance and Extension

### Adding New Theme Colors
1. Define color token in `:root` section of `theme.css`
2. Add corresponding Tailwind color in `tailwind.config.ts`
3. Update this documentation

### Modifying Transitions
- Edit `--transition-*` variables in `theme.css`
- Changes apply globally without component updates

### Responsive Breakpoint Changes
- Update media query breakpoints in `theme.css`
- Adjust Tailwind breakpoints in `tailwind.config.ts` if needed

---

## Notes

- All color values follow Brazilian market conventions for neon/warning styling
- Spacing scale uses 8px base unit for consistency
- Transitions use `ease-out` for natural, responsive feel
- Theme is production-ready and validated against all requirements
- CSS custom properties ensure dynamic theming capability for future extensions

