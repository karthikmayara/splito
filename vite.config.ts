import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // For GitHub Pages: set this to '/splito/' if your repo is named 'splito'
  // For Firebase Hosting or a custom domain: keep as '/'
  base: '/splito/',
  server: {
    // Allow access from your phone on local network
    host: true,
    headers: {
      // Allows Google popup auth to work on local network IP
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    // Split vendor chunks to reduce initial load time
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
