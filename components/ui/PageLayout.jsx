export default function PageLayout({ title, subtitle, children }) {
  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <header>
        <h1 className="font-body text-2xl font-semibold text-on-surface">
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
