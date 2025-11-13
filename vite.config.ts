import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io', 'localhost']
  },
  build: {
    outDir: 'build',
    assetsDir: 'static'
  },
  define: {
    // Replace process.env variables for Vite compatibility
    'process.env': process.env
  }
})