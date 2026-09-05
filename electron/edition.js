const path = require('path');

const EDITION_CONFIG = Object.freeze({
    community: Object.freeze({
        appId: 'com.antigravity.fastimage',
        productName: 'FastImage',
        releaseRepository: 'cybereun/FastImageViewer',
        releaseApiUrl: 'https://api.github.com/repos/cybereun/FastImageViewer/releases/latest',
    }),
    pro: Object.freeze({
        appId: 'com.antigravity.fastimage.pro',
        productName: 'FastImage Pro',
        releaseRepository: 'cybereun/FastImageViewer-Pro',
        releaseApiUrl: 'https://api.github.com/repos/cybereun/FastImageViewer-Pro/releases/latest',
    }),
});

function normalizeEdition(value) {
    return String(value ?? '').trim().toLowerCase() === 'pro' ? 'pro' : 'community';
}

function getEditionConfig(edition = 'community') {
    return EDITION_CONFIG[normalizeEdition(edition)];
}

function detectEdition(app) {
    const environmentEdition = String(process.env.FASTIMAGE_EDITION ?? '').trim().toLowerCase();
    if (environmentEdition === 'pro') return 'pro';

    const metadataPaths = [path.join(__dirname, '..', 'package.json')];
    if (typeof app?.getAppPath === 'function') {
        try {
            metadataPaths.unshift(path.join(app.getAppPath(), 'package.json'));
        } catch {
            // Electron may not expose getAppPath until the ready event.
        }
    }
    for (const metadataPath of metadataPaths) {
        try {
            const metadata = require(metadataPath);
            if (metadata.edition === 'pro') return 'pro';
        } catch {
            // A development/test harness may not expose app metadata yet.
        }
    }

    const appName = typeof app?.getName === 'function' ? String(app.getName()).toLowerCase() : '';
    return appName.includes('pro') ? 'pro' : 'community';
}

module.exports = {
    EDITION_CONFIG,
    detectEdition,
    getEditionConfig,
    normalizeEdition,
};
