import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Easy Read',
        short_name: 'EasyRead',
        description: 'PWA de estudo assistido por IA, com funcionamento offline',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#E8E2D0',
        theme_color: '#8A1E1E',
        icons: [
          { src: 'logoo_easyread_little.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo_easyread.png', sizes: '512x512', type: 'image/png' },
          { src: 'logo_easyread.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})