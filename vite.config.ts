import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Open Scripture has no CORS ACAO; proxy for local Vite (Worker handles prod).
      '/api/cfm/current': {
        target: 'https://openscriptureapi.org',
        changeOrigin: true,
        rewrite: () => '/api/manuals/v1/lds/en/come-follow-me/current',
      },
    },
  },
})
