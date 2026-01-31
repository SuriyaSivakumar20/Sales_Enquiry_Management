import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Firebase App Hosting often provides FIREBASE_WEBAPP_CONFIG or FIREBASE_CONFIG
  const firebaseConfigEnv = process.env.FIREBASE_WEBAPP_CONFIG || process.env.FIREBASE_CONFIG || env.FIREBASE_CONFIG || '';
  const apiKeyEnv = process.env.API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Safely inject env vars into the browser
      // We prioritize FIREBASE_WEBAPP_CONFIG as it's common in App Hosting
      'process.env.FIREBASE_CONFIG': JSON.stringify(firebaseConfigEnv),
      'process.env.API_KEY': JSON.stringify(apiKeyEnv),
      'process.env': {} 
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
             vendor: ['react', 'react-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
             utils: ['@google/genai', 'crypto-js']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true
    }
  };
});