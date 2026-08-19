import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const port = Number(process.env.PORT || 5173)
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.xml':'application/xml; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'}

async function resolveFile(urlPath){
  let clean = decodeURIComponent(urlPath.split('?')[0])
  if(clean === '/') clean='/index.html'
  const rootCandidate = path.join(root, clean)
  if (rootCandidate.startsWith(root) && existsSync(rootCandidate) && (await stat(rootCandidate)).isFile()) return rootCandidate
  const publicCandidate = path.join(publicDir, clean)
  if (publicCandidate.startsWith(publicDir) && existsSync(publicCandidate) && (await stat(publicCandidate)).isFile()) return publicCandidate
  return path.join(root,'index.html')
}
http.createServer(async (req,res)=>{
  try{ const file=await resolveFile(req.url||'/'); const ext=path.extname(file); res.writeHead(200,{'content-type':types[ext]||'application/octet-stream','cache-control':'no-cache'}); res.end(await readFile(file)) }
  catch{ res.writeHead(500); res.end('Server error') }
}).listen(port,()=>console.log(`Container Fit dev server: http://localhost:${port}`))
