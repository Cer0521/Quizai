import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const renderApiUrl = 'https://quizai-1-ydi0.onrender.com'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || renderApiUrl,
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'http-vendor': ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})
