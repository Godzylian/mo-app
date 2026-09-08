import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to local network (e.g. phones, other laptops on Wi-Fi)
    port: 5173,
  },
})
