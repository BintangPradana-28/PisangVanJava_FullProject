const fs = require('node:fs')
const path = require('node:path')
const base64Data =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
const targetPath = path.join(__dirname, '../public/favicon.ico')
fs.mkdirSync(path.dirname(targetPath), { recursive: true })
fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'))
console.log('Favicon generated at', targetPath)
