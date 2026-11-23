import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // El build usa /api con nginx; el proxy solo se necesita en desarrollo.
  const apiOrigin = command === 'serve'
    ? new URL(env.VITE_API_URL || '/api', 'http://localhost:8081').origin
    : undefined
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  server: {
    port: 5173,
    proxy: apiOrigin ? { '/api': { target: apiOrigin, changeOrigin: true } } : undefined,
  },
  }
})
