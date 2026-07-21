/**
 * Backend xato javobidan foydalanuvchiga ko'rsatiladigan matnni ajratib oladi.
 *
 * Laravel odatda ikki ko'rinishda qaytaradi:
 *   422 -> { message, errors: { field: ["matn", ...] } }
 *   4xx/5xx -> { message }
 *
 * Maydon xatolari bo'lsa — birinchisi olinadi (notification bitta qatorli).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: unknown } })?.response;
  const data = response?.data as
    | { message?: unknown; errors?: Record<string, unknown> }
    | undefined;

  if (!data) return fallback;

  const firstFieldError = data.errors && Object.values(data.errors)[0];
  if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === 'string') {
    return firstFieldError[0];
  }
  if (typeof firstFieldError === 'string') return firstFieldError;

  if (typeof data.message === 'string' && data.message.trim()) return data.message;

  return fallback;
}
