export type InlineRow = Record<string, unknown>;

export interface InlineOption {
  value: string;
  label: string;
  /** Remix icon class shown before the label. */
  icon?: string;
  /** Shown as a coloured pill instead of plain text. */
  tone?: 'success' | 'danger' | 'info' | 'muted';
}

export interface InlineColumn {
  key: string;
  label: string;
  /** text: input; number: digits only, grouped as typed; date: date picker; select: dropdown
   * of options; computed: read-only from compute(). */
  type?: 'text' | 'number' | 'date' | 'select' | 'computed';
  /** Digits after the decimal mark, for number columns. */
  decimals?: number;
  width?: string;
  options?: InlineOption[];
  placeholder?: string;
  /** Message (or i18n key) when the value is not acceptable, null when it is. */
  validate?: (value: unknown, row: InlineRow) => string | null;
  compute?: (row: InlineRow) => string;
  /** Shows the value as a link that opens in a new tab. */
  link?: boolean;
}

/** Sent up to save or remove a row. The page calls done(true) once the server agreed. */
export interface InlineChange {
  row: InlineRow;
  index: number;
  isNew: boolean;
  done: (ok: boolean, saved?: InlineRow) => void;
}

/** What the #rowDetail template receives. */
export interface InlineDetailContext {
  $implicit: InlineRow;
  editing: boolean;
  folded: boolean;
  set: (key: string, value: unknown) => void;
  /** Messages from validateRow for the fields in this part. */
  errors: Record<string, string>;
}
