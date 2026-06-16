const variants = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600',
  error: 'bg-red-500/10 text-red-600',
  neutral: 'bg-surface-high text-on-surface-variant',
}

export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <span className={`inline-block font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
