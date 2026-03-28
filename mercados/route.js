// app/api/market-data/route.js
// Agrega datos de: DolarApi, ArgentinaDatos, Yahoo Finance
// Cache: ISR 5 minutos en Vercel

export const revalidate = 300;

async function fetchJSON(url, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 300 } });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(id);
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

async function fetchYahooQuotes() {
  const tickers = ['ZS=F','ZW=F','ZC=F','ZL=F','ZM=F','CL=F','BZ=F','^GSPC','EURUSD=X','BRL=X','CNY=X'];
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(','))}`;
  const data = await fetchJSON(url, 10000);
  if (!data?.quoteResponse?.result) return null;
  const quotes = {};
  for (const q of data.quoteResponse.result) {
    quotes[q.symbol] = {
      symbol: q.symbol, name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice ?? null, change: q.regularMarketChange ?? null,
      changePercent: q.regularMarketChangePercent ?? null,
      currency: q.currency || 'USD', marketState: q.marketState || 'CLOSED',
    };
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
  const [dolares, monedas, riesgoPais, inflacion, inflacionInteranual, tasas, yahooQuotes] =
    await Promise.all([
      fetchDolares(), fetchMonedas(), fetchRiesgoPais(),
      fetchInflacion(), fetchInflacionInteranual(), fetchTasas(), fetchYahooQuotes(),
    ]);

  let commodities = null, indices = null, forex = null;
  if (yahooQuotes) {
    const enrich = (ts) => ts.map(t => yahooQuotes[t]).filter(Boolean)
      .map(q => ({ ...q, displayName: NAMES[q.symbol] || q.name, unit: UNITS[q.symbol] || '' }));
    commodities = enrich(['ZS=F','ZW=F','ZC=F','ZL=F','ZM=F','CL=F','BZ=F']);
    indices = enrich(['^GSPC']);
    forex = enrich(['EURUSD=X','BRL=X','CNY=X']);
  }

  return Response.json({
    timestamp: new Date().toISOString(), latencyMs: Date.now() - start,
    dolares, monedas, riesgoPais, inflacion, inflacionInteranual, tasas, commodities, indices, forex,
  }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
}
