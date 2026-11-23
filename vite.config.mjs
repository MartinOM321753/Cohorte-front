import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = new URL(env.VITE_API_URL || 'http://localhost:8081/api').origin
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: apiOrigin, changeOrigin: true } },
  },
  }
})
