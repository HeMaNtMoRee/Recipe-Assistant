import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets `npm run dev` talk to a locally running FastAPI backend
      // without CORS friction, in addition to the direct API_BASE in src/api.js.
      '/chat': 'http://localhost:8000',
      '/search': 'http://localhost:8000',
      '/upload-recipes': 'http://localhost:8000',
      '/clear-data': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
