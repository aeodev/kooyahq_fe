import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Cesium expects a base URL for its static assets (Workers, Assets, Widgets)
const CESIUM_BASE_URL = '/cesium'


// https://vite.dev/config/
export default defineConfig({
  root: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
  },
})
