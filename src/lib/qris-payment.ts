export const QRIS_PAYMENT_WINDOW_MS = 10 * 60 * 1000;

export function qrisSecondsRemaining(createdAt: string | undefined, now: number) {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.ceil((created + QRIS_PAYMENT_WINDOW_MS - now) / 1000));
}

export function formatQrisCountdown(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
