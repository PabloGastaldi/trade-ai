'use client'

import { HelpCircle } from 'lucide-react'
import './AppHeader.css'

/**
 * Topbar del app shell — crema con hairline inferior, breadcrumb a la
 * izquierda y uso de plan + botón de ayuda a la derecha (ver
 * reference-importar.html). No contiene navegación: la navegación vive en
 * el Sidebar / MobileNav.
 */
export default function AppHeader({ section, page, planLabel, usageLabel }) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-crumbs">
          {section && <span>{section}</span>}
          {section && page && <span> · </span>}
          {page && <b>{page}</b>}
        </div>

        <div className="app-header-right">
          {(planLabel || usageLabel) && (
            <span className="app-header-usage">
              {planLabel}
              {planLabel && usageLabel && ' · '}
              {usageLabel}
            </span>
          )}
          <button className="app-header-icon-btn" aria-label="Ayuda">
            <HelpCircle size={17} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </header>
  )
}
