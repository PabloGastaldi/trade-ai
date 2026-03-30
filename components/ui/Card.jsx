const variants = {
  default: 'bg-white/[0.03] border border-white/[0.04]',
  highlighted: 'bg-white/[0.03] border border-primary/20',
  glass: 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.04]',
}

export default function Card({ variant = 'default', className = '', children, onClick }) {
  return (
    <div className={`rounded-2xl p-6 ${variants[variant]} ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}
