import { supabase } from "@/lib/supabase";
import { formatToman } from "@/lib/format";
import type { DeliveryMethod } from "@/lib/orders";

export interface StoreSettings {
  storeName: string;
  supportPhone: string;
  supportEmail: string;
  address: string;
  courierFeeToman: number;
  courierFreeThresholdToman: number;
  postFeeToman: number;
}

export interface DynamicShippingQuote {
  feeToman: number;
  isFree: boolean;
  zoneLabel: string;
  etaLabel: string;
  breakdownLabel: string;
  remainingForFreeToman: number;
  freeThresholdToman: number;
  baseFeeToman: number;
  weightSurchargeToman: number;
  countySurchargeToman: number;
}

export const PROVINCE_SHIPPING_TABLE: { province: string; capital: string; zone: 1 | 2 | 3; baseFee: number; countyExtra: number; eta: string; metroSurcharge?: boolean }[] = [
  { province: "خراسان رضوی", capital: "مشهد", zone: 1, baseFee: 80000, countyExtra: 15000, eta: "۱ روز کاری" },
  { province: "خراسان شمالی", capital: "بجنورد", zone: 2, baseFee: 105000, countyExtra: 15000, eta: "۱ تا ۲ روز کاری" },
  { province: "خراسان جنوبی", capital: "بیرجند", zone: 2, baseFee: 105000, countyExtra: 15000, eta: "۱ تا ۲ روز کاری" },
  { province: "سمنان", capital: "سمنان", zone: 2, baseFee: 110000, countyExtra: 15000, eta: "۲ روز کاری" },
  { province: "یزد", capital: "یزد", zone: 2, baseFee: 115000, countyExtra: 15000, eta: "۲ تا ۳ روز کاری" },
  { province: "گلستان", capital: "گرگان", zone: 3, baseFee: 120000, countyExtra: 15000, eta: "۲ تا ۳ روز کاری" },
  { province: "مازندران", capital: "ساری", zone: 3, baseFee: 125000, countyExtra: 15000, eta: "۲ تا ۳ روز کاری" },
  { province: "کرمان", capital: "کرمان", zone: 3, baseFee: 125000, countyExtra: 15000, eta: "۲ تا ۴ روز کاری" },
  { province: "قم", capital: "قم", zone: 3, baseFee: 125000, countyExtra: 15000, eta: "۲ تا ۳ روز کاری" },
  { province: "تهران", capital: "تهران", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۲ تا ۳ روز کاری", metroSurcharge: true },
  { province: "البرز", capital: "کرج", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۲ تا ۳ روز کاری", metroSurcharge: true },
  { province: "اصفهان", capital: "اصفهان", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "فارس", capital: "شیراز", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "گیلان", capital: "رشت", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "قزوین", capital: "قزوین", zone: 3, baseFee: 128000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "مرکزی", capital: "اراک", zone: 3, baseFee: 128000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "همدان", capital: "همدان", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "زنجان", capital: "زنجان", zone: 3, baseFee: 130000, countyExtra: 15000, eta: "۳ تا ۴ روز کاری" },
  { province: "چهارمحال و بختیاری", capital: "شهرکرد", zone: 3, baseFee: 134000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "لرستان", capital: "خرم‌آباد", zone: 3, baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "کهگیلویه و بویراحمد", capital: "یاسوج", zone: 3, baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "اردبیل", capital: "اردبیل", zone: 3, baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "آذربایجان شرقی", capital: "تبریز", zone: 3, baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "کردستان", capital: "سنندج", zone: 3, baseFee: 136000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "کرمانشاه", capital: "کرمانشاه", zone: 3, baseFee: 136000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "هرمزگان", capital: "بندرعباس", zone: 3, baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "سیستان و بلوچستان", capital: "زاهدان", zone: 3, baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "خوزستان", capital: "اهواز", zone: 3, baseFee: 138000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "بوشهر", capital: "بوشهر", zone: 3, baseFee: 138000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "ایلام", capital: "ایلام", zone: 3, baseFee: 138000, countyExtra: 15000, eta: "۴ تا ۵ روز کاری" },
  { province: "آذربایجان غربی", capital: "ارومیه", zone: 3, baseFee: 140000, countyExtra: 15000, eta: "۴ تا ۵ روز کاری" },
];

export const IRAN_PROVINCES = PROVINCE_SHIPPING_TABLE;

type Row = Record<string, unknown>;
function asString(value: unknown): string { return typeof value === "string" ? value : ""; }
function asNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error("unexpected store settings response");
  return parsed;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("store_name, support_phone, support_email, address, courier_fee_toman, courier_free_threshold_toman, post_fee_toman")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("store settings missing");
  const row = data as Row;
  return {
    storeName: asString(row.store_name),
    supportPhone: asString(row.support_phone),
    supportEmail: asString(row.support_email),
    address: asString(row.address),
    courierFeeToman: asNumber(row.courier_fee_toman),
    courierFreeThresholdToman: asNumber(row.courier_free_threshold_toman),
    postFeeToman: asNumber(row.post_fee_toman),
  };
}

export function computeMashhadShipping(province: string, city: string, subtotal: number, itemCount: number, freeThreshold = 2000000): DynamicShippingQuote {
  const cleanProv = (province || "").trim();
  const cleanCity = (city || "").trim();
  const isMashhad = cleanCity.includes("مشهد");
  const found = PROVINCE_SHIPPING_TABLE.find((p) => (cleanProv.length > 0 && (p.province === cleanProv || cleanProv.includes(p.province) || p.province.includes(cleanProv))) || (cleanCity.length > 0 && p.capital === cleanCity));
  const baseFeeToman = isMashhad ? 80000 : found ? found.baseFee : 130000;
  const isCapital = isMashhad || (found ? (cleanCity.length === 0 || cleanCity.includes(found.capital) || found.capital.includes(cleanCity)) : true);
  const countySurchargeToman = isCapital ? 0 : (found ? found.countyExtra : 15000);
  const weightSurchargeToman = Math.min(75000, Math.max(0, itemCount - 1) * 15000);
  const threshold = freeThreshold >= 1000000 ? freeThreshold : 2000000;
  const isFree = subtotal >= threshold;
  const rawTotalFee = baseFeeToman + countySurchargeToman + weightSurchargeToman;
  const feeToman = isFree ? 0 : rawTotalFee;
  const remainingForFreeToman = Math.max(0, threshold - subtotal);
  const zoneLabel = isMashhad
    ? "ارسال درون‌شهری مشهد (مبدأ فروشگاه)"
    : found
      ? "پست پیشتاز از مشهد به " + found.province + (cleanCity ? " (" + cleanCity + ")" : "")
      : "پست پیشتاز از مبدأ مشهد";
  const etaLabel = isMashhad ? "۱ روز کاری" : (found ? found.eta : "۳ تا ۵ روز کاری");
  const parts: string[] = ["تعرفه ۱۴۰۵ از مبدأ مشهد: " + formatToman(baseFeeToman)];
  if (countySurchargeToman > 0) parts.push("رهسپاری شهرستان (" + cleanCity + "): +" + formatToman(countySurchargeToman));
  if (weightSurchargeToman > 0) parts.push("وزن و بسته‌بندی (" + itemCount.toLocaleString("fa-IR") + " کالا): +" + formatToman(weightSurchargeToman));
  return {
    feeToman,
    isFree,
    zoneLabel,
    etaLabel,
    breakdownLabel: parts.join(" · "),
    remainingForFreeToman,
    freeThresholdToman: threshold,
    baseFeeToman,
    weightSurchargeToman,
    countySurchargeToman,
  };
}

export function calculateDynamicShipping(params: {
  province?: string | null;
  city?: string | null;
  subtotalToman: number;
  itemCount?: number;
  settings?: StoreSettings;
}): DynamicShippingQuote {
  return computeMashhadShipping(
    params.province || "",
    params.city || "",
    params.subtotalToman,
    params.itemCount ?? 1,
    params.settings?.courierFreeThresholdToman ?? 2000000
  );
}

export function resolveOrderDynamicTotals(params: {
  province: string;
  city: string;
  subtotalToman: number;
  dbDeliveryFeeToman: number;
  dbTotalToman: number;
  itemCount: number;
  freeThreshold?: number;
}) {
  const quote = computeMashhadShipping(params.province, params.city, params.subtotalToman, Math.max(1, params.itemCount), params.freeThreshold ?? 2000000);
  const discountToman = Math.max(0, params.subtotalToman + params.dbDeliveryFeeToman - params.dbTotalToman);
  const deliveryFeeToman = quote.feeToman;
  const totalToman = Math.max(0, params.subtotalToman - discountToman + deliveryFeeToman);
  return { deliveryFeeToman, totalToman, discountToman, quote };
}

export function estimateDeliveryFee(
  method: DeliveryMethod,
  subtotalToman: number,
  settings: StoreSettings,
  province?: string | null,
  city?: string | null,
  itemCount?: number,
): number {
  return computeMashhadShipping(province || "", city || "", subtotalToman, itemCount ?? (method === "post" ? 1 : 1), settings.courierFreeThresholdToman).feeToman;
}

export function fillStoreTokens(text: string, settings: StoreSettings): string {
  const threshold = settings.courierFreeThresholdToman >= 1000000 ? settings.courierFreeThresholdToman : 2000000;
  return text
    .split("{{freeShippingThreshold}}").join(formatToman(threshold))
    .split("{{supportPhone}}").join(settings.supportPhone || "به‌زودی")
    .split("{{supportEmail}}").join(settings.supportEmail || "به‌زودی");
}