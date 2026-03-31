import { NextResponse } from 'next/server'
import { buscarPreferencias } from '@/lib/preferencias-lookup'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ncm = searchParams.get('ncm')

  if (!ncm) {
    return NextResponse.json({ error: 'Parámetro ncm requerido' }, { status: 400 })
  }

  try {
    const resultado = await buscarPreferencias(ncm)
    return NextResponse.json(resultado)
  } catch (err) {
    console.error('[api/nomenclador/preferencias] Error:', err.message)
    return NextResponse.json({ error: 'Error al buscar preferencias' }, { status: 500 })
  }
}
