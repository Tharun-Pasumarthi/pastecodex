import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

// Local storage and real-time document relay development plugin
function codeshareDevRelayPlugin(): Plugin {
  const dataDir = path.resolve(process.cwd(), '.codeshare-dev-data')
  const blobsDir = path.join(dataDir, 'blobs')
  const docsDir = path.join(dataDir, 'documents')

  if (!fs.existsSync(blobsDir)) {
    fs.mkdirSync(blobsDir, { recursive: true })
  }
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
  }

  return {
    name: 'vite-plugin-codeshare-dev-relay',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle /api/documents/:id (Code documents and sessions)
        const docMatch = req.url?.match(/^\/api\/documents\/([a-zA-Z0-9_-]+)/)
        if (docMatch) {
          const docId = docMatch[1]
          const filePath = path.join(docsDir, `${docId}.json`)

          if (req.method === 'PUT') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                fs.writeFileSync(filePath, body, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, id: docId }))
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Write failed'
                res.statusCode = 500
                res.end(JSON.stringify({ error: msg }))
              }
            })
            return
          }

          if (req.method === 'GET') {
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Document not found' }))
              return
            }
            const content = fs.readFileSync(filePath, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(content)
            return
          }

          if (req.method === 'DELETE') {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
            return
          }
        }

        // Handle /api/blobs/:id (Encrypted PDF / Image attachments)
        const blobMatch = req.url?.match(/^\/api\/blobs\/([a-zA-Z0-9_-]+)/)
        if (blobMatch) {
          const blobId = blobMatch[1]
          const filePath = path.join(blobsDir, `${blobId}.json`)

          if (req.method === 'PUT') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', () => {
              try {
                fs.writeFileSync(filePath, body, 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(JSON.stringify({ success: true, id: blobId }))
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Write failed'
                res.statusCode = 500
                res.end(JSON.stringify({ error: msg }))
              }
            })
            return
          }

          if (req.method === 'GET') {
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Blob not found' }))
              return
            }
            const content = fs.readFileSync(filePath, 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(content)
            return
          }

          if (req.method === 'DELETE') {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
            return
          }
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), codeshareDevRelayPlugin()],
})
