const variants = {
  primary: 'bg-primary-intense text-on-primary hover:shadow-[0_0_20px_rgba(221,217,42,0.2)]',
  secondary: 'bg-white/[0.05] text-on-surface hover:bg-white/[0.08] border border-white/[0.08]',
  ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-white/[0.04]',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
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
        inline-flex items-center justify-center gap-2 rounded-xl font-body font-semibold
        transition-all duration-150 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
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
