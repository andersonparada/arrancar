import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Arrancar',
        short_name: 'Arrancar',
        description: 'Administración de ranchos ganaderos y parcelas.',
        lang: 'es',
        theme_color: '#1f4d2c',
        background_color: '#f6f4ee',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
      workbox: {
        // Solo se guarda la estructura de la app; los datos siempre vienen del servidor.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3100' },
  },
});
