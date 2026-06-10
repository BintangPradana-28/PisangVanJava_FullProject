const fs = require('fs')

function replace(path, regex, repl) {
  if (!fs.existsSync(path)) return
  const text = fs.readFileSync(path, 'utf8')
  const newText = text.replace(regex, repl)
  if (text !== newText) {
    fs.writeFileSync(path, newText)
    console.log('Fixed', path)
  }
}

replace('app/(admin)/dashboard/page.tsx', /\(o\)/g, '(o: any)')
replace('app/(admin)/dashboard/page.tsx', /\(order\)/g, '(order: any)')

replace('app/(user)/menu-spesial/page.tsx', /\(s, r\)/g, '(s: any, r: any)')

replace('app/api/reports/route.ts', /\(o\)/g, '(o: any)')

replace(
  'src/hooks/admin/use-admin-realtime.ts',
  /supabaseBrowserClient.removeChannel/g,
  'supabaseBrowserClient?.removeChannel'
)
