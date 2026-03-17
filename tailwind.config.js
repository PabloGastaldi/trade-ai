/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondos
        'bg-primary':   '#0a0e1b',
        'bg-secondary': '#111827',
        'bg-tertiary':  '#1a2236',
        // Acento dorado
        'accent':       '#e99f1c',
        'accent-hover': '#f0b030',
        'accent-muted': 'rgba(233,159,28,0.12)',
        // Bordes
        'border-base':  '#1e2d45',
        'border-light': '#2a3f5f',
        // Texto
        'text-primary':   '#e7edf5',
        'text-secondary': '#b8c5d6',
        'text-muted':     '#6b7f96',
        // Legados (para compatibilidad con var() en globals)
        background: "var(--bg)",
        foreground: "var(--text)",
      },
    },
  },
  plugins: [],
};
