import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

// Singleton — se crea una sola vez por instancia del server
let client = null

function getClient() {
  if (!client) {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado en .env.local')
    }
    client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    })
  }
  return client
}

export function getPreferenceClient() {
  return new Preference(getClient())
}

export function getPaymentClient() {
  return new Payment(getClient())
}

// Planes con precios — FUENTE DE VERDAD (nunca confiar en el frontend)
export const PLANES = {
  pro: {
    nombre: 'Plan Pro',
    precio: 15000, // ARS
    consultas: 200,
    descripcion: '200 consultas mensuales',
  },
  empresa: {
    nombre: 'Plan Empresa',
    precio: null, // contactar
    consultas: null, // ilimitado
    descripcion: 'Consultas ilimitadas',
  },
}
