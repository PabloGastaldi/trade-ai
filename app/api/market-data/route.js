// app/api/market-data/route.js
// Fuentes: DolarApi, ArgentinaDatos, Supabase (granos BCR via cron), Yahoo Finance
// Cache: ISR 5 minutos en Vercel

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  )
}

// ── BCR scraper (inline fallback) ─────────────────────────────────────────────

function extractCells(html, tag) {
  const open = `<${tag}`, close = `</${tag}>`
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
    cells.push(raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim())
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

async function scrapeBCRLive() {
  try {
    const res = await fetch(
      'https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0',
      {
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9',
          'Referer': 'https://www.bcr.com.ar/',
        },
      }
    )
    if (!res.ok) return null
    const html = await res.text()

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
      const change = prevPrice != null ? price - prevPrice : null
      const changePercent = prevPrice != null && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : null
      granos.push({ name: nameES, price, prevPrice, change, changePercent, unit: 'ARS/Tn' })
    }
    if (granos.length === 0) return null

    // Guardar en DB para que el cron tenga datos la próxima vez
    try {
      const supabase = getServiceClient()
      await supabase.from('granos_bcr').insert({ fecha_bcr: fecha, granos })
    } catch { /* fire and forget */ }

    return { fecha, granos, fetchedAt: new Date().toISOString() }
  } catch {
    return null
  }
}

export const revalidate = 300;

async function fetchJSON(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; trade.ai/1.0)' },
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(id);
    return null;
  }
}

// Lee el último registro de granos; si no hay o es viejo (+24h) scrapea en el momento
async function fetchGranosBCR() {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('granos_bcr')
      .select('fecha_bcr, granos, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const ageMs = Date.now() - new Date(data.fetched_at).getTime()
      const stale = ageMs > 24 * 60 * 60 * 1000
      if (!stale) return { fecha: data.fecha_bcr, granos: data.granos, fetchedAt: data.fetched_at }
    }

    // No hay dato o es de más de 24h — scrapeamos en vivo
    return await scrapeBCRLive()
  } catch {
    return await scrapeBCRLive()
  }
}

async function fetchDolares() {
  const data = await fetchJSON('https://dolarapi.com/v1/dolares');
  if (!data) return null;
  const find = (casa) => data.find((d) => d.casa === casa) || null;
  const oficial = find('oficial');
  const blue = find('blue');
  let brecha = null;
  if (blue?.venta && oficial?.venta && oficial.venta > 0) {
    brecha = parseFloat((((blue.venta - oficial.venta) / oficial.venta) * 100).toFixed(1));
  }
  return {
    oficial, blue, mep: find('bolsa'), ccl: find('contadoconliqui'),
    mayorista: find('mayorista'), tarjeta: find('tarjeta'), cripto: find('cripto'), brecha,
  };
}

async function fetchMonedas() {
  const [eur, brl] = await Promise.all([
    fetchJSON('https://dolarapi.com/v1/cotizaciones/eur'),
    fetchJSON('https://dolarapi.com/v1/cotizaciones/brl'),
  ]);
  return { eur, brl };
}

async function fetchRiesgoPais() {
  return await fetchJSON('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo') || null;
}

async function fetchInflacion() {
  const data = await fetchJSON('https://api.argentinadatos.com/v1/finanzas/indices/inflacion');
  if (!Array.isArray(data) || data.length === 0) return null;
  return data.slice(-2);
}

async function fetchInflacionInteranual() {
  const data = await fetchJSON('https://api.argentinadatos.com/v1/finanzas/indices/inflacion-interanual');
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[data.length - 1];
}

async function fetchTasas() {
  const data = await fetchJSON('https://api.argentinadatos.com/v1/finanzas/tasas/depositos30dias');
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[data.length - 1];
}

async function fetchYahooChart(ticker) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`;
  const data = await fetchJSON(url, 8000);
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const closes = data.chart.result[0].indicators?.quote?.[0]?.close ?? [];
  const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
  const price = meta.regularMarketPrice ?? null;
  const change = price != null && prev != null ? price - prev : null;
  const changePercent = price != null && prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null;
  return {
    symbol: ticker, price, change, changePercent,
    currency: meta.currency || 'USD', marketState: meta.marketState || 'CLOSED',
  };
}

async function fetchYahooQuotes() {
  const tickers = ['ZS=F','ZW=F','ZC=F','ZL=F','ZM=F','CL=F','BZ=F','^GSPC','EURUSD=X','BRL=X','CNY=X'];
  const results = await Promise.all(tickers.map(fetchYahooChart));
  if (results.every(r => r === null)) return null;
  const quotes = {};
  for (let i = 0; i < tickers.length; i++) {
    if (results[i]) quotes[tickers[i]] = results[i];
  }
  return quotes;
}

const NAMES = {
  'ZS=F':'Soja','ZW=F':'Trigo','ZC=F':'Maíz','ZL=F':'Aceite de soja','ZM=F':'Harina de soja',
  'CL=F':'Petróleo WTI','BZ=F':'Petróleo Brent','^GSPC':'S&P 500',
  'EURUSD=X':'EUR/USD','BRL=X':'USD/BRL','CNY=X':'USD/CNY',
};
const UNITS = {
  'ZS=F':'USD/bu','ZW=F':'USD/bu','ZC=F':'USD/bu',
  'ZL=F':'USD/lb','ZM=F':'USD/ton','CL=F':'USD/bbl','BZ=F':'USD/bbl',
};

export async function GET() {
  const start = Date.now();
  const [dolares, monedas, riesgoPais, inflacion, inflacionInteranual, tasas, yahooQuotes, granosData] =
    await Promise.all([
      fetchDolares(), fetchMonedas(), fetchRiesgoPais(),
      fetchInflacion(), fetchInflacionInteranual(), fetchTasas(),
      fetchYahooQuotes(), fetchGranosBCR(),
    ]);

  let commodities = null, indices = null, forex = null;
  if (yahooQuotes) {
    const enrich = (ts) => ts.map(t => yahooQuotes[t]).filter(Boolean)
      .map(q => ({ ...q, displayName: NAMES[q.symbol] || q.symbol, unit: UNITS[q.symbol] || '' }));
    // Granos (soja/trigo/maíz/aceite/harina) removed — covered by BCR in ARS
    commodities = enrich(['CL=F','BZ=F']);
    indices = enrich(['^GSPC']);
    forex = enrich(['EURUSD=X','BRL=X','CNY=X']);
  }

  return Response.json({
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    dolares,
    monedas,
    riesgoPais,
    inflacion,
    inflacionInteranual,
    tasas,
    commodities,
    indices,
    forex,
    granos: granosData,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
}
