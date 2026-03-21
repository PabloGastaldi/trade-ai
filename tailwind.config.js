/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#0c0e12',
        'surface-low': '#111318',
        'surface-container': '#171a1f',
        'surface-high': '#1d2025',
        'surface-highest': '#23262c',
        primary: '#81e9ff',
        'primary-intense': '#00e0ff',
        'on-surface': '#f6f6fc',
        'on-surface-variant': '#aaabb0',
        'on-primary': '#00363f',
        accent: '#81e9ff',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
      },
    },
  },
  plugins: [],
}
