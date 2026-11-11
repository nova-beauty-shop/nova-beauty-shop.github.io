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
  const freeThreshold = settings.courierFreeThresholdToman >= 1000000 ? settings.courierFreeThresholdToman : 2000000;
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
  const isFree = subtotalToman >= freeThreshold;
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
  const threshold = settings.courierFreeThresholdToman >= 1000000 ? settings.courierFreeThresholdToman : 2000000;
  return text
    .split("{{freeShippingThreshold}}").join(formatToman(threshold))
    .split("{{supportPhone}}").join(settings.supportPhone || "به‌زودی")
    .split("{{supportEmail}}").join(settings.supportEmail || "به‌زودی");
}
