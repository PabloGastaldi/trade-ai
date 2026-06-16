'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Sección colapsable con título, badge opcional y contenido.
 * Props:
 *   title       — string, texto del encabezado
 *   defaultOpen — boolean (default true), si arranca abierto
 *   badge       — ReactNode, elemento opcional a la derecha del título
 *   children    — contenido interior
 */
export default function Collapsible({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-hairline rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 bg-surface-1 hover:bg-surface-high transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="font-body text-sm font-semibold text-on-surface tracking-wide">{title}</span>
          {badge}
        </div>
        {open
          ? <ChevronUp size={14} className="text-on-surface-variant shrink-0" />
          : <ChevronDown size={14} className="text-on-surface-variant shrink-0" />
        }
      </button>
      {open && <div className="px-5 py-4">{children}</div>}
    </div>
  )
}
