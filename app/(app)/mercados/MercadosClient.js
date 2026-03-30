'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, DollarSign,
  BarChart3, Wheat, AlertCircle, Minus,
} from 'lucide-react';

// ── Hook ────────────────────────────────────────────────────────────────────

function useMarketData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/market-data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, lastUpdate, refresh: fetchData };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtARS(v) {
  if (v == null) return '—';
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtARSCompact(v) {
  if (v == null) return '—';
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtUSD(v, d = 2) {
  if (v == null) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

function fmtPct(v) {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function fmtNum(v, d = 2) {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'hace segundos';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)}h`;
}

// ── Change indicator ────────────────────────────────────────────────────────

function ChangeIndicator({ value, size = 'sm' }) {
  if (value == null) return null;
  const pos = value > 0;
  const zero = value === 0;
  const sz = size === 'lg' ? 'text-sm' : 'text-[11px]';
  const iconSz = size === 'lg' ? 14 : 11;

  if (zero) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${sz} font-mono text-on-surface-variant`}>
        <Minus size={iconSz} /> 0.00%
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 ${sz} font-mono ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? <TrendingUp size={iconSz} /> : <TrendingDown size={iconSz} />}
      {fmtPct(value)}
    </span>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

function MarketCard({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white/[0.03] border border-white/[0.04] rounded-2xl overflow-hidden ${className}`}>
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        {Icon && <Icon size={14} strokeWidth={1.5} className="text-primary" />}
        <span className="font-body text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">
          {title}
        </span>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

// ── Dolar row ───────────────────────────────────────────────────────────────

function DolarRow({ label, data, highlight = false }) {
  if (!data) return null;
  return (
    <div
      className={`flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 ${
        highlight ? 'bg-primary/[0.06] -mx-4 px-4 rounded-lg' : ''
      }`}
    >
      <span className="font-body text-sm text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="font-body text-[10px] text-on-surface-variant block">Compra</span>
          <span className="font-mono text-sm text-on-surface">{fmtARS(data.compra)}</span>
        </div>
        <div className="text-right">
          <span className="font-body text-[10px] text-on-surface-variant block">Venta</span>
          <span className={`font-mono text-sm ${highlight ? 'text-primary' : 'text-on-surface'}`}>
            {fmtARS(data.venta)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Commodity row ───────────────────────────────────────────────────────────

function CommodityItem({ commodity }) {
  if (!commodity) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        <span className="font-body text-sm text-on-surface">{commodity.displayName}</span>
        {commodity.unit && (
          <span className="font-mono text-[10px] text-on-surface-variant">{commodity.unit}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-on-surface">{fmtUSD(commodity.price)}</span>
        <ChangeIndicator value={commodity.changePercent} />
      </div>
    </div>
  );
}

// ── Grain row ───────────────────────────────────────────────────────────────

function GrainRow({ grain }) {
  if (!grain) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2">
        <span className="font-body text-sm text-on-surface">{grain.name}</span>
        <span className="font-mono text-[10px] text-on-surface-variant">{grain.unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-on-surface">{fmtARSCompact(grain.price)}</span>
        <ChangeIndicator value={grain.changePercent} />
      </div>
    </div>
  );
}

// ── Stat box ────────────────────────────────────────────────────────────────

function StatBox({ label, value, unit, variant = 'default' }) {
  const colors = {
    default: 'text-on-surface',
    primary: 'text-primary',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  };
  return (
    <div className="flex flex-col gap-1 py-2">
      <span className="font-body text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-xl ${colors[variant]}`}>{value}</span>
        {unit && <span className="font-mono text-[10px] text-on-surface-variant">{unit}</span>}
      </div>
    </div>
  );
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/[0.04] rounded-lg ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/[0.04] rounded-2xl p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MercadosClient() {
  const { data, loading, error, lastUpdate, refresh } = useMarketData();

  if (loading && !data) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="font-body text-2xl font-semibold text-on-surface">Mercados</h1>
            <p className="font-body text-sm text-on-surface-variant mt-1">Cargando datos...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle size={32} className="text-red-400 mx-auto" />
          <p className="font-body text-sm text-on-surface-variant">Error al cargar datos de mercado</p>
          <p className="font-mono text-xs text-red-400">{error}</p>
          <button onClick={refresh} className="font-body text-sm text-primary hover:underline">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { dolares, monedas, riesgoPais, inflacion, inflacionInteranual, tasas, commodities, indices, forex, granos } = data || {};
  const rpVariant = riesgoPais?.valor > 1500 ? 'error' : riesgoPais?.valor > 800 ? 'warning' : 'success';

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header — font-body (Inter), no Bebas Neue */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="font-body text-2xl font-semibold text-on-surface">Mercados</h1>
            <p className="font-body text-sm text-on-surface-variant mt-1">
              Datos financieros para comercio exterior
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="font-mono text-[10px] text-on-surface-variant">
                Actualizado {timeAgo(lastUpdate)}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08]
                         text-on-surface-variant hover:text-on-surface transition-all duration-150
                         disabled:opacity-40 disabled:cursor-not-allowed font-body text-xs"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {/* Tipos de cambio */}
          <MarketCard title="Tipos de cambio" icon={DollarSign} className="md:col-span-2 xl:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <DolarRow label="Oficial" data={dolares?.oficial} />
                <DolarRow label="Blue" data={dolares?.blue} highlight />
                <DolarRow label="MEP (Bolsa)" data={dolares?.mep} />
              </div>
              <div>
                <DolarRow label="CCL" data={dolares?.ccl} />
                <DolarRow label="Mayorista" data={dolares?.mayorista} />
                <DolarRow label="Tarjeta" data={dolares?.tarjeta} />
              </div>
            </div>
            {(monedas?.eur || monedas?.brl) && (
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <span className="font-body text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mb-2 block">
                  Monedas regionales
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {monedas?.eur && <DolarRow label="Euro" data={monedas.eur} />}
                  {monedas?.brl && <DolarRow label="Real brasileño" data={monedas.brl} />}
                </div>
              </div>
            )}
          </MarketCard>

          {/* Indicadores */}
          <MarketCard title="Indicadores" icon={BarChart3}>
            {riesgoPais && (
              <StatBox label="Riesgo país" value={riesgoPais.valor?.toLocaleString('es-AR') || '—'} unit="pb" variant={rpVariant} />
            )}
            {inflacionInteranual && (
              <StatBox
                label="Inflación interanual"
                value={inflacionInteranual.valor?.toFixed(1) || '—'}
                unit="%" variant={inflacionInteranual.valor > 100 ? 'error' : 'warning'}
              />
            )}
            {inflacion?.length > 0 && (
              <StatBox
                label={`IPC mensual (${inflacion[inflacion.length - 1]?.fecha || ''})`}
                value={inflacion[inflacion.length - 1]?.valor?.toFixed(1) || '—'}
                unit="%" variant="default"
              />
            )}
            {tasas && (
              <StatBox label="Tasa depósitos 30d" value={tasas.valor?.toFixed(1) || '—'} unit="% TNA" variant="default" />
            )}
          </MarketCard>

          {/* Granos BCR */}
          <MarketCard title="Granos — BCR" icon={Wheat} className="xl:col-span-2">
            {granos?.granos?.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <div>
                    {granos.granos.slice(0, 3).map(g => <GrainRow key={g.name} grain={g} />)}
                  </div>
                  <div>
                    {granos.granos.slice(3).map(g => <GrainRow key={g.name} grain={g} />)}
                  </div>
                </div>
                {granos.fecha && (
                  <p className="font-mono text-[10px] text-on-surface-variant mt-3">
                    Última sesión BCR: {granos.fecha}
                  </p>
                )}
              </>
            ) : (
              <p className="font-body text-sm text-on-surface-variant">Datos no disponibles</p>
            )}
          </MarketCard>

          {/* Commodities USD */}
          <MarketCard title="Commodities" icon={Wheat}>
            {commodities?.length > 0 ? (
              commodities.map(c => <CommodityItem key={c.symbol} commodity={c} />)
            ) : (
              <p className="font-body text-sm text-on-surface-variant">Datos no disponibles</p>
            )}
          </MarketCard>

          {/* Índices y Forex */}
          <MarketCard title="Índices y forex" icon={BarChart3}>
            {indices?.length > 0 && indices.map(idx => (
              <div key={idx.symbol} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                <span className="font-body text-sm text-on-surface">{idx.displayName}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-on-surface">{fmtNum(idx.price, 0)}</span>
                  <ChangeIndicator value={idx.changePercent} />
                </div>
              </div>
            ))}
            {forex?.length > 0 && (
              <>
                <span className="font-body text-[10px] uppercase tracking-[0.12em] text-on-surface-variant mt-3 mb-1 block">
                  Forex
                </span>
                {forex.map(fx => (
                  <div key={fx.symbol} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                    <span className="font-body text-sm text-on-surface">{fx.displayName}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-on-surface">{fmtNum(fx.price, 4)}</span>
                      <ChangeIndicator value={fx.changePercent} />
                    </div>
                  </div>
                ))}
              </>
            )}
            {!indices?.length && !forex?.length && (
              <p className="font-body text-sm text-on-surface-variant">Datos no disponibles</p>
            )}
          </MarketCard>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 px-4 py-3 bg-primary/[0.05] border border-primary/10 rounded-xl">
          <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
            Los datos provienen de fuentes públicas (DolarApi, ArgentinaDatos, Bolsa de Comercio de Rosario,
            Yahoo Finance) y pueden tener demoras de hasta 15 minutos. Esta información es orientativa y está
            respaldada por fuentes oficiales. Para operaciones concretas, consultá con un despachante de aduana
            matriculado o un profesional de comercio exterior.
          </p>
        </div>

        {data?.latencyMs && (
          <div className="mt-2 text-right">
            <span className="font-mono text-[10px] text-on-surface-variant/40">API: {data.latencyMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}
