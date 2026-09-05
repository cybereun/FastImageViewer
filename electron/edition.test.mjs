import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getEditionConfig, normalizeEdition, detectEdition } = require('./edition.js');

describe('edition configuration', () => {
  it('keeps Community as the safe default', () => {
    expect(normalizeEdition(undefined)).toBe('community');
    expect(getEditionConfig()).toMatchObject({
      appId: 'com.antigravity.fastimage',
      releaseRepository: 'cybereun/FastImageViewer',
    });
  });

  it('uses a separate Pro identity and release repository', () => {
    expect(getEditionConfig('pro')).toMatchObject({
      appId: 'com.antigravity.fastimage.pro',
      productName: 'FastImage Pro',
      releaseRepository: 'cybereun/FastImageViewer-Pro',
    });
    expect(detectEdition({ getName: () => 'FastImage Pro' })).toBe('pro');
    expect(detectEdition({ getName: () => 'FastImage' })).toBe('community');
  });
});
