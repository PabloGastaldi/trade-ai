// app/api/market-data/route.js
// Fuentes: DolarApi, ArgentinaDatos, BCR (granos), Yahoo Finance (commodities/indices/forex)
// Cache: ISR 5 minutos en Vercel

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

async function fetchHTML(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9',
      },
    });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(id);
    return null;
  }
}

function parseARSPrice(str) {
  if (!str) return null;
  // "$ 484.000,00" → 484000
  const clean = str.replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function extractCellTexts(html, tag) {
  // Extract text content from all <td> or <th> elements
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const cells = [];
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
    cells.push(text);
  }
  return cells;
}

// BCR table layout:
// <th>: Fecha Negociación | Trading date | 26/03/2026 | 25/03/2026 | ...
// <td> per grain: Nombre ES | Nombre EN | $precio_hoy | $precio_ayer | ...
const GRAIN_MAP = { 'Soja': 'Soja', 'Sorgo': 'Sorgo', 'Girasol': 'Girasol', 'Trigo': 'Trigo', 'Ma': 'Maíz' };
const GRAIN_NAMES_ES = ['Soja', 'Sorgo', 'Girasol', 'Trigo', 'Maíz'];

async function fetchGranosBCR() {
  try {
    const html = await fetchHTML(
      'https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0',
    );
    if (!html) return null;

    const ths = extractCellTexts(html, 'th');
    const tds = extractCellTexts(html, 'td');

    // ths: ["Fecha Negociación", "Trading date", "26/03/2026", "25/03/2026", ...]
    const dateHeaders = ths.filter(t => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t));
    const fecha = dateHeaders[0] || null;

    // tds come in groups of 7: [nombre_es, nombre_en, precio_d0, precio_d1, ...]
    // Each grain has 2 label cells + 5 price cells = 7 cells
    const CELLS_PER_GRAIN = 7;
    const granos = [];

    for (let i = 0; i < tds.length; i += CELLS_PER_GRAIN) {
      const nameES = tds[i];
      const price = parseARSPrice(tds[i + 2]);
      const prevPrice = parseARSPrice(tds[i + 3]);
      if (!nameES || price == null) break;

      // Normalize name (handle encoding of "Maíz")
      const name = nameES === 'Ma\u00edz' || nameES.startsWith('Ma') && nameES.length <= 5 ? 'Maíz' : nameES;

      const change = prevPrice != null ? price - prevPrice : null;
      const changePercent =
        prevPrice != null && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : null;

      granos.push({ name, price, prevPrice, change, changePercent, unit: 'ARS/Tn' });
    }

    if (granos.length === 0) return null;
    return { fecha, granos };
  } catch {
    return null;
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
