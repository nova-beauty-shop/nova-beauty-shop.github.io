import type { DeliveryMethod, OrderStatus } from '@/lib/orders';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'در انتظار پرداخت',
  pending_review: 'در انتظار بررسی',
  paid: 'پرداخت شده',
  processing: 'در حال بررسی',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده',
  refunded: 'مرجوع و بازپرداخت شده',
};

export const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  courier: 'ارسال با پیک',
  post: 'پست پیشتاز',
};

const ORDER_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'برای ثبت سفارش ابتدا وارد حساب کاربری خود شوید.',
  address_not_found: 'نشانی انتخاب‌شده دیگر معتبر نیست. لطفاً نشانی دیگری انتخاب کنید.',
  product_unavailable: 'برخی محصولات سبد شما دیگر در دسترس نیستند. سبد خرید را بررسی کنید.',
  out_of_stock: 'موجودی بعضی از محصولات کافی نیست. تعداد آن‌ها را در سبد خرید تغییر دهید.',
  invalid_variant: 'گزینه انتخاب‌شده برای یکی از محصولات معتبر نیست. سبد خرید را بررسی کنید.',
  payments_disabled: 'پرداخت کارت به کارت در حال حاضر فعال نیست. لطفاً بعداً دوباره تلاش کنید.',
  invalid_slot: 'بازه زمانی تحویل انتخاب‌شده معتبر نیست. لطفاً روز و ساعت دیگری انتخاب کنید.',
  coupon_invalid: 'کد تخفیف واردشده معتبر نیست.',
  coupon_exhausted: 'ظرفیت استفاده از این کد تخفیف به پایان رسیده است.',
  coupon_min_subtotal: 'مبلغ سبد خرید شما برای استفاده از این کد تخفیف کافی نیست.',
  sample_unavailable: 'نمونه رایگان انتخاب‌شده دیگر در دسترس نیست. لطفاً انتخاب خود را تغییر دهید.',
  account_blocked: 'امکان ثبت سفارش برای این حساب وجود ندارد. با پشتیبانی فروشگاه تماس بگیرید.',
};

export function orderErrorMessage(code: string): string {
  return ORDER_ERROR_MESSAGES[code] ?? 'ثبت سفارش انجام نشد. لطفاً دوباره تلاش کنید.';
}
