export interface InsightRankItem {
  title: string;
  sub?: string;
  value: number | string;
  valueLabel?: string;
  /** Remix icon class, or a picture, at the start of the row. */
  icon?: string;
  image?: string;
  /** Address the row opens in a new tab. */
  href?: string;
}

export interface InsightSegment {
  label: string;
  value: number;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'muted';
}

export interface InsightCheck {
  state: 'ok' | 'warn';
  text: string;
  /** Link at the end of the row; its label defaults to "Perbaiki". */
  actionLabel?: string;
  link?: string;
  queryParams?: Record<string, string>;
}

export const INSIGHT_RANGES = ['1H', '7H', '1B'] as const;
export type InsightRange = (typeof INSIGHT_RANGES)[number];
