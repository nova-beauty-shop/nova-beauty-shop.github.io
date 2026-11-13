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

export const IRAN_PROVINCES: { province: string; capital: string; zone: 1 | 2 | 3; metroSurcharge?: boolean }[] = [
  { province: "خراسان رضوی", capital: "مشهد", zone: 1 },
  { province: "خراسان شمالی", capital: "بجنورد", zone: 2 },
  { province: "خراسان جنوبی", capital: "بیرجند", zone: 2 },
  { province: "سمنان", capital: "سمنان", zone: 2 },
  { province: "یزد", capital: "یزد", zone: 2 },
  { province: "تهران", capital: "تهران", zone: 3, metroSurcharge: true },
  { province: "البرز", capital: "کرج", zone: 3, metroSurcharge: true },
  { province: "اصفهان", capital: "اصفهان", zone: 3 },
  { province: "فارس", capital: "شیراز", zone: 3 },
  { province: "مازندران", capital: "ساری", zone: 3 },
  { province: "گیلان", capital: "رشت", zone: 3 },
  { province: "گلستان", capital: "گرگان", zone: 3 },
  { province: "آذربایجان شرقی", capital: "تبریز", zone: 3 },
  { province: "آذربایجان غربی", capital: "ارومیه", zone: 3 },
  { province: "خوزستان", capital: "اهواز", zone: 3 },
  { province: "کرمان", capital: "کرمان", zone: 3 },
  { province: "کرمانشاه", capital: "کرمانشاه", zone: 3 },
  { province: "هرمزگان", capital: "بندرعباس", zone: 3 },
  { province: "قم", capital: "قم", zone: 3 },
  { province: "قزوین", capital: "قزوین", zone: 3 },
  { province: "مرکزی", capital: "اراک", zone: 3 },
  { province: "همدان", capital: "همدان", zone: 3 },
  { province: "زنجان", capital: "زنجان", zone: 3 },
  { province: "کردستان", capital: "سنندج", zone: 3 },
  { province: "لرستان", capital: "خرم‌آباد", zone: 3 },
  { province: "اردبیل", capital: "اردبیل", zone: 3 },
  { province: "بوشهر", capital: "بوشهر", zone: 3 },
  { province: "چهارمحال و بختیاری", capital: "شهرکرد", zone: 3 },
  { province: "سیستان و بلوچستان", capital: "زاهدان", zone: 3 },
  { province: "ایلام", capital: "ایلام", zone: 3 },
  { province: "کهگیلویه و بویراحمد", capital: "یاسوج", zone: 3 },
];

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

export function calculateDynamicShipping(params: {
  province?: string | null;
  city?: string | null;
  subtotalToman: number;
  itemCount?: number;
  settings: StoreSettings;
}): DynamicShippingQuote {
  const { province, city, subtotalToman, itemCount = 1, settings } = params;
  const freeThreshold = settings.courierFreeThresholdToman;
  const mashhadBase = settings.courierFeeToman >= 70000 ? settings.courierFeeToman : 80000;
  const nonAdjacentBase = settings.postFeeToman >= 105000 ? settings.postFeeToman : 115000;
  const adjacentBase = Math.round((mashhadBase + nonAdjacentBase) / 2 / 1000) * 1000;

  const cleanProvince = (province ?? "").trim();
  const cleanCity = (city ?? "").trim();
  const matched = IRAN_PROVINCES.find((p) => cleanProvince.includes(p.province) || p.province.includes(cleanProvince));
  const isMashhadCity = cleanCity.includes("مشهد");
  const zone: 1 | 2 | 3 = isMashhadCity ? 1 : !cleanProvince ? 3 : matched ? matched.zone : 3;

  let baseFeeToman = nonAdjacentBase;
  let zoneLabel = "پست پیشتاز از مبدأ مشهد";
  let etaLabel = "۳ تا ۵ روز کاری";
  let countySurchargeToman = 0;

  if (zone === 1) {
    baseFeeToman = mashhadBase;
    if (isMashhadCity || !cleanCity) {
      zoneLabel = "ارسال درون‌شهری مشهد (مبدأ فروشگاه)";
      etaLabel = "۱ روز کاری";
      countySurchargeToman = 0;
    } else {
      zoneLabel = "درون‌استانی خراسان رضوی (مشهد به " + cleanCity + ")";
      etaLabel = "۱ تا ۲ روز کاری";
      countySurchargeToman = 12000;
    }
  } else if (zone === 2) {
    baseFeeToman = adjacentBase;
    zoneLabel = "استان همجوار با خراسان رضوی (" + cleanProvince + ")";
    etaLabel = "۲ تا ۳ روز کاری";
    if (cleanCity && matched && !cleanCity.includes(matched.capital) && !matched.capital.includes(cleanCity)) {
      countySurchargeToman = 15000;
    }
  } else {
    baseFeeToman = nonAdjacentBase;
    zoneLabel = "پست پیشتاز از مشهد به " + (cleanProvince || "سراسر کشور");
    etaLabel = "۳ تا ۵ روز کاری";
    if (matched?.metroSurcharge) {
      countySurchargeToman = 15000;
    } else if (cleanCity && matched && !cleanCity.includes(matched.capital) && !matched.capital.includes(cleanCity)) {
      countySurchargeToman = 15000;
    }
  }

  const extraItems = Math.max(0, itemCount - 2);
  const weightSurchargeToman = Math.min(90000, extraItems * 15000);
  const rawTotalFee = baseFeeToman + countySurchargeToman + weightSurchargeToman;
  const isFree = freeThreshold > 0 && subtotalToman >= freeThreshold;
  const feeToman = isFree ? 0 : rawTotalFee;
  const remainingForFreeToman = Math.max(0, freeThreshold - subtotalToman);

  const parts: string[] = ["پایه از مبدأ مشهد: " + formatToman(baseFeeToman)];
  if (countySurchargeToman > 0) {
    parts.push((matched?.metroSurcharge ? "توزیع کلان‌شهر: +" : "رهسپاری شهرستان: +") + formatToman(countySurchargeToman));
  }
  if (weightSurchargeToman > 0) {
    parts.push("وزن و بسته‌بندی (" + itemCount.toLocaleString("fa-IR") + " کالا): +" + formatToman(weightSurchargeToman));
  }

  return {
    feeToman,
    isFree,
    zoneLabel,
    etaLabel,
    breakdownLabel: parts.join(" · "),
    remainingForFreeToman,
    freeThresholdToman: freeThreshold,
    baseFeeToman,
    weightSurchargeToman,
    countySurchargeToman,
  };
}

export function estimateDeliveryFee(
  method: DeliveryMethod,
  subtotalToman: number,
  settings: StoreSettings,
  province?: string | null,
  city?: string | null,
  itemCount?: number,
): number {
  return calculateDynamicShipping({
    province,
    city,
    subtotalToman,
    itemCount: itemCount ?? (method === "post" ? 2 : 1),
    settings,
  }).feeToman;
}

export function fillStoreTokens(text: string, settings: StoreSettings): string {
  const threshold = settings.courierFreeThresholdToman;
  return text
    .split("{{freeShippingThreshold}}").join(formatToman(threshold))
    .split("{{supportPhone}}").join(settings.supportPhone || "به‌زودی")
    .split("{{supportEmail}}").join(settings.supportEmail || "به‌زودی");
}


export const PROVINCE_SHIPPING_TABLE: { province: string; capital: string; baseFee: number; countyExtra: number; eta: string }[] = [
  { province: "خراسان رضوی", capital: "مشهد", baseFee: 55000, countyExtra: 17000, eta: "۱ روز کاری" },
  { province: "خراسان شمالی", capital: "بجنورد", baseFee: 88000, countyExtra: 10000, eta: "۱ تا ۲ روز کاری" },
  { province: "خراسان جنوبی", capital: "بیرجند", baseFee: 90000, countyExtra: 10000, eta: "۱ تا ۲ روز کاری" },
  { province: "سمنان", capital: "سمنان", baseFee: 94000, countyExtra: 11000, eta: "۲ روز کاری" },
  { province: "یزد", capital: "یزد", baseFee: 98000, countyExtra: 12000, eta: "۲ تا ۳ روز کاری" },
  { province: "گلستان", capital: "گرگان", baseFee: 102000, countyExtra: 12000, eta: "۲ تا ۳ روز کاری" },
  { province: "مازندران", capital: "ساری", baseFee: 108000, countyExtra: 13000, eta: "۲ تا ۳ روز کاری" },
  { province: "کرمان", capital: "کرمان", baseFee: 110000, countyExtra: 14000, eta: "۲ تا ۴ روز کاری" },
  { province: "تهران", capital: "تهران", baseFee: 115000, countyExtra: 12000, eta: "۲ تا ۳ روز کاری" },
  { province: "البرز", capital: "کرج", baseFee: 118000, countyExtra: 12000, eta: "۲ تا ۳ روز کاری" },
  { province: "قم", capital: "قم", baseFee: 112000, countyExtra: 10000, eta: "۲ تا ۳ روز کاری" },
  { province: "مرکزی", capital: "اراک", baseFee: 116000, countyExtra: 13000, eta: "۳ تا ۴ روز کاری" },
  { province: "قزوین", capital: "قزوین", baseFee: 118000, countyExtra: 13000, eta: "۳ تا ۴ روز کاری" },
  { province: "اصفهان", capital: "اصفهان", baseFee: 120000, countyExtra: 14000, eta: "۳ تا ۴ روز کاری" },
  { province: "گیلان", capital: "رشت", baseFee: 124000, countyExtra: 14000, eta: "۳ تا ۴ روز کاری" },
  { province: "زنجان", capital: "زنجان", baseFee: 125000, countyExtra: 14000, eta: "۳ تا ۴ روز کاری" },
  { province: "همدان", capital: "همدان", baseFee: 126000, countyExtra: 14000, eta: "۳ تا ۴ روز کاری" },
  { province: "چهارمحال و بختیاری", capital: "شهرکرد", baseFee: 128000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "لرستان", capital: "خرم‌آباد", baseFee: 130000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "فارس", capital: "شیراز", baseFee: 132000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "کهگیلویه و بویراحمد", capital: "یاسوج", baseFee: 134000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "اردبیل", capital: "اردبیل", baseFee: 135000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "آذربایجان شرقی", capital: "تبریز", baseFee: 136000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "کردستان", capital: "سنندج", baseFee: 136000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "کرمانشاه", capital: "کرمانشاه", baseFee: 138000, countyExtra: 15000, eta: "۳ تا ۵ روز کاری" },
  { province: "هرمزگان", capital: "بندرعباس", baseFee: 138000, countyExtra: 16000, eta: "۳ تا ۵ روز کاری" },
  { province: "سیستان و بلوچستان", capital: "زاهدان", baseFee: 140000, countyExtra: 16000, eta: "۳ تا ۵ روز کاری" },
  { province: "خوزستان", capital: "اهواز", baseFee: 140000, countyExtra: 16000, eta: "۳ تا ۵ روز کاری" },
  { province: "بوشهر", capital: "بوشهر", baseFee: 142000, countyExtra: 16000, eta: "۳ تا ۵ روز کاری" },
  { province: "ایلام", capital: "ایلام", baseFee: 142000, countyExtra: 16000, eta: "۴ تا ۵ روز کاری" },
  { province: "آذربایجان غربی", capital: "ارومیه", baseFee: 145000, countyExtra: 16000, eta: "۴ تا ۵ روز کاری" },
];

export function computeMashhadShipping(province: string, city: string, subtotal: number, itemCount: number, freeThreshold = 2000000) {
  const cleanProv = (province || "").trim();
  const cleanCity = (city || "").trim();
  const isMashhad = cleanCity.includes("مشهد");
  const found = PROVINCE_SHIPPING_TABLE.find((p) => p.province === cleanProv || cleanProv.includes(p.province));
  const base = isMashhad ? 55000 : found ? found.baseFee : 120000;
  const isCapital = isMashhad || (found ? (cleanCity.length === 0 || cleanCity.includes(found.capital) || found.capital.includes(cleanCity)) : true);
  const countyFee = isCapital ? 0 : (found ? found.countyExtra : 14000);
  const extraItemsFee = Math.min(60000, Math.max(0, itemCount - 1) * 10000);
  const threshold = freeThreshold >= 1000000 ? freeThreshold : 2000000;
  const isFree = subtotal >= threshold;
  const feeToman = isFree ? 0 : (base + countyFee + extraItemsFee);
  const zoneLabel = isMashhad
    ? "ارسال درون‌شهری مشهد (مبدأ فروشگاه)"
    : found
      ? "پست پیشتاز از مشهد به " + found.province + (cleanCity ? " (" + cleanCity + ")" : "")
      : "پست پیشتاز از مبدأ مشهد";
  const etaLabel = isMashhad ? "۱ روز کاری" : (found ? found.eta : "۳ تا ۵ روز کاری");
  const parts = ["تعرفه مبدأ مشهد: " + formatToman(base)];
  if (countyFee > 0) parts.push("رهسپاری شهرستان (" + cleanCity + "): +" + formatToman(countyFee));
  if (extraItemsFee > 0) parts.push("بسته‌بندی " + itemCount.toLocaleString("fa-IR") + " کالا: +" + formatToman(extraItemsFee));
  return { feeToman, isFree, zoneLabel, etaLabel, breakdownLabel: parts.join(" · ") };
}

export function resolveOrderDynamicTotals(params: { province: string; city: string; subtotalToman: number; dbDeliveryFeeToman: number; dbTotalToman: number; itemCount: number; freeThreshold?: number }) {
  const quote = computeMashhadShipping(params.province, params.city, params.subtotalToman, Math.max(1, params.itemCount), params.freeThreshold ?? 2000000);
  const discountToman = Math.max(0, params.subtotalToman + params.dbDeliveryFeeToman - params.dbTotalToman);
  const deliveryFeeToman = quote.feeToman;
  const totalToman = Math.max(0, params.subtotalToman - discountToman + deliveryFeeToman);
  return { deliveryFeeToman, totalToman, discountToman, quote };
}
