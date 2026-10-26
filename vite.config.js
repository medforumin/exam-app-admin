import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  optimizeDeps: { include: ["react", "react-dom"] },
  plugins: [react()],
  build: {
    outDir: "public",           // output folder
    emptyOutDir: true,         // clear build on each build
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // keep external list empty — ensures React and ReactDOM are bundled
      external: [],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            return 'vendor';
          }
        }
      }
    }
  }
});