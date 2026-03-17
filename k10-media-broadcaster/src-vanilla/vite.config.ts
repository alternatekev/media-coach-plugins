import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'
import fs from 'fs'

// Shared: Serve static assets from the Electron app directory during dev
function serveElectronAssets(): Plugin {
  const electronDir = path.resolve(__dirname, '../K10 Media Broadcaster')
  return {
    name: 'serve-electron-assets',
    configureServer(server) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0] || ''
        if (url.startsWith('/images/') || url.startsWith('/modules/')) {
          const filePath = path.join(electronDir, url)
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase()
            const mimeTypes: Record<string, string> = {
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.webp': 'image/webp',
              '.css': 'text/css',
              '.js': 'application/javascript',
              '.json': 'application/json',
            }
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        }
        next()
      })
    },
  }
}

/**
 * Post-build: patch the built HTML for Electron compatibility.
 * Removes invalid attributes (rel, crossorigin) that vite-plugin-singlefile
 * copies from <link> tags onto the generated <style> tags.
 */
function electronCompatPlugin(): Plugin {
  return {
    name: 'electron-compat-vanilla',
    enforce: 'post',
    closeBundle() {
      const outFile = path.resolve(__dirname, '../K10 Media Broadcaster/dashboard-build.html')
      if (!fs.existsSync(outFile)) return

      let html = fs.readFileSync(outFile, 'utf8')
      html = html.replace(/<style([^>]*)\s+crossorigin([^>]*)>/g, '<style$1$2>')
      html = html.replace(/<style([^>]*)\s+rel="stylesheet"([^>]*)>/g, '<style$1$2>')
      html = html.replace(/<style\s{2,}/g, '<style ')

      fs.writeFileSync(outFile, html)
      console.log('[electron-compat-vanilla] Patched dashboard-build.html')
    },
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [viteSingleFile(), electronCompatPlugin(), serveElectronAssets()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../K10 Media Broadcaster'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'dashboard-build.html'),
      output: {
        entryFileNames: 'dashboard-build.js',
        assetFileNames: 'dashboard-build.[ext]',
      },
    },
  },
  server: {
    port: 5174,
  },
})
