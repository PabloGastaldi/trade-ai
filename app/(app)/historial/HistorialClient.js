'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './historial.module.css'

function formatFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function truncar(texto, max = 120) {
  if (!texto) return ''
  return texto.length > max ? texto.slice(0, max).trimEnd() + '…' : texto
}

export default function HistorialClient({ consultasIniciales, totalInicial, porPagina }) {
  const [consultas, setConsultas] = useState(consultasIniciales)
  const [total, setTotal] = useState(totalInicial)
  const [pagina, setPagina] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [buscandoDebounce, setBuscandoDebounce] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [cargando, setCargando] = useState(false)

  const totalPaginas = Math.ceil(total / porPagina)

  // Debounce búsqueda
  useEffect(() => {
    const t = setTimeout(() => setBuscandoDebounce(busqueda), 350)
    return () => clearTimeout(t)
  }, [busqueda])

  // Re-fetch cuando cambia búsqueda o página
  const fetchConsultas = useCallback(async () => {
    setCargando(true)
    const supabase = createClient()

    let query = supabase
      .from('queries_log')
      .select('id, query_text, response_text, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pagina * porPagina, (pagina + 1) * porPagina - 1)

    if (buscandoDebounce.trim()) {
      query = query.ilike('query_text', `%${buscandoDebounce.trim()}%`)
    }

    const { data, count, error } = await query

    if (!error) {
      setConsultas(data ?? [])
      setTotal(count ?? 0)
    }
    setCargando(false)
  }, [pagina, buscandoDebounce, porPagina])

  // No re-fetch en el primer render (ya tenemos datos SSR)
  const [montado, setMontado] = useState(false)
  useEffect(() => {
    if (!montado) { setMontado(true); return }
    fetchConsultas()
  }, [fetchConsultas, montado])

  // Reset página al buscar
  useEffect(() => {
    setPagina(0)
    setExpandido(null)
  }, [buscandoDebounce])

  function toggleExpandido(id) {
    setExpandido(prev => prev === id ? null : id)
  }

  return (
    <div className={styles.page}>
      {/* Header de sección */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>Historial</h1>
          <p className={styles.subtitulo}>
            {total > 0 ? `${total} consulta${total !== 1 ? 's' : ''} realizadas` : 'Sin consultas aún'}
          </p>
        </div>

        {/* Buscador */}
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar consultas..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className={styles.searchClear} onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className={`${styles.lista} ${cargando ? styles.cargando : ''}`}>
        {consultas.length === 0 && !cargando ? (
          <EstadoVacio busqueda={buscandoDebounce} />
        ) : (
          consultas.map(c => (
            <div key={c.id} className={styles.item} onClick={() => toggleExpandido(c.id)}>
              <div className={styles.itemHeader}>
                <div className={styles.itemMeta}>
                  <span className={styles.itemFecha}>{formatFecha(c.created_at)}</span>
                </div>
                <svg
                  className={`${styles.chevron} ${expandido === c.id ? styles.chevronOpen : ''}`}
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              <div className={styles.itemPregunta}>
                {expandido === c.id ? c.query_text : truncar(c.query_text, 140)}
              </div>

              {expandido !== c.id && c.response_text && (
                <div className={styles.itemPreview}>
                  {truncar(c.response_text, 100)}
                </div>
              )}

              {expandido === c.id && (
                <div className={styles.itemRespuesta}>
                  <div className={styles.itemRespuestaLabel}>Respuesta de trade.ai</div>
                  <div className={styles.itemRespuestaTexto}>{c.response_text}</div>
                  <div className={styles.disclaimer}>
                    <span className={styles.disclaimerIcon}>⚠</span>
                    La información es orientativa y está respaldada por documentos oficiales públicos.
                    No reemplaza el asesoramiento de un despachante de aduana habilitado.
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className={styles.paginacion}>
          <button
            className={styles.paginaBtn}
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0 || cargando}
          >
            ← Anterior
          </button>

          <div className={styles.paginaInfo}>
            {Array.from({ length: Math.min(totalPaginas, 7) }, (_, i) => {
              // Mostrar páginas alrededor de la actual
              const medio = Math.min(Math.max(pagina, 3), totalPaginas - 4)
              const num = totalPaginas <= 7 ? i : i + Math.max(0, medio - 3)
              if (num >= totalPaginas) return null
              return (
                <button
                  key={num}
                  className={`${styles.paginaNum} ${pagina === num ? styles.paginaNumActiva : ''}`}
                  onClick={() => setPagina(num)}
                  disabled={cargando}
                >
                  {num + 1}
                </button>
              )
            })}
          </div>

          <button
            className={styles.paginaBtn}
            onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
            disabled={pagina >= totalPaginas - 1 || cargando}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

function EstadoVacio({ busqueda }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        {busqueda ? '🔍' : '📋'}
      </div>
      <div style={{ fontFamily: 'var(--font-syne)', fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.5rem' }}>
        {busqueda ? 'Sin resultados' : 'Sin consultas aún'}
      </div>
      <div style={{ fontSize: '0.875rem' }}>
        {busqueda
          ? `No encontramos consultas que contengan "${busqueda}"`
          : 'Tus consultas aparecerán acá una vez que las realices'}
      </div>
    </div>
  )
}
