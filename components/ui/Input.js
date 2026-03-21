export default function Input({
  label,
  hint,
  error,
  className = '',
  containerClassName = '',
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block font-body text-xs text-on-surface-variant mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`
          w-full bg-surface-highest rounded-xl px-4 py-3
          font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40
          border outline-none transition-all duration-150
          ${error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-transparent focus:border-primary/40'
          }
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1 font-body text-[10px] text-on-surface-variant/60">{hint}</p>
      )}
      {error && (
        <p className="mt-1 font-body text-[10px] text-red-400">{error}</p>
      )}
    </div>
  )
}
