import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/') || id.includes('node_modules/pinia/')) {
            return 'vue'
          }
          if (id.includes('node_modules/element-plus/')) {
            return 'elementPlus'
          }
          if (id.includes('node_modules/@element-plus/icons-vue/')) {
            return 'elementIcons'
          }
          if (id.includes('node_modules/axios/')) {
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
