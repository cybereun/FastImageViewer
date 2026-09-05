const sharp = require('sharp');

async function createOrientedThumbnail(source, size) {
    const png = await sharp(source)
        .autoOrient()
        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
}

module.exports = { createOrientedThumbnail };
