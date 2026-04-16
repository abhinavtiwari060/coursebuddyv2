import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'firebase-messaging-sw.js'],
      manifest: {
        name: 'CourseBuddy',
        short_name: 'CourseBuddy',
        description: 'Your smart study tracker — track courses, videos, streaks and more.',
        theme_color: '#000000',
        background_color: '#000000',
        start_url: '/',
        display: 'standalone',
        icons: [
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
          { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        sourcemap: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
