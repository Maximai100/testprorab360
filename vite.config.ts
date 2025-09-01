import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ['jspdf', 'jspdf-autotable']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable']
  },
  define: {
    global: 'globalThis'
  }
})
