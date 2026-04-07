/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#1A191C',
        'surface-low': '#1f1e21',
        'surface-container': '#242327',
        'surface-high': '#2a292e',
        'surface-highest': '#313035',
        primary: '#DDD92A',
        'primary-intense': '#EAE151',
        'on-surface': '#F5F5F5',
        'on-surface-variant': '#9E9DA0',
        'on-primary': '#1A191C',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        logo: ['var(--font-logo)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
