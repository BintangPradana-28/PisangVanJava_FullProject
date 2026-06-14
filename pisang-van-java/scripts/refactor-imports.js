const fs = require('fs');
const path = require('path');

const replacements = [
  { from: /'@\/components\/user\/CartModal'/g, to: "'@/src/features/cart/components/CartModal'" },
  { from: /"@\/components\/user\/CartModal"/g, to: '"@/src/features/cart/components/CartModal"' },
  
  { from: /'@\/components\/user\/CartDrawer'/g, to: "'@/src/features/cart/components/CartDrawer'" },
  { from: /"@\/components\/user\/CartDrawer"/g, to: '"@/src/features/cart/components/CartDrawer"' },
  
  { from: /'@\/components\/user\/MergeConflictModal'/g, to: "'@/src/features/cart/components/MergeConflictModal'" },
  { from: /"@\/components\/user\/MergeConflictModal"/g, to: '"@/src/features/cart/components/MergeConflictModal"' },
  
  { from: /'@\/src\/stores\/cart\.store'/g, to: "'@/src/features/cart/stores/cart.store'" },
  { from: /"@\/src\/stores\/cart\.store"/g, to: '"@/src/features/cart/stores/cart.store"' },
  
  { from: /'@\/src\/providers\/CartSyncProvider'/g, to: "'@/src/features/cart/providers/CartSyncProvider'" },
  { from: /"@\/src\/providers\/CartSyncProvider"/g, to: '"@/src/features/cart/providers/CartSyncProvider"' },
  
  // Specific relative import fix
  { from: /from '\.\/CartModal'/g, to: "from '@/src/features/cart/components/CartModal'" },
  { from: /from "\.\/CartModal"/g, to: 'from "@/src/features/cart/components/CartModal"' }
];

function walk(baseDir) {
  let results = [];
  
  // ZOMBIE-PROOF SECURITY BOUNDARY
  // Ensure baseDir resolves strictly within the current working directory to prevent arbitrary file access.
  const resolvedBaseDir = path.resolve(process.cwd(), baseDir);
  if (!resolvedBaseDir.startsWith(process.cwd())) {
    throw new Error(`[SECURITY EXCEPTION] Path Traversal Attempt Detected: ${baseDir}`);
  }

  const list = fs.readdirSync(resolvedBaseDir);
  
  list.forEach(function(item) {
    // SAST SANITIZATION: Force 'item' to be a strict basename.
    // Neutralizes unexpected traversal sequences like '../'
    const safeItem = path.basename(item);
    const fullPath = path.join(resolvedBaseDir, safeItem);
    
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) { 
      if (!fullPath.includes('node_modules') && !fullPath.includes('.next') && !fullPath.includes('.git')) {
        results = results.concat(walk(fullPath));
      }
    } else { 
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = [
  ...walk('app'),
  ...walk('src'),
  ...walk('components')
];

let updatedFiles = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  replacements.forEach(r => {
    newContent = newContent.replace(r.from, r.to);
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    console.log('Updated:', file);
    updatedFiles++;
  }
});

console.log('Total files updated:', updatedFiles);
