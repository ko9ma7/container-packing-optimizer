import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','dist'); const port=Number(process.env.PORT||4173)
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.xml':'application/xml; charset=utf-8'}
http.createServer(async(req,res)=>{try{let clean=decodeURIComponent((req.url||'/').split('?')[0]);if(clean==='/')clean='/index.html';let file=path.join(root,clean);if(!file.startsWith(root)||!existsSync(file)||(await stat(file)).isDirectory()) file=path.join(root,'index.html');res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file))}catch{res.writeHead(500);res.end('Server error')}}).listen(port,()=>console.log(`Preview: http://localhost:${port}`))
