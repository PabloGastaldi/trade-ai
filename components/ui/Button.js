const variants = {
  // Default primary action — charcoal, per Parte C (orange reserved for AI/CTA primary)
  primary: 'bg-on-surface text-on-primary hover:bg-on-surface/90',
  // Explicit AI / primary CTA accent — the one orange button per viewport
  ai: 'bg-primary text-on-primary hover:bg-primary-intense',
  secondary: 'bg-surface-1 text-on-surface border border-hairline hover:bg-surface-high',
  ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-high',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  loading = false,
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-md font-body font-medium
        transition-colors duration-150 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
