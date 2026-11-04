import { describe, expect, it } from 'vitest';
import { removeWhiteBackground } from '@/lib/imageBackground';

function makeImage(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const set = (x: number, y: number, r: number, g: number, b: number, a = 255) => {
    const offset = (y * width + x) * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  };
  const alpha = (x: number, y: number) => data[(y * width + x) * 4 + 3];
  return { data, set, alpha };
}

describe('removeWhiteBackground', () => {
  it('makes the white surround transparent but keeps enclosed white parts of the product', () => {
    const image = makeImage(7, 7);
    for (let y = 2; y <= 4; y += 1) for (let x = 2; x <= 4; x += 1) image.set(x, y, 200, 20, 20);
    image.set(3, 3, 255, 255, 255);

    const removed = removeWhiteBackground(image.data, 7, 7);

    expect(removed).toBe(7 * 7 - 9);
    expect(image.alpha(0, 0)).toBe(0);
    expect(image.alpha(6, 6)).toBe(0);
    expect(image.alpha(3, 3)).toBe(255);
    expect(image.alpha(2, 2)).toBe(255);
  });

  it('feathers near-white pixels on the cut edge instead of leaving a hard halo', () => {
    const image = makeImage(5, 3);
    for (let y = 0; y < 3; y += 1) image.set(2, y, 225, 225, 225);
    for (let y = 0; y < 3; y += 1) for (let x = 3; x < 5; x += 1) image.set(x, y, 60, 40, 40);

    removeWhiteBackground(image.data, 5, 3);

    expect(image.alpha(0, 1)).toBe(0);
    expect(image.alpha(2, 1)).toBeGreaterThan(0);
    expect(image.alpha(2, 1)).toBeLessThan(255);
    expect(image.alpha(4, 1)).toBe(255);
  });

  it('treats already transparent pixels as background', () => {
    const image = makeImage(3, 3);
    image.set(0, 0, 10, 10, 10, 0);
    image.set(1, 1, 30, 30, 30, 255);
    removeWhiteBackground(image.data, 3, 3);
    expect(image.alpha(0, 0)).toBe(0);
    expect(image.alpha(1, 1)).toBe(255);
  });
});
