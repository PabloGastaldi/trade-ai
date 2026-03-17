// ─────────────────────────────────────────────
// SANITIZACIÓN DE INPUT DEL USUARIO
//
// Elimina caracteres potencialmente peligrosos
// del texto libre que ingresa el usuario.
// Exportado para permitir testing unitario.
// ─────────────────────────────────────────────
export function sanitizarPregunta(texto) {
  return texto
    // Tags HTML completos y caracteres de apertura/cierre
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    // Comentarios SQL (-- y /* */)
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Punto y coma (terminador SQL)
    .replace(/;/g, '')
    // Null bytes y caracteres de control ASCII — reemplazar por espacio
    // para no fusionar palabras accidentalmente
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    // Normalizar espacios múltiples
    .replace(/\s+/g, ' ')
    .trim()
}
