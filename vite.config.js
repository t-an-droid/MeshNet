import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'

export default defineConfig({
  base: '/MeshNet/', 
  server: {
    host: '0.0.0.0',
    https: fs.existsSync('./key.pem') && fs.existsSync('./cert.pem') ? {
      key: fs.readFileSync('./key.pem'),
      cert: fs.readFileSync('./cert.pem'),
    } : false
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: []
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mesh-icon.svg'],
      manifest: {
        name: 'MeshRelief: Offline Connect',
        short_name: 'MeshRelief',
        description: 'Offline-first mesh communication system',
        theme_color: '#f5f4f0',
        background_color: '#f5f4f0',
        display: 'standalone',
        start_url: '.',
        scope: '/',
        icons: [
          {
            src: 'mesh-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
