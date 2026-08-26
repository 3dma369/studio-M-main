import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        preserveSymlinks: true,
        alias: {
          '@': path.resolve(__dirname, './'),
          'admin-suite': path.resolve(__dirname, 'admin-suite'),
          'empire-ops': path.resolve(__dirname, 'empire-ops'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (id.includes('recharts')) return 'recharts';
              if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
              return undefined;
            }
          }
        }
      }
    };
});
