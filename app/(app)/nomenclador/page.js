import Link from 'next/link'

export const metadata = { title: 'Nomenclador — trade.ai' }

export default function NomencladorPage() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem', lineHeight: 1 }}>
          📦
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          marginBottom: '0.625rem',
        }}>
          Nomenclador NCM
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--accent)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}>
          Próximamente
        </p>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9375rem',
          color: 'var(--text-dim)',
          lineHeight: 1.65,
          marginBottom: '2rem',
        }}>
          Buscá y navegá las 10.000+ posiciones arancelarias argentinas.
          Consultá aranceles, organismos de control y unidades de medida
          para cualquier NCM.
        </p>
        <Link
          href="/consulta"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--bg)',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            padding: '0.625rem 1.25rem',
            textDecoration: 'none',
            transition: 'background 0.15s',
          }}
        >
          Volver al Chat
        </Link>
      </div>
    </div>
  )
}
