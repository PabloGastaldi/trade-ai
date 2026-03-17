import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getPaymentClient, PLANES } from '@/lib/mercadopago/client'

// Supabase con service role — se instancia dentro del handler para que
// las env vars estén disponibles en runtime (no en build time de Next.js)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Validar firma HMAC de MercadoPago
function validarFirma(request) {
  const mpSignature = request.headers.get('x-signature')
  const mpRequestId = request.headers.get('x-request-id')
  const secret      = process.env.MP_WEBHOOK_SECRET
  const esProduccion = process.env.NODE_ENV === 'production'

  // En producción el secret es obligatorio — sin él, rechazar todo
  if (!secret) {
    if (esProduccion) {
      console.error('[webhook-mp] CRÍTICO: MP_WEBHOOK_SECRET no configurado en producción — rechazando')
      return false
    }
    console.warn('[webhook-mp] MP_WEBHOOK_SECRET no configurado — firma no validada (solo dev)')
    return true
  }

  if (!mpSignature || !mpRequestId) return false

  // Parsear x-signature: "ts=XXXXX,v1=YYYYY"
  const parts = {}
  mpSignature.split(',').forEach((part) => {
    const [key, value] = part.split('=')
    parts[key.trim()] = value.trim()
  })

  const ts = parts.ts
  const v1 = parts.v1

  if (!ts || !v1) return false

  // Validar antigüedad del timestamp (máx 5 minutos) para prevenir replay attacks
  const tsMs = parseInt(ts, 10)
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
    console.warn('[webhook-mp] Timestamp fuera de ventana — posible replay attack')
    return false
  }

  // Armar el manifest para verificar
  // Según docs de MP: template = "id:[data.id];request-id:[x-request-id];ts:[ts];"
  const url    = new URL(request.url)
  const dataId = url.searchParams.get('data.id') || ''

  const manifest = `id:${dataId};request-id:${mpRequestId};ts:${ts};`

  const hmacCalculado = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest()

  // Comparación timing-safe para prevenir timing attacks
  try {
    const expected = Buffer.from(v1, 'hex')
    if (expected.length !== hmacCalculado.length) return false
    return crypto.timingSafeEqual(hmacCalculado, expected)
  } catch {
    return false
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    // Validar firma
    if (!validarFirma(request)) {
      console.error('[webhook-mp] Firma inválida — rechazado')
      return Response.json({ error: 'Firma inválida' }, { status: 401 })
    }

    const { type, data } = body

    // Solo procesar pagos confirmados
    if (type !== 'payment') {
      return Response.json({ ok: true })
    }

    // Obtener detalles del pago desde MP
    const paymentClient = getPaymentClient()
    const pago = await paymentClient.get({ id: data.id })

    // Parsear la referencia externa
    let ref
    try {
      ref = JSON.parse(pago.external_reference)
    } catch {
      console.error('[webhook-mp] external_reference inválida')
      return Response.json({ error: 'Referencia inválida' }, { status: 400 })
    }

    const { user_id, plan } = ref

    if (!user_id || !plan) {
      console.error('[webhook-mp] Referencia incompleta')
      return Response.json({ error: 'Referencia incompleta' }, { status: 400 })
    }

    // Pago aprobado → activar plan
    if (pago.status === 'approved') {
      const planInfo = PLANES[plan]
      if (!planInfo) {
        console.error(`[webhook-mp] Plan desconocido: ${plan}`)
        return Response.json({ error: 'Plan desconocido' }, { status: 400 })
      }

      const { error: updateError } = await getSupabase()
        .from('users_profile')
        .update({
          plan_type: plan,
          mp_subscription_id: String(pago.id),
          queries_this_month: 0, // resetear al cambiar de plan
        })
        .eq('id', user_id)

      if (updateError) {
        console.error('[webhook-mp] Error actualizando perfil:', updateError.message)
        return Response.json({ error: 'Error de base de datos' }, { status: 500 })
      }

      console.log(`[webhook-mp] Plan activado: ${plan}`)
    }

    // Pago rechazado o cancelado → revertir a free
    if (pago.status === 'rejected' || pago.status === 'cancelled' || pago.status === 'refunded') {
      const { error: updateError } = await getSupabase()
        .from('users_profile')
        .update({
          plan_type: 'free',
          mp_subscription_id: null,
        })
        .eq('id', user_id)

      if (updateError) {
        console.error('[webhook-mp] Error revirtiendo a free:', updateError.message)
      } else {
        console.log(`[webhook-mp] Plan revertido a free (status: ${pago.status})`)
      }
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[webhook-mp] Error procesando webhook:', err)
    return Response.json({ error: 'Error interno' }, { status: 500 })
  }
}

// MercadoPago envía GET para verificar que el webhook está activo
export async function GET() {
  return Response.json({ status: 'ok' })
}
