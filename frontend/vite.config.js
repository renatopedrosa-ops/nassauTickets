import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O proxy encaminha /api para o backend, evitando problemas de CORS no desenvolvimento.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_BACKEND_URL ?? 'http://localhost:3001',
    },
  },
})
