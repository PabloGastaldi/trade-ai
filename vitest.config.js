import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Excluir node_modules explícitamente
    exclude: ['node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      // Alias @/ igual que Next.js
      '@': __dirname,
    },
  },
})
