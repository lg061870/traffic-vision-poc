import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // API_URL lets a second API instance be targeted, e.g. API_URL=http://localhost:5170
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.API_URL || 'http://localhost:5169',
          changeOrigin: true,
        },
      },
    },
  }
})
