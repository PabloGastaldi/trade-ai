// app/api/cron/bcr/route.js
// Cron job — scrapea BCR y guarda en Supabase
// Ejecutado por Vercel Cron cada 30 minutos (ver vercel.json)
// También se puede llamar manualmente: GET /api/cron/bcr

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )
}

async function fetchHTML(url, timeout = 15000) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8',
        'Referer': 'https://www.bcr.com.ar/',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
      },
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractCells(html, tag) {
  const open = `<${tag}`
  const close = `</${tag}>`
  const cells = []
  let pos = 0
  while (pos < html.length) {
    const start = html.indexOf(open, pos)
    if (start === -1) break
    const tagEnd = html.indexOf('>', start)
    if (tagEnd === -1) break
    const contentStart = tagEnd + 1
    const end = html.indexOf(close, contentStart)
    if (end === -1) break
    const raw = html.slice(contentStart, end)
    const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
    cells.push(text)
    pos = end + close.length
  }
  return cells
}

function parseARSPrice(str) {
  if (!str) return null
  const clean = str.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const val = parseFloat(clean)
  return isNaN(val) ? null : val
}

function scrapeBCR(html) {
  const ths = extractCells(html, 'th')
  const tds = extractCells(html, 'td')

  const dateHeaders = ths.filter(t => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t))
  const fecha = dateHeaders[0] || null

  const CELLS_PER_GRAIN = 7
  const granos = []

  for (let i = 0; i < tds.length; i += CELLS_PER_GRAIN) {
    const nameES = tds[i]
    const price = parseARSPrice(tds[i + 2])
    const prevPrice = parseARSPrice(tds[i + 3])
    if (!nameES || price == null) break

    const name = nameES === 'Ma\u00edz' || (nameES.startsWith('Ma') && nameES.length <= 5) ? 'Maíz' : nameES
    const change = prevPrice != null ? price - prevPrice : null
    const changePercent = prevPrice != null && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : null

    granos.push({ name, price, prevPrice, change, changePercent, unit: 'ARS/Tn' })
  }

  if (granos.length === 0) return null
  return { fecha, granos }
}

export async function GET(request) {
  // Allow calls from Vercel Cron OR with specific debug header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'
  const isDebug = request.headers.get('x-debug-cron') === 'true'
  const isDev = process.env.NODE_ENV !== 'production'
  
  // Allow in dev, with debug header, or from Vercel Cron
  if (!isDev && !isVercelCron && !isDebug) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[cron/bcr] Starting scrape...')
  const html = await fetchHTML(
    'https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0',
  )

  if (!html) {
    console.error('[cron/bcr] Failed to fetch BCR HTML')
    return Response.json({ ok: false, error: 'BCR fetch failed' }, { status: 502 })
  }

  console.log('[cron/bcr] HTML fetched, length:', html.length)
  
  const data = scrapeBCR(html)

  if (!data) {
    console.error('[cron/bcr] Failed to parse BCR data')
    return Response.json({ ok: false, error: 'BCR parse failed' }, { status: 502 })
  }

  console.log('[cron/bcr] Scraped:', data.fecha, 'granos:', data.granos.length)

  const supabase = getServiceClient()
  const { error } = await supabase.from('granos_bcr').insert({
    fecha_bcr: data.fecha,
    granos: data.granos,
  })

  if (error) {
    console.error('[cron/bcr] Supabase insert error:', error.message, error.details)
    return Response.json({ ok: false, error: 'DB insert failed' }, { status: 500 })
  }

  console.log('[cron/bcr] Inserted successfully')

  // Limpiar registros viejos (más de 7 días)
  await supabase
    .from('granos_bcr')
    .delete()
    .lt('fetched_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  return Response.json({ ok: true, fecha: data.fecha, granos: data.granos.length })
}
