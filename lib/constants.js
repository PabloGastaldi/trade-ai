/**
 * Constantes de dominio compartidas entre API routes y cliente.
 * Incoterms 2020 — orden oficial de la ICC.
 */
export const INCOTERMS = [
  'EXW', 'FCA', 'FAS', 'FOB',
  'CFR', 'CIF', 'CPT', 'CIP',
  'DAP', 'DPU', 'DDP',
]

export const CURRENCIES = ['USD', 'EUR', 'ARS']

export const TRANSPORT_MODES = ['maritimo', 'aereo', 'terrestre', 'multimodal']
