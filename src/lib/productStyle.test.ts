import { describe, expect, it } from 'vitest';
import {
  animationClass,
  cardBackground,
  clampNumber,
  contrastingInk,
  groupVariants,
  imageTransform,
  isHexColor,
  parseAnimationType,
} from '@/lib/productStyle';

describe('cardBackground', () => {
  it('maps a valid colour to an inline background colour', () => {
    expect(cardBackground('color', '#F3ECE0')).toEqual({ className: '', style: { backgroundColor: '#F3ECE0' } });
  });

  it('maps a known preset to its gradient class', () => {
    expect(cardBackground('preset', 'rose-silk').className).toBe('card-bg-rose-silk');
  });

  it('only accepts https image addresses without characters that could break out of url()', () => {
    expect(cardBackground('image', 'https://wsrv.nl/?url=https%3A%2F%2Fcdn.example.com%2Fa.png&output=webp&q=85').style.backgroundImage).toBe('url("https://wsrv.nl/?url=https%3A%2F%2Fcdn.example.com%2Fa.png&output=webp&q=85")');
    expect(cardBackground('image', 'https://wsrv.nl/?url=http%3A%2F%2Fcdn.example.com%2Fa.png&output=webp&q=85').style.backgroundImage).toBeUndefined();
    expect(cardBackground('image', 'https://wsrv.nl/?url=https%3A%2F%2Fx.com%2Fa.png&output=webp&q=85");color:red').style.backgroundImage).toBeUndefined();
  });

  it('falls back to the default colour for unknown or malformed values', () => {
    expect(cardBackground('preset', 'nope').style.backgroundColor).toBeDefined();
    expect(cardBackground('color', 'red; background:url(x)').style.backgroundColor).toBe('#F3ECE0');
    expect(cardBackground('color', null).style.backgroundColor).toBe('#F3ECE0');
  });
});

describe('image helpers', () => {
  it('skips the transform when zoom and tilt are neutral', () => {
    expect(imageTransform(100, 0)).toBeUndefined();
    expect(imageTransform(120, -8)).toBe('scale(1.2) rotate(-8deg)');
  });

  it('clamps out of range numbers', () => {
    expect(clampNumber(500, 50, 150, 100)).toBe(150);
    expect(clampNumber(-9, 50, 150, 100)).toBe(50);
    expect(clampNumber(Number.NaN, 50, 150, 100)).toBe(100);
  });

  it('validates animations and maps them to css classes', () => {
    expect(parseAnimationType('zoom')).toBe('zoom');
    expect(parseAnimationType('spin')).toBeNull();
    expect(animationClass('pulse-glow')).toBe('anim-pulse-glow');
    expect(animationClass(null)).toBe('');
  });
});

describe('variants and colours', () => {
  it('detects hex colours', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor(12)).toBe(false);
  });

  it('splits variants into colours and sizes', () => {
    const base = { priceDelta: 0, colorHex: null };
    const groups = groupVariants([
      { id: 'a', label: 'رز', kind: 'color', ...base, colorHex: '#C08A8D' },
      { id: 'b', label: '۵۰ میل', kind: 'size', ...base },
    ]);
    expect(groups.colors.map((item) => item.id)).toEqual(['a']);
    expect(groups.sizes.map((item) => item.id)).toEqual(['b']);
  });

  it('picks readable ink for light and dark swatches', () => {
    expect(contrastingInk('#FFFFFF')).toBe('#231C1E');
    expect(contrastingInk('#361419')).toBe('#FDFBF7');
  });
});
