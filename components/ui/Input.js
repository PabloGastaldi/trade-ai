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
          w-full bg-surface-1 rounded-md px-4 py-3
          font-mono text-sm text-on-surface placeholder:text-ink-tertiary
          border outline-none transition-colors duration-150
          ${error
            ? 'border-red-400 focus:border-red-500'
            : 'border-hairline focus:border-on-surface'
          }
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="mt-1 font-body text-[10px] text-ink-subtle">{hint}</p>
      )}
      {error && (
        <p className="mt-1 font-body text-[10px] text-red-600">{error}</p>
      )}
    </div>
  )
}
