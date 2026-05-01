/**
 * Generate icon.ico and icon.png from icon.svg for electron-builder.
 * Run: node scripts/generate-icon.js
 * Requires: npm install sharp --save-dev
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'assets', 'icon.svg');
const PNG_PATH = path.join(__dirname, '..', 'assets', 'icon.png');
const ICO_PATH = path.join(__dirname, '..', 'assets', 'icon.ico');

/**
 * Build a minimal ICO file from an array of PNG buffers.
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function buildIco(pngBuffers, sizes) {
    const numImages = pngBuffers.length;
    const headerSize = 6;
    const dirEntrySize = 16;
    const dirSize = dirEntrySize * numImages;
    let dataOffset = headerSize + dirSize;

    // ICO header: reserved(2) + type(2) + count(2)
    const header = Buffer.alloc(headerSize);
    header.writeUInt16LE(0, 0);      // reserved
    header.writeUInt16LE(1, 2);      // type = 1 (ICO)
    header.writeUInt16LE(numImages, 4);

    const dirEntries = [];
    const imageDataParts = [];

    for (let i = 0; i < numImages; i++) {
        const size = sizes[i];
        const pngData = pngBuffers[i];
        const entry = Buffer.alloc(dirEntrySize);
        entry.writeUInt8(size >= 256 ? 0 : size, 0);   // width (0 = 256)
        entry.writeUInt8(size >= 256 ? 0 : size, 1);   // height
        entry.writeUInt8(0, 2);                          // color palette
        entry.writeUInt8(0, 3);                          // reserved
        entry.writeUInt16LE(1, 4);                       // color planes
        entry.writeUInt16LE(32, 6);                      // bits per pixel
        entry.writeUInt32LE(pngData.length, 8);          // image size
        entry.writeUInt32LE(dataOffset, 12);             // offset to image data
        dirEntries.push(entry);
        imageDataParts.push(pngData);
        dataOffset += pngData.length;
    }

    return Buffer.concat([header, ...dirEntries, ...imageDataParts]);
}

async function generate() {
    console.log('Reading SVG...');
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Generate 256x256 PNG
    console.log('Generating PNG (256x256)...');
    await sharp(svgBuffer).resize(256, 256).png().toFile(PNG_PATH);

    // Generate multi-size ICO
    console.log('Generating ICO (16, 32, 48, 64, 128, 256)...');
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = await Promise.all(
        sizes.map(size => sharp(svgBuffer).resize(size, size).png().toBuffer())
    );

    const icoBuffer = buildIco(pngBuffers, sizes);
    fs.writeFileSync(ICO_PATH, icoBuffer);

    console.log('Done! Generated:');
    console.log('  ' + PNG_PATH + ' (' + fs.statSync(PNG_PATH).size + ' bytes)');
    console.log('  ' + ICO_PATH + ' (' + fs.statSync(ICO_PATH).size + ' bytes)');
}

generate().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
