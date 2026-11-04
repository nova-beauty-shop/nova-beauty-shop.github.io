import { describe, expect, it } from 'vitest';
import { discountPercent, formatToman } from '@/lib/format';
import { normalizeDigits, parseIntegerInput } from '@/lib/digits';

describe('formatToman', () => {
  it('formats amounts with Persian digits and the toman unit', () => {
    expect(formatToman(1500000)).toBe(`${(1500000).toLocaleString('fa-IR')} تومان`);
    expect(formatToman(1500000)).toMatch(/^[۰-۹,٬،\s]+ تومان$/);
  });
});

describe('discountPercent', () => {
  it('returns zero when there is no higher compare-at price', () => {
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(100, 100)).toBe(0);
    expect(discountPercent(100, 90)).toBe(0);
  });

  it('rounds the discount against the compare-at price', () => {
    expect(discountPercent(75, 100)).toBe(25);
    expect(discountPercent(2, 3)).toBe(33);
  });
});

describe('normalizeDigits', () => {
  it('converts Persian and Arabic-Indic digits to ASCII', () => {
    expect(normalizeDigits('۰۹۱۲')).toBe('0912');
    expect(normalizeDigits('٠٩١٢')).toBe('0912');
    expect(normalizeDigits('abc')).toBe('abc');
  });
});

describe('parseIntegerInput', () => {
  it('accepts Persian digits with separators', () => {
    expect(parseIntegerInput('۱،۲۵۰،۰۰۰')).toBe(1250000);
    expect(parseIntegerInput('1,250,000')).toBe(1250000);
  });

  it('rejects empty, negative, decimal and mixed text input', () => {
    expect(parseIntegerInput('')).toBeNull();
    expect(parseIntegerInput('-5')).toBeNull();
    expect(parseIntegerInput('1.5')).toBeNull();
    expect(parseIntegerInput('12abc')).toBeNull();
  });
});
