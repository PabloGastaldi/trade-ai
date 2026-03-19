import { Pinecone } from '@pinecone-database/pinecone'

// Umbral de relevancia semántica.
// Bajado de 0.70 a 0.60 (2026-03-18) para evitar descartar fragmentos válidos.
// Calibrar con datos reales observando los logs '[pinecone] scores:'.
const SCORE_MINIMO = 0.15

let _index = null

function getIndex() {
  if (!_index) {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    _index = pc.index(process.env.PINECONE_INDEX_NAME)
  }
  return _index
}

/**
 * Busca fragmentos relevantes en Pinecone para una consulta de texto.
 * El índice usa llama-text-embed-v2 integrado — Pinecone genera el embedding.
 *
 * @param {string} query - Texto de la consulta del usuario
 * @param {object} [opciones]
 * @param {number} [opciones.topK=5] - Cantidad de resultados a devolver
 * @param {string} [opciones.tipo] - Filtrar por tipo de documento (ej: "normativa-aduanera")
 * @returns {Promise<Array<{texto: string, fuente: string, tipo: string, score: number, chunk_index: number}>>}
 */
export async function buscarEnPinecone(query, { topK = 5, tipo = null } = {}) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return []
  }

  const queryParams = {
    query: {
      inputs: { text: query.trim() },
      topK,
      ...(tipo ? { filter: { tipo: { $eq: tipo } } } : {}),
    },
    fields: ['text', 'fuente', 'tipo', 'chunk_index'],
  }

  let response
  try {
    response = await getIndex().searchRecords(queryParams)
  } catch (err) {
    console.error('[pinecone-search] Error al buscar:', err.message)
    throw new Error('Error al buscar en la base de conocimiento')
  }

  const hits = response?.result?.hits ?? []

  // Log temporal para calibrar SCORE_MINIMO con datos reales
  if (hits.length > 0) {
    const scores = hits.map((h) => h._score.toFixed(3)).join(', ')
    const pasaron = hits.filter((h) => h._score >= SCORE_MINIMO).length
    console.log(`[pinecone] scores: [${scores}] — ${pasaron}/${hits.length} superan threshold ${SCORE_MINIMO}`)
  }

  return hits
    .filter((hit) => hit._score >= SCORE_MINIMO)
    .map((hit) => ({
      texto:       hit.fields?.text ?? '',
      fuente:      hit.fields?.fuente ?? '',
      tipo:        hit.fields?.tipo ?? '',
      score:       hit._score,
      chunk_index: hit.fields?.chunk_index ?? 0,
    }))
}
