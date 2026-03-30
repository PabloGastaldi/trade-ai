// app/api/market-data/route.js
// Fuentes: DolarApi, ArgentinaDatos, BCR (scraping)
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

function extractTableRows(html) {
  // Extract all <tr> blocks containing <td> elements
  const rows = [];
  const trPattern = /<tr[\s\S]*?<\/tr>/gi;
  const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let trMatch;
  while ((trMatch = trPattern.exec(html)) !== null) {
    const rowHtml = trMatch[0];
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
      // Strip inner tags and decode entities
      const text = tdMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .trim();
      cells.push(text);
    }
    if (cells.length >= 5) rows.push(cells);
  }
  return rows;
}

const GRAIN_NAMES = ['Soja', 'Sorgo', 'Girasol', 'Trigo', 'Maíz'];

async function fetchGranosBCR() {
  try {
    const html = await fetchHTML(
      'https://www.bcr.com.ar/es/mercados/mercado-de-granos/cotizaciones/cotizaciones-locales-0',
    );
    if (!html) return null;

    const rows = extractTableRows(html);
    // First data row = most recent, second = previous day
    // Filter rows that look like date rows (first cell matches dd/mm/yyyy)
    const dataRows = rows.filter(r => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(r[0]));
    if (dataRows.length < 1) return null;

    const latest = dataRows[0];
    const prev = dataRows[1] || null;

    // Columns: [fecha, soja, sorgo, girasol, trigo, maiz]
    const granos = GRAIN_NAMES.map((name, i) => {
      const price = parseARSPrice(latest[i + 1]);
      const prevPrice = prev ? parseARSPrice(prev[i + 1]) : null;
      const change = price != null && prevPrice != null ? price - prevPrice : null;
      const changePercent =
        price != null && prevPrice != null && prevPrice > 0
          ? ((price - prevPrice) / prevPrice) * 100
          : null;
      return { name, price, prevPrice, change, changePercent, unit: 'ARS/Tn' };
    });

    return { fecha: latest[0], granos };
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

export async function GET() {
  const start = Date.now();
  const [dolares, monedas, riesgoPais, inflacion, inflacionInteranual, tasas, granosData] =
    await Promise.all([
      fetchDolares(), fetchMonedas(), fetchRiesgoPais(),
      fetchInflacion(), fetchInflacionInteranual(), fetchTasas(), fetchGranosBCR(),
    ]);

  return Response.json({
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    dolares,
    monedas,
    riesgoPais,
    inflacion,
    inflacionInteranual,
    tasas,
    granos: granosData,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
}
