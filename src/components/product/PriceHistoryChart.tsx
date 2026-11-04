import { useMemo } from 'react';
import { formatDate, formatToman } from '@/lib/format';
import type { PricePoint } from '@/lib/catalog';

const WIDTH = 720;
const HEIGHT = 280;
const PAD = { top: 24, right: 16, bottom: 36, left: 16 };

/**
 * Step chart of a product's recorded prices. The page is right to left, so time runs from right (oldest) to left
 * (newest). A price stays the same until the next recorded change, so the line is drawn as steps up to today.
 */
export default function PriceHistoryChart({ points, currentPrice }: { points: PricePoint[]; currentPrice: number }) {
  const model = useMemo(() => {
    const series = points.length > 0 ? points : [{ price: currentPrice, compareAt: null, recordedAt: new Date().toISOString() }];
    const times = series.map((point) => new Date(point.recordedAt).getTime());
    const now = Date.now();
    const start = times[0];
    const end = Math.max(now, times[times.length - 1]);
    const span = Math.max(end - start, 1);

    const prices = series.map((point) => point.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = Math.max(max - min, 1);

    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    // Oldest on the right.
    const x = (time: number) => PAD.left + innerWidth - ((time - start) / span) * innerWidth;
    const flat = max === min;
    const y = (price: number) => (flat ? PAD.top + innerHeight / 2 : PAD.top + innerHeight - ((price - min) / range) * innerHeight);

    const coords = series.map((point, index) => ({ x: x(times[index]), y: y(point.price), point }));
    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let index = 1; index < coords.length; index += 1) {
      path += ` H ${coords[index].x.toFixed(1)} V ${coords[index].y.toFixed(1)}`;
    }
    const endX = x(end);
    path += ` H ${endX.toFixed(1)}`;

    const area = `${path} V ${(PAD.top + innerHeight).toFixed(1)} H ${coords[0].x.toFixed(1)} Z`;
    const minPoint = series.find((point) => point.price === min) ?? series[0];
    const maxPoint = series.find((point) => point.price === max) ?? series[0];
    const average = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);

    return { series, coords, path, area, min, max, average, minPoint, maxPoint, flat, endX, baseline: PAD.top + innerHeight, y, startIso: series[0].recordedAt };
  }, [points, currentPrice]);

  const summary = `نمودار تغییرات قیمت: کمترین قیمت ${formatToman(model.min)}، بیشترین قیمت ${formatToman(model.max)}، قیمت فعلی ${formatToman(currentPrice)}.`;

  return (
    <div className="space-y-8">
      <dl className="grid gap-4 sm:grid-cols-4">
        <Stat label="قیمت فعلی" value={formatToman(currentPrice)} emphasis />
        <Stat label="کمترین قیمت" value={formatToman(model.min)} hint={formatDate(model.minPoint.recordedAt)} tone="success" />
        <Stat label="بیشترین قیمت" value={formatToman(model.max)} hint={formatDate(model.maxPoint.recordedAt)} tone="error" />
        <Stat label="میانگین" value={formatToman(model.average)} />
      </dl>

      <figure className="rounded-3xl border border-ivory-300 bg-ivory-50 p-4 shadow-soft md:p-6">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={summary} className="h-auto w-full">
          <title>{summary}</title>
          <defs>
            <linearGradient id="price-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6A2E3A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6A2E3A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((fraction) => {
            const gy = PAD.top + (HEIGHT - PAD.top - PAD.bottom) * fraction;
            return <line key={fraction} x1={PAD.left} x2={WIDTH - PAD.right} y1={gy} y2={gy} stroke="#E9DFCF" strokeDasharray="4 6" />;
          })}

          {!model.flat && (
            <>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={model.y(model.min)} y2={model.y(model.min)} stroke="#3C7457" strokeOpacity="0.45" strokeDasharray="2 5" />
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={model.y(model.max)} y2={model.y(model.max)} stroke="#B3261E" strokeOpacity="0.45" strokeDasharray="2 5" />
            </>
          )}

          <path d={model.area} fill="url(#price-area)" />
          <path d={model.path} fill="none" stroke="#6A2E3A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {model.coords.map((coord) => (
            <circle key={coord.point.recordedAt} cx={coord.x} cy={coord.y} r="4.5" fill="#FDFBF7" stroke="#6A2E3A" strokeWidth="2">
              <title>{`${formatToman(coord.point.price)} · ${formatDate(coord.point.recordedAt)}`}</title>
            </circle>
          ))}

          <text x={WIDTH - PAD.right} y={HEIGHT - 10} textAnchor="end" fontSize="12" fill="#7A6E70">
            {formatDate(model.startIso)}
          </text>
          <text x={PAD.left} y={HEIGHT - 10} textAnchor="start" fontSize="12" fill="#7A6E70">
            امروز
          </text>
        </svg>
        <figcaption className="mt-3 text-xs leading-[1.8] text-ink-500">
          {model.series.length < 2
            ? 'هنوز تغییری در قیمت این محصول ثبت نشده است؛ با هر تغییر قیمت، نمودار به‌روز می‌شود.'
            : `${(model.series.length - 1).toLocaleString('fa-IR')} تغییر قیمت از ${formatDate(model.startIso)} ثبت شده است.`}
        </figcaption>
      </figure>

      {model.series.length > 1 && (
        <details className="rounded-2xl border border-ivory-300 bg-ivory-50 px-5 py-3">
          <summary className="cursor-pointer text-sm font-medium text-ink-700">جدول تغییرات قیمت</summary>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-start text-ink-500">
                <th scope="col" className="py-2 text-start font-medium">تاریخ</th>
                <th scope="col" className="py-2 text-start font-medium">قیمت</th>
              </tr>
            </thead>
            <tbody>
              {[...model.series].reverse().map((point) => (
                <tr key={point.recordedAt} className="border-t border-ivory-300">
                  <td className="py-2">{formatDate(point.recordedAt)}</td>
                  <td className="py-2 font-medium">{formatToman(point.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, hint, emphasis = false, tone }: { label: string; value: string; hint?: string; emphasis?: boolean; tone?: 'success' | 'error' }) {
  const toneClass = tone === 'success' ? 'text-success-600' : tone === 'error' ? 'text-error-600' : 'text-ink-900';
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? 'border-burgundy-700/30 bg-blush-50' : 'border-ivory-300 bg-ivory-50'}`}>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={`mt-1 text-base font-bold ${toneClass}`}>{value}</dd>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
