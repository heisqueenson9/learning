import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Chunk size warning limit (default 500kb — increase for large apps)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react', 'canvas-confetti'],
          services: ['axios'],
        }
      }
    }
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    port: 5173,
    host: true,
    // Dev proxy — routes /api calls to backend so CORS is not needed locally
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
}))
