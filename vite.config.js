import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

/**
 * vite.config.js
 *
 * CORS PROXY EXPLAINED:
 * ──────────────────────────────────────────────────────────────
 * Direct browser fetch to catbox.moe/tmpfiles.org fails with
 * CORS errors from localhost. Vite's proxy intercepts any request
 * to /proxy/* and forwards it server-side — no CORS restrictions.
 *
 *  Browser → /proxy/catbox/user/api.php  (same-origin, allowed)
 *  Vite    → catbox.moe/user/api.php     (server-to-server, no CORS)
 * ──────────────────────────────────────────────────────────────
 */
export default defineConfig({
  plugins: [tailwindcss()],

  server: {
    proxy: {
      '/proxy/catbox': {
        target:       'https://catbox.moe',
        changeOrigin: true,
        rewrite:      path => path.replace(/^\/proxy\/catbox/, ''),
        secure:       true,
      },
      '/proxy/tmpfiles': {
        target:       'https://tmpfiles.org',
        changeOrigin: true,
        rewrite:      path => path.replace(/^\/proxy\/tmpfiles/, ''),
        secure:       true,
      },
      '/proxy/gofile': {
        target:       'https://api.gofile.io',
        changeOrigin: true,
        rewrite:      path => path.replace(/^\/proxy\/gofile/, ''),
        secure:       true,
      },
    },
  },
})
