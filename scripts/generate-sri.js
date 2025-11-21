const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const filePath = path.join(__dirname, '../dist/widget-sdk.js');

if (!fs.existsSync(filePath)) {
  console.error('Error: dist/widget-sdk.js not found. Run build first.');
  process.exit(1);
}

const fileContent = fs.readFileSync(filePath);
const hash = crypto.createHash('sha384').update(fileContent).digest('base64');
const integrity = `sha384-${hash}`;

console.log('\n---------------------------------------------------');
console.log('Generated SRI Hash for dist/widget-sdk.js');
console.log('---------------------------------------------------');
console.log(`Integrity: ${integrity}`);
console.log('---------------------------------------------------');
console.log('CDN Script Tag:');
console.log(`<script src="https://cdn.jsdelivr.net/npm/pixelbin-widget-sdk@latest/dist/widget-sdk.js" integrity="${integrity}" crossorigin="anonymous"></script>`);
console.log('---------------------------------------------------\n');
