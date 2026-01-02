---
name: apple-design
description: Apple風のミニマル・洗練されたデザインを作成。Webサイト、ランディングページ、ダッシュボード、React/HTML UIコンポーネント作成時に使用。SF Proフォント、Appleカラーパレット、8ptグリッド、Glass morphism、ダークモード対応のガイドライン付き。
---

# Apple Design

Apple Human Interface Guidelinesに基づいた、ミニマルで洗練されたWebデザインを作成するためのスキル。

## Core Principles

1. **Clarity** - コンテンツが主役。UIは透明であるべき
2. **Deference** - 控えめなUI。コンテンツを邪魔しない
3. **Depth** - レイヤーと動きで空間的な階層を表現

## Colors

### System Colors

```css
/* Primary Actions */
--apple-blue: #007AFF;
--apple-green: #34C759;
--apple-red: #FF3B30;
--apple-orange: #FF9500;
--apple-yellow: #FFCC00;
--apple-teal: #5AC8FA;
--apple-pink: #FF2D55;
--apple-purple: #AF52DE;
--apple-indigo: #5856D6;
```

### Background Colors

```css
/* Light Mode */
--bg-primary-light: #FFFFFF;
--bg-secondary-light: #F2F2F7;
--bg-tertiary-light: #E5E5EA;

/* Dark Mode */
--bg-primary-dark: #000000;
--bg-secondary-dark: #1C1C1E;
--bg-tertiary-dark: #2C2C2E;
--bg-elevated-dark: #3A3A3C;
```

### Text Colors

```css
/* Light Mode */
--text-primary-light: #000000;
--text-secondary-light: #3C3C43 / 60%;
--text-tertiary-light: #3C3C43 / 30%;

/* Dark Mode */
--text-primary-dark: #FFFFFF;
--text-secondary-dark: #EBEBF5 / 60%;
--text-tertiary-dark: #EBEBF5 / 30%;
```

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;

/* Monospace */
font-family: 'SF Mono', ui-monospace, 'Menlo', 'Monaco', monospace;
```

### Type Scale (8pt Grid)

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Large Title | 34px | Bold | 41px | Page headers |
| Title 1 | 28px | Bold | 34px | Section headers |
| Title 2 | 22px | Bold | 28px | Subsections |
| Title 3 | 20px | Semibold | 25px | Card titles |
| Headline | 17px | Semibold | 22px | Emphasis |
| Body | 17px | Regular | 22px | Main content |
| Callout | 16px | Regular | 21px | Secondary |
| Subhead | 15px | Regular | 20px | Labels |
| Footnote | 13px | Regular | 18px | Captions |
| Caption 1 | 12px | Regular | 16px | Metadata |
| Caption 2 | 11px | Regular | 13px | Timestamps |

## Spacing (8pt Grid)

```css
--space-1: 4px;   /* Tight */
--space-2: 8px;   /* Default small */
--space-3: 12px;  /* Comfortable */
--space-4: 16px;  /* Default */
--space-5: 20px;  /* Roomy */
--space-6: 24px;  /* Section */
--space-8: 32px;  /* Large section */
--space-10: 40px; /* Page margins */
--space-12: 48px; /* Major sections */
```

## Border Radius

```css
--radius-xs: 4px;   /* Tags, small elements */
--radius-sm: 8px;   /* Buttons, inputs */
--radius-md: 12px;  /* Cards, dialogs */
--radius-lg: 16px;  /* Modal, large cards */
--radius-xl: 22px;  /* Pills, toggles */
--radius-full: 9999px; /* Circular */
```

## Shadows

```css
/* Subtle elevation */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);

/* Card elevation */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08),
             0 1px 3px rgba(0, 0, 0, 0.06);

/* Modal/Popup */
--shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12),
             0 4px 12px rgba(0, 0, 0, 0.08);

/* Dark mode adjustments - use 0.3-0.5 opacity */
```

## Glass Morphism (Vibrancy)

```css
/* Light mode glass */
.glass-light {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

/* Dark mode glass */
.glass-dark {
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

/* Ultra-thin material */
.glass-ultra-thin {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(40px) saturate(200%);
}
```

## Animation

### Timing Functions

```css
--ease-default: cubic-bezier(0.25, 0.1, 0.25, 1);
--ease-in: cubic-bezier(0.42, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.58, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Duration

```css
--duration-instant: 100ms;  /* Hover, active states */
--duration-fast: 200ms;     /* Buttons, toggles */
--duration-normal: 300ms;   /* Cards, modals */
--duration-slow: 500ms;     /* Page transitions */
```

### Common Patterns

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Scale up */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Slide up */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Component Patterns

### Button

```tsx
<button className="
  px-5 py-2.5
  bg-[#007AFF] text-white
  rounded-xl font-semibold text-[15px]
  transition-all duration-200
  hover:bg-[#0066CC]
  active:scale-[0.98]
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Continue
</button>
```

### Card

```tsx
<div className="
  bg-white dark:bg-[#1C1C1E]
  rounded-2xl p-5
  shadow-[0_4px_12px_rgba(0,0,0,0.08)]
  dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]
">
  {/* Content */}
</div>
```

### Input

```tsx
<input className="
  w-full px-4 py-3
  bg-[#F2F2F7] dark:bg-[#2C2C2E]
  rounded-xl text-[17px]
  border-none outline-none
  placeholder:text-[#3C3C43]/60
  focus:ring-2 focus:ring-[#007AFF]/50
  transition-all duration-200
"/>
```

## Resources

- **Detailed reference**: See `references/design-system.md` for comprehensive CSS patterns
- **Tailwind preset**: Copy `assets/tailwind-apple-preset.css` to your project
- **Components**: See `assets/components/` for ready-to-use React components
