// ─────────────────────────────────────────────────────────────
// RATE LIMITER — Ventana fija en memoria
//
// Uso: una instancia por contexto (middleware, route handler).
// Limitación: no persiste entre instancias serverless.
// Para producción con alto tráfico migrar a Upstash Redis.
//
// Cada entrada: { count: number, resetAt: number (epoch ms) }
// ─────────────────────────────────────────────────────────────

export class RateLimiter {
  /**
   * @param {object} opciones
   * @param {number} opciones.limite    - Máximo de requests permitidos por ventana
   * @param {number} opciones.ventanaMs - Duración de la ventana en milisegundos
   */
  constructor({ limite, ventanaMs }) {
    this.limite    = limite
    this.ventanaMs = ventanaMs
    this._mapa     = new Map() // key → { count, resetAt }
    this._limpiezaEn = Date.now() + ventanaMs * 5 // limpiar cada 5 ventanas
  }

  /**
   * Verifica si la key dada está dentro del límite.
   * @param {string} key - Identificador (IP, userId, etc.)
   * @returns {{ permitido: boolean, restante: number, resetAt: number }}
   */
  check(key) {
    const ahora = Date.now()

    // Limpieza periódica para evitar crecimiento infinito del Map
    if (ahora > this._limpiezaEn) {
      this._limpiar(ahora)
      this._limpiezaEn = ahora + this.ventanaMs * 5
    }

    const entrada = this._mapa.get(key)

    if (!entrada || ahora > entrada.resetAt) {
      this._mapa.set(key, { count: 1, resetAt: ahora + this.ventanaMs })
      return { permitido: true, restante: this.limite - 1, resetAt: ahora + this.ventanaMs }
    }

    if (entrada.count >= this.limite) {
      return { permitido: false, restante: 0, resetAt: entrada.resetAt }
    }

    entrada.count++
    return { permitido: true, restante: this.limite - entrada.count, resetAt: entrada.resetAt }
  }

  // Elimina entradas expiradas
  _limpiar(ahora) {
    for (const [key, entrada] of this._mapa) {
      if (ahora > entrada.resetAt) this._mapa.delete(key)
    }
  }
}

/**
 * Extrae la IP real del cliente desde los headers del request.
 * Vercel y la mayoría de proxies envían x-forwarded-for.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
