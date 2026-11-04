import type { OrderStatus } from '@/lib/orders';
import { supabase } from '@/lib/supabase';

export const DASHBOARD_PERIODS = [7, 30, 90] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export interface DashboardSeriesPoint {
  day: string;
  sales: number;
  orders: number;
}

export interface DashboardLowStockItem {
  id: string;
  name: string;
  stock: number;
}

export interface DashboardLatestOrder {
  id: string;
  orderNumber: string;
  recipientName: string;
  totalToman: number;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminDashboardStats {
  days: number;
  salesToman: number;
  costToman: number;
  netProfitToman: number;
  ordersCount: number;
  pendingShipments: number;
  pendingReceipts: number;
  lowStockCount: number;
  missingCostCount: number;
  lowStock: DashboardLowStockItem[];
  series: DashboardSeriesPoint[];
  latestOrders: DashboardLatestOrder[];
}

type Row = Record<string, unknown>;

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error('unexpected dashboard response');
  return value.filter(isRecord);
}

export async function fetchAdminDashboardStats(days: DashboardPeriod): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('admin_dashboard_stats', { p_days: days });
  if (error) throw error;
  if (!isRecord(data)) throw new Error('unexpected dashboard response');

  return {
    days: asNumber(data.days),
    salesToman: asNumber(data.sales_toman),
    costToman: asNumber(data.cost_toman),
    netProfitToman: asNumber(data.net_profit_toman),
    ordersCount: asNumber(data.orders_count),
    pendingShipments: asNumber(data.pending_shipments),
    pendingReceipts: asNumber(data.pending_receipts),
    lowStockCount: asNumber(data.low_stock_count),
    missingCostCount: asNumber(data.missing_cost_count),
    lowStock: asRows(data.low_stock).map((item) => ({
      id: asString(item.id),
      name: asString(item.name),
      stock: asNumber(item.stock),
    })),
    series: asRows(data.series).map((point) => ({
      day: asString(point.day),
      sales: asNumber(point.sales),
      orders: asNumber(point.orders),
    })),
    latestOrders: asRows(data.latest_orders).map((order) => ({
      id: asString(order.id),
      orderNumber: asString(order.order_number),
      recipientName: asString(order.recipient_name),
      totalToman: asNumber(order.total_toman),
      status: asString(order.status) as OrderStatus,
      createdAt: asString(order.created_at),
    })),
  };
}
