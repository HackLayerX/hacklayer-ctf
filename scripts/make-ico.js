/**
 * Create a proper multi-size ICO from the existing 256x256 PNG.
 * No external dependencies needed - uses raw PNG embedding in ICO format.
 */
const fs = require('fs');
const path = require('path');

const PNG_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const ICO_PATH = path.join(__dirname, '..', 'assets', 'icon.ico');

function buildIco(pngBuffers, sizes) {
    const numImages = pngBuffers.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    let dataOffset = headerSize + (dirEntrySize * numImages);

    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(numImages, 4);

    const dirEntries = [];
    for (let i = 0; i < numImages; i++) {
        const size = sizes[i];
        const pngData = pngBuffers[i];
        const entry = Buffer.alloc(dirEntrySize);
        entry.writeUInt8(size >= 256 ? 0 : size, 0);
        entry.writeUInt8(size >= 256 ? 0 : size, 1);
        entry.writeUInt8(0, 2);
        entry.writeUInt8(0, 3);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(pngData.length, 8);
        entry.writeUInt32LE(dataOffset, 12);
        dirEntries.push(entry);
        dataOffset += pngData.length;
    }

    return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

// Build multi-size ICO from tmp-icons (Windows needs 16,32,48,256 for taskbar + desktop)
const TMP_DIR = path.join(__dirname, '..', 'assets', 'tmp-icons');
const sizes = [16, 32, 48, 64, 128, 256];
const pngBuffers = sizes.map(size => {
    const file = path.join(TMP_DIR, `icon-${size}.png`);
    if (!fs.existsSync(file)) {
        console.error('Missing: ' + file);
        process.exit(1);
    }
    return fs.readFileSync(file);
});

const icoBuffer = buildIco(pngBuffers, sizes);
fs.writeFileSync(ICO_PATH, icoBuffer);
console.log('ICO generated: ' + ICO_PATH + ' (' + icoBuffer.length + ' bytes)');
console.log('Sizes embedded: ' + sizes.join(', '));
