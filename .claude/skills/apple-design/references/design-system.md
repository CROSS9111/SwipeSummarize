# Apple Design System - Detailed Reference

## Table of Contents

1. [Complete Color System](#complete-color-system)
2. [Typography System](#typography-system)
3. [Layout Patterns](#layout-patterns)
4. [Component Library](#component-library)
5. [Dark Mode Implementation](#dark-mode-implementation)
6. [Responsive Design](#responsive-design)
7. [Accessibility](#accessibility)

---

## Complete Color System

### Semantic Colors

```css
:root {
  /* System Colors */
  --color-blue: #007AFF;
  --color-green: #34C759;
  --color-indigo: #5856D6;
  --color-orange: #FF9500;
  --color-pink: #FF2D55;
  --color-purple: #AF52DE;
  --color-red: #FF3B30;
  --color-teal: #5AC8FA;
  --color-yellow: #FFCC00;

  /* Grayscale */
  --gray-1: #8E8E93;
  --gray-2: #AEAEB2;
  --gray-3: #C7C7CC;
  --gray-4: #D1D1D6;
  --gray-5: #E5E5EA;
  --gray-6: #F2F2F7;
}

/* Dark Mode Variants */
[data-theme="dark"] {
  --color-blue: #0A84FF;
  --color-green: #30D158;
  --color-indigo: #5E5CE6;
  --color-orange: #FF9F0A;
  --color-pink: #FF375F;
  --color-purple: #BF5AF2;
  --color-red: #FF453A;
  --color-teal: #64D2FF;
  --color-yellow: #FFD60A;

  --gray-1: #8E8E93;
  --gray-2: #636366;
  --gray-3: #48484A;
  --gray-4: #3A3A3C;
  --gray-5: #2C2C2E;
  --gray-6: #1C1C1E;
}
```

### Gradient Patterns

```css
/* Apple-style gradients */
.gradient-blue {
  background: linear-gradient(180deg, #42A5F5 0%, #007AFF 100%);
}

.gradient-purple {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gradient-sunset {
  background: linear-gradient(135deg, #FF9500 0%, #FF2D55 100%);
}

.gradient-mesh {
  background:
    radial-gradient(at 40% 20%, #007AFF 0px, transparent 50%),
    radial-gradient(at 80% 0%, #5856D6 0px, transparent 50%),
    radial-gradient(at 0% 50%, #FF2D55 0px, transparent 50%),
    radial-gradient(at 80% 50%, #34C759 0px, transparent 50%),
    radial-gradient(at 0% 100%, #FF9500 0px, transparent 50%);
}
```

---

## Typography System

### CSS Custom Properties

```css
:root {
  /* Font Stacks */
  --font-system: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
                 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', ui-monospace, 'Menlo', 'Monaco',
               'Cascadia Mono', monospace;
  --font-serif: 'New York', 'Georgia', 'Times New Roman', serif;

  /* Font Sizes */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-md: 17px;
  --text-lg: 20px;
  --text-xl: 22px;
  --text-2xl: 28px;
  --text-3xl: 34px;
  --text-4xl: 48px;

  /* Font Weights */
  --font-regular: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.2;
  --leading-snug: 1.35;
  --leading-normal: 1.47;
  --leading-relaxed: 1.6;

  /* Letter Spacing */
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.02em;
}
```

### Typography Classes

```css
.text-large-title {
  font-size: 34px;
  font-weight: 700;
  line-height: 41px;
  letter-spacing: -0.02em;
}

.text-title-1 {
  font-size: 28px;
  font-weight: 700;
  line-height: 34px;
  letter-spacing: -0.01em;
}

.text-title-2 {
  font-size: 22px;
  font-weight: 700;
  line-height: 28px;
}

.text-title-3 {
  font-size: 20px;
  font-weight: 600;
  line-height: 25px;
}

.text-headline {
  font-size: 17px;
  font-weight: 600;
  line-height: 22px;
}

.text-body {
  font-size: 17px;
  font-weight: 400;
  line-height: 22px;
}

.text-callout {
  font-size: 16px;
  font-weight: 400;
  line-height: 21px;
}

.text-subhead {
  font-size: 15px;
  font-weight: 400;
  line-height: 20px;
}

.text-footnote {
  font-size: 13px;
  font-weight: 400;
  line-height: 18px;
}

.text-caption {
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}
```

---

## Layout Patterns

### Container Widths

```css
.container-sm { max-width: 640px; }
.container-md { max-width: 768px; }
.container-lg { max-width: 1024px; }
.container-xl { max-width: 1280px; }

/* Apple-style centered content */
.container-apple {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 22px;
}

@media (min-width: 1068px) {
  .container-apple {
    padding: 0 90px;
  }
}
```

### Grid System

```css
/* 12-column grid */
.grid-apple {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 20px;
}

/* Common layouts */
.layout-sidebar {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
}

.layout-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
```

### Safe Areas

```css
/* iOS-style safe area handling */
.safe-area-inset {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}

/* Navigation bar height */
.nav-height {
  height: 44px; /* iOS compact */
}

.nav-height-large {
  height: 96px; /* iOS large title */
}
```

---

## Component Library

### Buttons

```tsx
// Primary Button
export function ButtonPrimary({ children, ...props }) {
  return (
    <button
      className="
        inline-flex items-center justify-center
        px-5 py-2.5 min-w-[80px]
        bg-[#007AFF] text-white
        text-[15px] font-semibold
        rounded-[10px]
        transition-all duration-200 ease-out
        hover:bg-[#0066CC]
        active:scale-[0.98] active:bg-[#0055AA]
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 focus:ring-offset-2
      "
      {...props}
    >
      {children}
    </button>
  );
}

// Secondary Button
export function ButtonSecondary({ children, ...props }) {
  return (
    <button
      className="
        inline-flex items-center justify-center
        px-5 py-2.5 min-w-[80px]
        bg-[#F2F2F7] dark:bg-[#2C2C2E]
        text-[#007AFF]
        text-[15px] font-semibold
        rounded-[10px]
        transition-all duration-200 ease-out
        hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C]
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      {...props}
    >
      {children}
    </button>
  );
}

// Destructive Button
export function ButtonDestructive({ children, ...props }) {
  return (
    <button
      className="
        inline-flex items-center justify-center
        px-5 py-2.5 min-w-[80px]
        bg-[#FF3B30] text-white
        text-[15px] font-semibold
        rounded-[10px]
        transition-all duration-200 ease-out
        hover:bg-[#E6352B]
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      {...props}
    >
      {children}
    </button>
  );
}
```

### Cards

```tsx
// Standard Card
export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`
        bg-white dark:bg-[#1C1C1E]
        rounded-2xl
        p-5
        shadow-[0_2px_8px_rgba(0,0,0,0.08)]
        dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// Interactive Card
export function CardInteractive({ children, onClick, ...props }) {
  return (
    <button
      onClick={onClick}
      className="
        w-full text-left
        bg-white dark:bg-[#1C1C1E]
        rounded-2xl
        p-5
        shadow-[0_2px_8px_rgba(0,0,0,0.08)]
        dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]
        transition-all duration-200 ease-out
        hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]
        hover:scale-[1.02]
        active:scale-[0.98]
      "
      {...props}
    >
      {children}
    </button>
  );
}

// Glass Card
export function CardGlass({ children, ...props }) {
  return (
    <div
      className="
        bg-white/70 dark:bg-[#1C1C1E]/70
        backdrop-blur-xl
        saturate-[180%]
        rounded-2xl
        p-5
        border border-white/20 dark:border-white/10
      "
      {...props}
    >
      {children}
    </div>
  );
}
```

### Form Elements

```tsx
// Text Input
export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[13px] font-medium text-[#3C3C43] dark:text-[#EBEBF5]/60">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3
          bg-[#F2F2F7] dark:bg-[#2C2C2E]
          text-[17px] text-[#000000] dark:text-white
          rounded-xl
          border-2 border-transparent
          outline-none
          placeholder:text-[#3C3C43]/40 dark:placeholder:text-[#EBEBF5]/30
          transition-all duration-200
          focus:border-[#007AFF] focus:bg-white dark:focus:bg-[#1C1C1E]
          ${error ? 'border-[#FF3B30]' : ''}
        `}
        {...props}
      />
      {error && (
        <p className="text-[13px] text-[#FF3B30]">{error}</p>
      )}
    </div>
  );
}

// Toggle Switch
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`
            w-[51px] h-[31px]
            rounded-full
            transition-colors duration-200
            ${checked ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-[#3A3A3C]'}
          `}
        />
        <div
          className={`
            absolute top-[2px]
            w-[27px] h-[27px]
            bg-white rounded-full
            shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)]
            transition-transform duration-200
            ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}
          `}
        />
      </div>
      {label && (
        <span className="text-[17px] text-[#000000] dark:text-white">{label}</span>
      )}
    </label>
  );
}

// Segmented Control
export function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="
      inline-flex
      bg-[#E5E5EA] dark:bg-[#3A3A3C]
      rounded-lg p-0.5
    ">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            px-4 py-1.5
            text-[13px] font-medium
            rounded-md
            transition-all duration-200
            ${value === option.value
              ? 'bg-white dark:bg-[#636366] shadow-sm text-[#000000] dark:text-white'
              : 'text-[#3C3C43] dark:text-[#EBEBF5]/60 hover:text-[#000000] dark:hover:text-white'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

---

## Dark Mode Implementation

### CSS Variables Approach

```css
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F2F2F7;
  --bg-tertiary: #E5E5EA;
  --text-primary: #000000;
  --text-secondary: rgba(60, 60, 67, 0.6);
  --text-tertiary: rgba(60, 60, 67, 0.3);
  --separator: rgba(60, 60, 67, 0.12);
}

[data-theme="dark"],
.dark {
  --bg-primary: #000000;
  --bg-secondary: #1C1C1E;
  --bg-tertiary: #2C2C2E;
  --text-primary: #FFFFFF;
  --text-secondary: rgba(235, 235, 245, 0.6);
  --text-tertiary: rgba(235, 235, 245, 0.3);
  --separator: rgba(84, 84, 88, 0.65);
}
```

### React Hook

```tsx
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    setTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return { theme, setTheme, toggleTheme };
}
```

---

## Responsive Design

### Breakpoints

```css
/* Apple-style breakpoints */
@media (max-width: 734px)  { /* iPhone */ }
@media (min-width: 735px) and (max-width: 1068px) { /* iPad */ }
@media (min-width: 1069px) { /* Desktop */ }
```

### Tailwind Config

```js
module.exports = {
  theme: {
    screens: {
      'sm': '375px',   // iPhone SE
      'md': '735px',   // iPad portrait
      'lg': '1069px',  // iPad landscape / Desktop
      'xl': '1440px',  // Large desktop
    },
  },
}
```

---

## Accessibility

### Focus States

```css
/* Custom focus ring */
.focus-ring {
  outline: none;
}

.focus-ring:focus-visible {
  box-shadow:
    0 0 0 3px var(--bg-primary),
    0 0 0 5px var(--color-blue);
}
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### ARIA Patterns

```tsx
// Accessible toggle example
<button
  role="switch"
  aria-checked={isOn}
  aria-label="Enable notifications"
  onClick={toggle}
>
  <span className="sr-only">
    {isOn ? 'Disable' : 'Enable'} notifications
  </span>
</button>
```
