import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5175,
      fs: { allow: ['.', '../../data/routes'] },
      proxy: {
        '/api': {
          target: env.API_URL || 'https://lg0618pp-002-site2.htempurl.com',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
