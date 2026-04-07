import { NextResponse } from 'next/server'

/**
 * Respuesta exitosa estandarizada.
 * @param {any} data
 * @param {number} status
 */
export function successResponse(data, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Respuesta de error estandarizada.
 * @param {string} message  Mensaje legible para el cliente
 * @param {string} code     Código de error en SCREAMING_SNAKE_CASE
 * @param {number} status   HTTP status code
 */
export function errorResponse(message, code, status = 500) {
  return NextResponse.json({ error: message, code }, { status })
}
