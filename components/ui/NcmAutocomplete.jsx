'use client'

import { useState, useRef, useEffect } from 'react'

export default function NcmAutocomplete({ value, onSelect, error, showDescription = false }) {
  const [inputVal, setInputVal] = useState(value ?? '')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [visible, setVisible] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const debounceRef = useRef(null)
  const wrapRef = useRef(null)

  // Sincronizar si el padre cambia el valor (ej: reset del form)
  useEffect(() => {
    setInputVal(value ?? '')
    if (!value) setDescripcion('')
  }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setVisible(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(val) {
    setInputVal(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setSugerencias([]); setVisible(false); return }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/ncm-search?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        setSugerencias(data ?? [])
        setVisible((data ?? []).length > 0)
      } catch {
        // silencioso
      } finally {
        setBuscando(false)
      }
    }, 300)
  }

  function handleSelect(item) {
    setInputVal(item.ncm_code)
    setSugerencias([])
    setVisible(false)
    if (showDescription) setDescripcion(item.description ?? '')
    onSelect(item)
  }

  return (
    <div ref={wrapRef}>
      <input
        className={`w-full bg-surface-highest rounded-xl px-4 py-3 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 border outline-none transition-all duration-150 ${
          error ? 'border-red-500/50' : 'border-transparent focus:border-primary/40'
        }`}
        type="text"
        placeholder="Código NCM o descripción..."
        value={inputVal}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => sugerencias.length > 0 && setVisible(true)}
        autoComplete="off"
      />
      <div className="relative">
        {buscando && (
          <p className="mt-1 font-body text-[10px] text-on-surface-variant/50">Buscando…</p>
        )}
        {visible && (
          <div className="absolute top-1 left-0 right-0 z-50 bg-surface-low rounded-xl border border-white/[0.06] shadow-xl overflow-hidden">
            {sugerencias.map(s => (
              <button
                key={s.ncm_code}
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                onClick={() => handleSelect(s)}
              >
                <span className="font-mono text-xs text-primary block">{s.ncm_code}</span>
                <span className="font-body text-[11px] text-on-surface-variant line-clamp-1">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {showDescription && descripcion && !visible && (
        <p className="mt-1 font-body text-[10px] text-on-surface-variant/60">{descripcion}</p>
      )}
      {error && <p className="mt-1 font-body text-[10px] text-red-400">{error}</p>}
    </div>
  )
}
