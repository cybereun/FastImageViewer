import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { createOrientedThumbnail } from './thumbnail';

describe('thumbnail display orientation', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('honors EXIF orientation %i including mirrored images', async orientation => {
    const width = 80;
    const height = 40;
    const pixels = Buffer.alloc(width * height * 3);
    const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0]];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = colors[(y >= height / 2 ? 2 : 0) + (x >= width / 2 ? 1 : 0)];
        pixels.set(color, (y * width + x) * 3);
      }
    }
    const input = await sharp(pixels, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 100, chromaSubsampling: '4:4:4' }).withMetadata({ orientation }).toBuffer();
    const url = await createOrientedThumbnail(input, 80);
    const output = Buffer.from(url.split(',')[1], 'base64');
    const metadata = await sharp(output).metadata();
    expect([metadata.width, metadata.height]).toEqual(orientation >= 5 ? [40, 80] : [80, 40]);
    expect(metadata.orientation).toBeUndefined();
    const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const cornerOrder = {
      1: [0, 1, 2, 3], 2: [1, 0, 3, 2], 3: [3, 2, 1, 0], 4: [2, 3, 0, 1],
      5: [0, 2, 1, 3], 6: [2, 0, 3, 1], 7: [3, 1, 2, 0], 8: [1, 3, 0, 2],
    }[orientation];
    const corners = [[5, 5], [info.width - 6, 5], [5, info.height - 6], [info.width - 6, info.height - 6]];
    corners.forEach(([x, y], index) => {
      colors[cornerOrder[index]].forEach((expected, channel) => {
        expect(Math.abs(data[(y * info.width + x) * 3 + channel] - expected)).toBeLessThan(8);
      });
    });
  });

  it.each([[1200, 600, 320, 160], [600, 1200, 160, 320]])('fits %i x %i without cropping', async (width, height, expectedWidth, expectedHeight) => {
    const input = await sharp({ create: { width, height, channels: 3, background: 'red' } }).png().toBuffer();
    const url = await createOrientedThumbnail(input, 320);
    const metadata = await sharp(Buffer.from(url.split(',')[1], 'base64')).metadata();
    expect([metadata.width, metadata.height]).toEqual([expectedWidth, expectedHeight]);
  });
});
