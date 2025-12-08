import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  define: {
    // This ensures process.env is defined during client-side build to prevent runtime errors
    // when accessing process.env.API_KEY in the browser code.
    'process.env': {}
  }
});