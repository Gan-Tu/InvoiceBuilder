import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serves the Vercel-style functions in `api/` during local development, so
 * `POST http://localhost:5173/api/invoice` works exactly like it does in production.
 */
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()
        const name = url.slice('/api/'.length).split('?')[0].replace(/\/+$/, '')
        if (!/^[\w-]+$/.test(name)) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const method = (req.method ?? 'GET').toUpperCase()
          const handler = mod[method] ?? mod.default
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }
          const headers = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value)
            else if (Array.isArray(value)) headers.set(key, value.join(', '))
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const hasBody = method !== 'GET' && method !== 'HEAD' && chunks.length > 0
          const request = new Request(`http://${req.headers.host ?? 'localhost'}${url}`, {
            method,
            headers,
            body: hasBody ? new Uint8Array(Buffer.concat(chunks)) : undefined,
          })
          const response: Response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          if (err instanceof Error) server.ssrFixStacktrace(err)
          console.error(err)
          res.statusCode = 500
          res.end('Internal error')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
})
