export function formatToman(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('fa-IR');
}

export function formatRating(value: number): string {
  return value.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function discountPercent(price: number, compareAt: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
