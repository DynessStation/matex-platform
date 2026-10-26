/**
 * Read-only place of an item in a server-kept order: "Posisi 3 dari 8", or `none` when it has
 * no place yet (a new item goes last when saved).
 */
export const positionText = (
  position: number | null | undefined,
  total: number | null | undefined,
  none = 'Paling akhir setelah disimpan',
): string => (position && total ? `Posisi ${position} dari ${total}` : none);
