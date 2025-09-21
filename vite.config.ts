import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number(env.VITE_DEV_PORT ?? env.PORT ?? 5173);
  const enableHmr = env.VITE_ENABLE_HMR === 'true';
  const hmrHost = env.VITE_HMR_HOST || '';
  const hmrPort = env.VITE_HMR_PORT ? Number(env.VITE_HMR_PORT) : undefined;
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT ? Number(env.VITE_HMR_CLIENT_PORT) : undefined;

  const resolvedHmrConfig = (hmrHost || hmrPort || hmrClientPort)
    ? {
        host: hmrHost || undefined,
        port: hmrPort ?? devPort,
        clientPort: hmrClientPort ?? hmrPort ?? devPort,
        protocol: env.VITE_HMR_PROTOCOL || undefined
      }
    : undefined;

  const hmrConfig = enableHmr ? resolvedHmrConfig ?? {} : false;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: devPort,
      strictPort: true,
      hmr: hmrConfig,
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
  }
})
