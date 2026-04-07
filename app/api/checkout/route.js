import { createClient } from '@/lib/supabase/server'
import { getPreferenceClient, PLANES } from '@/lib/mercadopago/client'

export async function POST(request) {
  try {
    // 1. Autenticar usuario
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Validar plan solicitado
    const body = await request.json()
    const planId = body.plan

    if (!planId || !PLANES[planId]) {
      return Response.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const plan = PLANES[planId]

    if (!plan.precio) {
      return Response.json({ error: 'Este plan no tiene checkout' }, { status: 400 })
    }

    // 3. Crear preferencia de pago en MercadoPago
    const preference = getPreferenceClient()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const resultado = await preference.create({
      body: {
        items: [
          {
            id: planId,
            title: `trade.ai — ${plan.nombre}`,
            description: plan.descripcion,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: plan.precio,
          },
        ],
        // Referencia para identificar el pago en el webhook
        external_reference: JSON.stringify({
          user_id: user.id,
          plan: planId,
          email: user.email,
        }),
        // MP no acepta localhost en back_urls/notification_url
        ...(baseUrl.includes('localhost') ? {} : {
          back_urls: {
            success: `${baseUrl}/cuenta?pago=ok`,
            failure: `${baseUrl}/cuenta?pago=error`,
            pending: `${baseUrl}/cuenta?pago=pendiente`,
          },
          auto_return: 'approved',
          notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        }),
      },
    })

    return Response.json({ init_point: resultado.init_point })
  } catch (err) {
    console.error('[checkout] Error al crear preferencia:', err)
    return Response.json(
      { error: 'Error al crear el checkout. Intentá de nuevo.' },
      { status: 500 }
    )
  }
}
