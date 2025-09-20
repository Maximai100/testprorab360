import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const devPort = Number(process.env.VITE_DEV_PORT ?? process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: devPort,
    hmr: {
      port: devPort,
      host: 'localhost'
    },
    // Disable caching for development
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ['jspdf', 'jspdf-autotable']
        },
        // Add hash to filenames for better caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
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
