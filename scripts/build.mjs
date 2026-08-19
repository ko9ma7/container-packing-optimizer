import { cp, mkdir, rm, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const dist = new URL('../dist/', import.meta.url)
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await copyFile(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url))
await cp(new URL('../src', import.meta.url), new URL('../dist/src', import.meta.url), { recursive: true })
if (existsSync(new URL('../public', import.meta.url))) {
  const entries = ['favicon.svg','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','icon-192.png','icon-512.png','og-image.png','manifest.webmanifest','robots.txt','sitemap.xml','404.html','.nojekyll']
  for (const file of entries) {
    const src = new URL(`../public/${file}`, import.meta.url)
    if (existsSync(src)) await copyFile(src, new URL(`../dist/${file}`, import.meta.url))
  }
}
console.log('Built static site to dist/')
