/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces — Intercom editorial light system
        surface: '#f5f1ec',
        'surface-low': '#ffffff',
        'surface-container': '#ffffff',
        'surface-high': '#ebe7e1',
        'surface-highest': '#ebe7e1',
        // Accent — Fin Orange reserved for AI/CTA primary
        primary: '#ff5600',
        'primary-intense': '#e64e00',
        // Type
        'on-surface': '#111111',
        'on-surface-variant': '#626260',
        'on-primary': '#ffffff',
        // New tokens (Intercom vocabulary)
        hairline: '#d3cec6',
        'hairline-soft': '#ebe7e1',
        'ink-subtle': '#7b7b78',
        'ink-tertiary': '#9c9fa5',
        'surface-1': '#ffffff',
        'surface-2': '#ebe7e1',
        canvas: '#f5f1ec',
      },
      fontFamily: {
        // All families resolve to Inter; --font-display and --font-logo
        // are mapped to Inter in globals.css so existing utility classes keep working.
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        logo: ['var(--font-logo)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
