export class AdminWriteError extends Error {
  constructor(readonly code: 'duplicate' | 'invalid' | 'failed') {
    super(code);
  }
}

export function toAdminWriteError(error: { code?: string }): AdminWriteError {
  if (error.code === '23505') return new AdminWriteError('duplicate');
  if (error.code === '23514' || error.code === '22P02') return new AdminWriteError('invalid');
  return new AdminWriteError('failed');
}

const ADMIN_WRITE_MESSAGES: Record<AdminWriteError['code'], string> = {
  duplicate: 'این مورد قبلاً ثبت شده است.',
  invalid: 'اطلاعات واردشده معتبر نیست. لطفاً مقادیر را بررسی کنید.',
  failed: 'ذخیره انجام نشد. لطفاً دوباره تلاش کنید.',
};

export function adminWriteErrorMessage(error: unknown): string {
  if (error instanceof AdminWriteError) return ADMIN_WRITE_MESSAGES[error.code];
  return ADMIN_WRITE_MESSAGES.failed;
}
