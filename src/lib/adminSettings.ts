import { supabase } from '@/lib/supabase';
import type { StoreSettings } from '@/lib/storeSettings';

export type AdminRole = 'owner' | 'manager' | 'reviewer';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'مالک فروشگاه',
  manager: 'مدیر فروشگاه',
  reviewer: 'بررسی‌کننده پرداخت',
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: 'دسترسی کامل، از جمله مدیریت مدیران و تنظیمات امنیتی',
  manager: 'تنظیمات فروشگاه، پرداخت و کارت بانکی، و بررسی رسیدها',
  reviewer: 'فقط بررسی و تأیید یا رد رسیدهای پرداخت',
};

export interface AdminAccess {
  role: AdminRole;
  username: string;
}

export interface AdminAccount {
  userId: string;
  email: string;
  username: string;
  role: AdminRole;
  createdAt: string;
}

export interface BankCardInput {
  bankName: string;
  cardNumber: string;
  accountHolder: string;
  accountNumber: string;
  iban: string;
}

export interface PaymentToggleInput {
  enabled: boolean;
  instructions: string;
  notice: string;
}

export class AdminError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: 'شما دسترسی لازم برای این کار را ندارید.',
  not_authenticated: 'برای ادامه ابتدا وارد حساب کاربری خود شوید.',
  invalid_store_name: 'نام فروشگاه باید بین ۲ تا ۸۰ نویسه باشد.',
  invalid_phone: 'شماره تماس معتبر نیست. فقط رقم، +، خط تیره و پرانتز مجاز است.',
  invalid_email: 'ایمیل وارد‌شده معتبر نیست.',
  invalid_address: 'نشانی فروشگاه نباید بیشتر از ۳۰۰ نویسه باشد.',
  invalid_fee: 'مبلغ ارسال باید عددی بین صفر و ۱۰۰ میلیون تومان باشد.',
  invalid_bank_name: 'نام بانک باید بین ۲ تا ۶۰ نویسه باشد.',
  invalid_card_number: 'شماره کارت باید دقیقاً ۱۶ رقم باشد.',
  invalid_account_holder: 'نام صاحب حساب باید بین ۲ تا ۱۰۰ نویسه باشد.',
  invalid_account_number: 'شماره حساب معتبر نیست. فقط ارقام (۵ تا ۳۰ رقم) مجاز است.',
  invalid_iban: 'شماره شبا باید با IR شروع شده و ۲۶ کاراکتر باشد.',
  invalid_instructions: 'متن راهنمای پرداخت نباید بیشتر از ۱۰۰۰ نویسه باشد.',
  invalid_notice: 'متن اطلاعیه نباید بیشتر از ۵۰۰ نویسه باشد.',
  invalid_username: 'نام کاربری باید ۳ تا ۳۰ نویسه و فقط شامل حروف انگلیسی کوچک، رقم و _ باشد.',
  invalid_role: 'نقش انتخاب‌شده معتبر نیست.',
  invalid_request: 'درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.',
  bank_card_incomplete: 'برای فعال‌سازی پرداخت کارت به کارت، ابتدا اطلاعات کارت بانکی را کامل ثبت کنید.',
  account_not_found: 'حسابی با این ایمیل پیدا نشد. ابتدا کاربر باید در سایت ثبت‌نام کند.',
  already_admin: 'این کاربر از قبل مدیر است.',
  username_taken: 'این نام کاربری قبلاً استفاده شده است.',
  owner_exists: 'مالک فروشگاه قبلاً تعیین شده است.',
  bootstrap_closed: 'فعال‌سازی مالک قبلاً انجام شده و دیگر در دسترس نیست.',
  invalid_secret: 'کلید فعال‌سازی درست نیست.',
  bootstrap_not_configured: 'کلید فعال‌سازی هنوز در تنظیمات سرور ثبت نشده است. راهنمای راه‌اندازی را ببینید.',
  admin_not_found: 'این مدیر پیدا نشد. فهرست را به‌روز کنید.',
  last_owner: 'حداقل یک مالک باید در فروشگاه باقی بماند.',
  cannot_remove_self: 'نمی‌توانید حساب خودتان را از فهرست مدیران حذف کنید.',
  weak_password: 'رمز عبور باید حداقل ۸ نویسه باشد.',
};

export function adminErrorMessage(error: unknown): string {
  if (error instanceof AdminError) {
    return ADMIN_ERROR_MESSAGES[error.code] ?? 'عملیات انجام نشد. لطفاً دوباره تلاش کنید.';
  }
  return 'عملیات انجام نشد. لطفاً دوباره تلاش کنید.';
}

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toRole(value: unknown): AdminRole {
  return value === 'owner' || value === 'manager' ? value : 'reviewer';
}

function rpcError(error: { message: string }): AdminError {
  return new AdminError(error.message.trim());
}

export async function fetchAdminAccess(): Promise<AdminAccess | null> {
  const { data, error } = await supabase.rpc('admin_me');
  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as Row;
  return { role: toRole(row.admin_role), username: asString(row.admin_username) };
}

export async function fetchBootstrapOpen(): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_bootstrap_status');
  if (error) throw error;
  return data === false;
}

export async function claimFirstOwner(username?: string): Promise<void> {
  const clean = username?.trim().toLowerCase() ?? '';
  const { error } = await supabase.rpc('claim_initial_owner', { desired_username: clean === '' ? null : clean });
  if (error) throw rpcError(error);
}

export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase.rpc('admin_list_admins');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('unexpected admin list response');
  return data.map((raw) => {
    const row = raw as Row;
    return {
      userId: asString(row.admin_user_id),
      email: asString(row.admin_email),
      username: asString(row.admin_username),
      role: toRole(row.admin_role),
      createdAt: asString(row.admin_created_at),
    };
  });
}

export async function addAdmin(email: string, username: string, role: AdminRole): Promise<void> {
  const { error } = await supabase.rpc('admin_add_admin', { p_email: email, p_username: username, p_role: role });
  if (error) throw rpcError(error);
}

export async function updateAdmin(userId: string, username: string, role: AdminRole): Promise<void> {
  const { error } = await supabase.rpc('admin_update_admin', { p_user_id: userId, p_username: username, p_role: role });
  if (error) throw rpcError(error);
}

export async function removeAdmin(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_admin', { p_user_id: userId });
  if (error) throw rpcError(error);
}

export async function saveStoreSettings(input: StoreSettings): Promise<void> {
  const { error } = await supabase.rpc('admin_update_store_settings', {
    p_store_name: input.storeName,
    p_support_phone: input.supportPhone,
    p_support_email: input.supportEmail,
    p_address: input.address,
    p_courier_fee_toman: input.courierFeeToman,
    p_courier_free_threshold_toman: input.courierFreeThresholdToman,
    p_post_fee_toman: input.postFeeToman,
  });
  if (error) throw rpcError(error);
}

export async function saveBankCard(input: BankCardInput): Promise<void> {
  const { error } = await supabase.rpc('admin_update_bank_card', {
    p_bank_name: input.bankName,
    p_card_number: input.cardNumber,
    p_account_holder: input.accountHolder,
    p_account_number: input.accountNumber,
    p_iban: input.iban,
  });
  if (error) throw rpcError(error);
}

export async function savePaymentToggle(input: PaymentToggleInput): Promise<void> {
  const { error } = await supabase.rpc('admin_update_payment_settings', {
    p_enabled: input.enabled,
    p_instructions: input.instructions,
    p_notice: input.notice,
  });
  if (error) throw rpcError(error);
}

export async function changeOwnPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new AdminError(error.status === 422 ? 'weak_password' : 'password_update_failed');
}
