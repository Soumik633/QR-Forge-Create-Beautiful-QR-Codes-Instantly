import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const uploadProxy = {
  target: 'https://tmpfiles.org',
  changeOrigin: true,
  secure: true,
  rewrite: path => path.replace(/^\/api\/tmpfiles/, '/api/v1/upload'),
}

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    proxy: {
      '/api/tmpfiles': uploadProxy,
    },
  },
  preview: {
    proxy: {
      '/api/tmpfiles': uploadProxy,
    },
  },
})
