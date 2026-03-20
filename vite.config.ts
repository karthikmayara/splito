import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Vite configuration
// - React plugin enables JSX transform and Fast Refresh in dev
// - Path alias @/ maps to src/ so imports are clean: "@/utils/..." instead of "../../utils/..."
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: false, // relying on existing HTML manifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Base URL for GitHub Pages deployment
  // Change this to your repo name: e.g. '/splito/' if hosted at username.github.io/splito
  base: '/',
  server: {
    host: true, // Listen on all local IPs
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
})
