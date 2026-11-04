const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(value: string): string {
  return value
    .split('')
    .map((char) => {
      const persian = PERSIAN_DIGITS.indexOf(char);
      if (persian >= 0) return String(persian);
      const arabic = ARABIC_DIGITS.indexOf(char);
      return arabic >= 0 ? String(arabic) : char;
    })
    .join('');
}

export function parseIntegerInput(value: string): number | null {
  const cleaned = normalizeDigits(value).replace(/[,\s،٬]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
