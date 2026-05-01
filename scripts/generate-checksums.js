/**
 * Generate SHA256 checksums for all release artifacts in ../dist/
 * Run after build: npm run checksum
 * Output: ../dist/SHA256SUMS.txt
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = path.join(__dirname, '..', '..', 'dist');
const outputFile = path.join(distDir, 'SHA256SUMS.txt');

// Only hash actual release artifacts (not blockmap, yml, etc.)
const extensions = ['.exe', '.dmg', '.AppImage', '.deb', '.rpm', '.zip', '.tar.gz'];

if (!fs.existsSync(distDir)) {
    console.error('❌ dist/ folder not found. Run build first.');
    process.exit(1);
}

const files = fs.readdirSync(distDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return extensions.some(e => f.endsWith(e));
});

if (files.length === 0) {
    console.error('❌ No release artifacts found in dist/');
    process.exit(1);
}

console.log('🔐 Generating SHA256 checksums...\n');

const lines = [];
for (const file of files) {
    const filePath = path.join(distDir, file);
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const size = (content.length / (1024 * 1024)).toFixed(1);
    lines.push(`${hash}  ${file}`);
    console.log(`  ✓ ${file} (${size} MB)`);
    console.log(`    ${hash}\n`);
}

fs.writeFileSync(outputFile, lines.join('\n') + '\n', 'utf8');
console.log(`\n📄 Saved to: dist/SHA256SUMS.txt`);
console.log(`\n📋 Paste this into your GitHub Release notes:`);
console.log('─'.repeat(50));
console.log(lines.join('\n'));
console.log('─'.repeat(50));
