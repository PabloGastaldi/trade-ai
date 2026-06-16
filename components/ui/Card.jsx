const variants = {
  default: 'bg-surface-1 border border-hairline',
  highlighted: 'bg-surface-1 border border-primary/30',
  glass: 'bg-surface-1/80 backdrop-blur-xl border border-hairline',
}

export default function Card({ variant = 'default', className = '', children, onClick }) {
  return (
    <div className={`rounded-lg p-6 ${variants[variant]} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
