/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'Cérémonie d\'accueil — Billetterie',
        short_name: 'Billetterie',
        description:
          'Inscription et billetterie de la cérémonie d\'accueil des étudiants camerounais.',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Découpage vendor : réduit la taille du chunk principal et améliore
        // la mise en cache navigateur.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    globals: true,
    // Environnement Node par défaut (rapide) ; jsdom uniquement pour les
    // tests de composants (.tsx). Évite l'initialisation coûteuse de jsdom
    // pour la logique métier pure.
    environment: 'node',
    environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Fork unique : fiabilise l'exécution sous Windows (évite les timeouts
    // RPC "/@vite/env" observés avec plusieurs workers).
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
