export interface ITableConfig<T extends IBaseRow = IBaseRow> {
  columns?: ITableColumn[];
  rowActions?: ITableAction[];
  data?: T[];
  total?: number;
  // Rows before search and filters (lists answer it since 5D, D-4).
  total_all?: number;
  permission?: string | string[];
}

export type TableRowId = number | string;
export interface IBaseRow {
  id: TableRowId;
  isChecked?: boolean;
  system_reserve?: string | number;
}

/** A row read by field name (column keys, conditions, row actions). */
export type TableRowFields = Record<string, unknown>;

/** The fields of a row, for reading or setting them by name. */
export const rowFields = (row: IBaseRow): TableRowFields =>
  row as unknown as TableRowFields;

export interface ITableColumn {
  title?: string | undefined;
  dataField?: string;
  key?: string;
  sortable?: boolean;
  sort_direction?: string;
  type?: string;
  canAllow?: string[];
  date_format?: string;
  class?: string;
  placeholder?: string;
  activeLabel?: string;
  inactiveLabel?: string;
}

export interface ITableAction {
  label: string;
  actionToPerform: string;
  icon: string;
  permission?: string | string[];
  conditional?: IConditional;
}

/** A table or modal action: one row (`data`) or, for bulk actions, the selected ids. */
export interface ITableClickedAction<T = IBaseRow> {
  actionToPerform?: string;
  data?: T;
  ids?: TableRowId[];
  value?: unknown;
}

export interface IConditional {
  field: string;
  condition: string;
  value: string;
}
