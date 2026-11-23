import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const templateRoots = {
  '/christmas-editor': resolve(fileURLToPath(new URL('../anniversary-template-christmas/', import.meta.url))),
  '/cupid-editor': resolve(fileURLToPath(new URL('../anniversary-template/', import.meta.url))),
}
const mediaTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
}

export default defineConfig({
  plugins: [react(), {
    name: 'local-template-editors',
    apply: 'serve',
    configureServer(server) {
      Object.entries(templateRoots).forEach(([route, root]) => {
        server.middlewares.use(route, async (request, response, next) => {
          if (request.method !== 'GET' && request.method !== 'HEAD') return next()
          const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname)
          const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
          if (target !== root && !target.startsWith(root + sep)) {
            response.statusCode = 403
            response.end()
            return
          }
          try {
            if (!(await stat(target)).isFile()) return next()
            response.setHeader('Content-Type', mediaTypes[extname(target).toLowerCase()] || 'application/octet-stream')
            response.setHeader('Cache-Control', 'no-store')
            response.end(request.method === 'HEAD' ? undefined : await readFile(target))
          } catch { next() }
        })
      })
    },
  }],
})
