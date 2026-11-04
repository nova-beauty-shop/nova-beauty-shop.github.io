import type { DashboardSeriesPoint } from '@/lib/adminDashboard';
import { formatNumber, formatToman } from '@/lib/format';

const WIDTH = 720;
const HEIGHT = 240;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;
const MAX_LABELS = 7;

function formatDayLabel(day: string): string {
  return new Date(day).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
}

export default function SalesChart({ series }: { series: DashboardSeriesPoint[] }) {
  const maxSales = Math.max(0, ...series.map((point) => point.sales));
  const innerHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slotWidth = WIDTH / Math.max(series.length, 1);
  const barWidth = Math.max(4, slotWidth * 0.6);
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));
  const baseline = HEIGHT - PADDING_BOTTOM;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="نمودار فروش روزانه"
        className="h-auto w-full min-w-[480px]"
      >
        <line x1={0} x2={WIDTH} y1={baseline} y2={baseline} className="stroke-ivory-300" strokeWidth={1} />
        {series.map((point, index) => {
          const barHeight = maxSales > 0 ? (point.sales / maxSales) * innerHeight : 0;
          const visibleHeight = point.sales > 0 ? Math.max(barHeight, 3) : 0;
          const x = index * slotWidth + (slotWidth - barWidth) / 2;
          return (
            <g key={point.day}>
              <title>{`${formatDayLabel(point.day)}: ${formatToman(point.sales)} (${formatNumber(point.orders)} سفارش)`}</title>
              <rect
                x={x}
                y={baseline - visibleHeight}
                width={barWidth}
                height={visibleHeight}
                rx={4}
                className="fill-burgundy-700/80 transition-colors duration-200 hover:fill-gold-500"
              />
              {index % labelEvery === 0 && (
                <text x={x + barWidth / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-ink-500 text-[11px]">
                  {formatDayLabel(point.day)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
