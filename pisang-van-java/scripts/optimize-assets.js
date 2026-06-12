const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

function optimizeImage(filePath, maxWidth, quality) {
  const tempPath = filePath + '.tmp';
  const originalSize = fs.statSync(filePath).size;

  return sharp(filePath)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({ quality: quality, palette: true, compressionLevel: 9 })
    .toFile(tempPath)
    .then(() => {
      const newSize = fs.statSync(tempPath).size;
      fs.renameSync(tempPath, filePath);
      console.log(
        `Optimized: ${path.basename(filePath)} | ` +
        `Size: ${(originalSize / 1024).toFixed(1)}KB -> ${(newSize / 1024).toFixed(1)}KB | ` +
        `Reduction: ${((originalSize - newSize) / originalSize * 100).toFixed(1)}%`
      );
    })
    .catch(err => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      console.error(`Failed to optimize ${filePath}:`, err.message);
    });
}

async function main() {
  console.log('--- Starting Asset Optimization ---');
  
  // 1. Optimize kitchen.png
  const kitchenPath = path.join(__dirname, '../public/kitchen.png');
  if (fs.existsSync(kitchenPath)) {
    await optimizeImage(kitchenPath, 1000, 60);
  }

  // 2. Optimize flavor images (max-width 500px since card size is 360px)
  const flavorsDir = path.join(__dirname, '../public/images/flavors');
  if (fs.existsSync(flavorsDir)) {
    const files = fs.readdirSync(flavorsDir);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.png')) {
        const filePath = path.join(flavorsDir, file);
        await optimizeImage(filePath, 500, 60);
      }
    }
  }

  console.log('--- Asset Optimization Completed ---');
}

main();
