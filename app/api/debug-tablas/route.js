import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const tablas = [
    'ncm',
    'aranceles_importacion',
    'aranceles_exportacion',
    'acuerdos_importacion',
    'acuerdos_exportacion',
    'documentos_requeridos',
    'regimen_intervenciones',
    'restricciones_regimenes',
    'destination_tariffs',
    'ntm_measures',
    'ntm_measures_affecting_argentina',
    'ntm_measures_applied_by_argentina',
  ]

  const resultados = {}

  for (const tabla of tablas) {
    const { data, error } = await supabase.from(tabla).select('*').limit(1).maybeSingle()
    resultados[tabla] = error ? { error: error.message } : data
  }

  return NextResponse.json(resultados)
}