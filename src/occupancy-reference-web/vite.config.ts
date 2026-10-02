import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // API_URL lets another Occupancy API instance be targeted, e.g. API_URL=http://localhost:5190
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      port: 5174,
      // The route lines are read from the repo's data/routes folder, outside this app.
      fs: { allow: ['.', '../../data/routes'] },
      proxy: {
        '/api': {
          target: env.API_URL || 'http://localhost:5189',
          changeOrigin: true,
        },
      },
    },
  }
})
