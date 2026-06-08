const fs = require('fs');

function replace(path, regex, repl) {
  if (!fs.existsSync(path)) return;
  let text = fs.readFileSync(path, 'utf8');
  let newText = text.replace(regex, repl);
  if (text !== newText) {
    fs.writeFileSync(path, newText);
    console.log('Fixed', path);
  }
}

replace('app/(admin)/dashboard/page.tsx', /\(sum, o\) =>/g, '(sum: any, o: any) =>');
replace('app/(admin)/dashboard/page.tsx', /order =>/g, '(order: any) =>');
replace('app/(admin)/kontak-leads/page.tsx', /lead =>/g, '(lead: any) =>');
replace('app/(admin)/manage-menu/page.tsx', /p =>/g, '(p: any) =>');
replace('app/(admin)/orders/page.tsx', /o =>/g, '(o: any) =>');
replace('app/(admin)/orders/page.tsx', /item =>/g, '(item: any) =>');
replace('app/(admin)/reports/page.tsx', /o =>/g, '(o: any) =>');
replace('app/(admin)/reports/page.tsx', /item =>/g, '(item: any) =>');
replace('app/(user)/menu-spesial/page.tsx', /p =>/g, '(p: any) =>');
replace('app/(user)/menu-spesial/page.tsx', /s =>/g, '(s: any) =>');
replace('app/(user)/page.tsx', /r =>/g, '(r: any) =>');
replace('app/(user)/page.tsx', /p =>/g, '(p: any) =>');
replace('app/(user)/page.tsx', /const agg = aggregateMap.get\(p.id\);/g, 'const agg = aggregateMap.get(p.id) as any;');
replace('app/(user)/ulasan/page.tsx', /r =>/g, '(r: any) =>');
replace('app/api/orders/[id]/route.ts', /tx =>/g, '(tx: any) =>');
replace('app/api/orders/[id]/route.ts', /=== 'cancelled'/g, '=== "CANCELED"');
replace('app/api/orders/[id]/route.ts', /=== 'processing'/g, '=== "PROCESSING"');
replace('app/api/orders/[id]/route.ts', /=== 'ready'/g, '=== "READY"');
replace('app/api/reports/route.ts', /o =>/g, '(o: any) =>');
replace('app/api/reports/route.ts', /item =>/g, '(item: any) =>');
replace('app/api/reviews/route.ts', /r =>/g, '(r: any) =>');
replace('src/features/payment/email.ts', /item =>/g, '(item: any) =>');
replace('src/hooks/admin/use-admin-realtime.ts', /payload =>/g, '(payload: any) =>');
