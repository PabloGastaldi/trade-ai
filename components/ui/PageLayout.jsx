export default function PageLayout({ title, subtitle, children }) {
  return (
    <div className="px-6 py-6 max-w-6xl">
      <header>
        <h1 className="font-display text-3xl tracking-wider uppercase text-on-surface">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body text-sm text-on-surface-variant mt-1">
            {subtitle}
          </p>
        )}
      </header>
      <div className="h-px bg-white/[0.04] my-6" />
      {children}
    </div>
  )
}
