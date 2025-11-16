import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

// Cesium expects a base URL for its static assets (Workers, Assets, Widgets)
const CESIUM_BASE_URL = '/cesium'

// Vite plugin to copy Cesium assets from node_modules to public
function cesiumAssetsPlugin() {
  return {
    name: 'cesium-assets',
    buildStart() {
      const cesiumSource = join(process.cwd(), 'node_modules/cesium/Build/Cesium')
      const cesiumDest = join(process.cwd(), 'public/cesium')
      
      if (!existsSync(cesiumSource)) {
        console.warn('Cesium source not found in node_modules, skipping asset copy')
        return
      }

      const copyDir = (src: string, dest: string) => {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true })
        }
        
        readdirSync(src, { withFileTypes: true }).forEach(entry => {
          const srcPath = join(src, entry.name)
          const destPath = join(dest, entry.name)
          
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            copyFileSync(srcPath, destPath)
          }
        })
      }

      // Copy Workers and Assets directories
      ['Workers', 'Assets'].forEach(dir => {
        const src = join(cesiumSource, dir)
        const dest = join(cesiumDest, dir)
        if (existsSync(src)) {
          copyDir(src, dest)
          console.log(`Copied Cesium ${dir} to public/cesium/${dir}`)
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  root: './',
  plugins: [react(), cesiumAssetsPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
  },
})
