export interface GadgetHomeMediaRule {
  value: string;
  label: string;
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  ratioTolerance: number;
  required: boolean;
}

/**
 * Harus tetap selaras dengan CMS_GADGET_HOME_MEDIA_RULES di Backend.
 * Angka rekomendasi berasal dari aset asli tema Kartify gadget-store.
 */
export const GADGET_HOME_MEDIA_RULES: readonly GadgetHomeMediaRule[] = [
  {
    value: 'home_main',
    label: 'Banner utama',
    recommendedWidth: 3528,
    recommendedHeight: 1956,
    minWidth: 1764,
    minHeight: 978,
    ratioTolerance: 0.05,
    required: true,
  },
  {
    value: 'home_side_1',
    label: 'Banner samping atas',
    recommendedWidth: 1400,
    recommendedHeight: 984,
    minWidth: 700,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  {
    value: 'home_side_2',
    label: 'Banner samping bawah',
    recommendedWidth: 1400,
    recommendedHeight: 984,
    minWidth: 700,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  {
    value: 'home_tile_1',
    label: 'Banner kotak 1',
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  {
    value: 'home_tile_2',
    label: 'Banner kotak 2',
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  {
    value: 'home_tile_3',
    label: 'Banner kotak 3',
    recommendedWidth: 1172,
    recommendedHeight: 984,
    minWidth: 586,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
  {
    value: 'home_tile_4',
    label: 'Banner kotak 4',
    recommendedWidth: 1404,
    recommendedHeight: 984,
    minWidth: 702,
    minHeight: 492,
    ratioTolerance: 0.05,
    required: true,
  },
] as const;

export const getGadgetHomeMediaRule = (
  role: string,
): GadgetHomeMediaRule | null =>
  GADGET_HOME_MEDIA_RULES.find((rule) => rule.value === role) ?? null;
