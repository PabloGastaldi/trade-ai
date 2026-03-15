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
        'bg-primary':   '#0a0a0a',
        'bg-secondary': '#111111',
        'bg-tertiary':  '#1a1a1a',
        // Acento naranja
        'accent':       '#FF6B35',
        'accent-hover': '#FF8C5A',
        'accent-muted': 'rgba(255,107,53,0.12)',
        // Bordes
        'border-base':  '#1e1e1e',
        'border-light': '#2a2a2a',
        // Texto
        'text-primary':   '#FFFFFF',
        'text-secondary': '#9CA3AF',
        'text-muted':     '#6B7280',
        // Legados (para compatibilidad con var() en globals)
        background: "var(--bg)",
        foreground: "var(--text)",
      },
    },
  },
  plugins: [],
};
