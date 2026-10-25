import { Params } from '@angular/router';

// Stateless helpers of the shared list table (table.ts).

//==================================================
//==== STATE
//==================================================

/** Page sizes the table offers. */
export const TABLE_PAGE_SIZES = [15, 25, 50, 100];

/** The table query read back from URL or caller state, with invalid values reset. */
export function normalizeTableState(params: Params, current: Params): Params {
  const page = Number(params['page']);

  const paginate = Number(params['paginate']);

  return {
    ...current,

    search: typeof params['search'] === 'string' ? params['search'] : '',

    field: typeof params['field'] === 'string' ? params['field'] : '',

    sort:
      params['sort'] === 'asc' || params['sort'] === 'desc'
        ? params['sort']
        : '',

    page: Number.isInteger(page) && page > 0 ? page : 1,

    paginate: TABLE_PAGE_SIZES.includes(paginate) ? paginate : 15,
  };
}

//==================================================
//==== PERMISSION
//==================================================

/** Whether any of the required permissions is granted (no requirement passes). */
export function isPermissionGranted(
  granted: string[],
  permission?: string | string[],
): boolean {
  if (!permission) {
    return true;
  }

  if (Array.isArray(permission)) {
    return permission.some((item) => granted.includes(item));
  }

  return granted.includes(permission);
}

//==================================================
//==== CELLS
//==================================================

export function isSwitchActive(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function nextSwitchValue(value: unknown): 0 | 1 {
  return isSwitchActive(value) ? 0 : 1;
}

/** Row action condition: compares a row field (or an array field's length) with a value. */
export function isConditionMet(
  condition: {
    field: string;
    condition: string;
    value: string;
  },
  columnData: any,
): boolean {
  const field = Array.isArray(columnData[condition.field])
    ? columnData[condition.field].length
    : columnData[condition.field];

  switch (condition.condition) {
    case '==':
      return field == condition.value;

    case '!=':
      return field != condition.value;

    default:
      return false;
  }
}

/** Reads a dotted path ("office.name") from a row; '' when any step is missing. */
export function getNestedPropertyValue(
  dataField: string | undefined,

  columnData: any,
): string {
  if (!dataField) {
    return '';
  }

  const keys = dataField.split('.');

  let value = columnData;

  for (const key of keys) {
    if (value && Object.prototype.hasOwnProperty.call(value, key)) {
      value = value[key];
    } else {
      return '';
    }
  }

  return value;
}

//==================================================
//==== DISPLAY SETTINGS (U-3)
//==================================================

/** Per-admin table display settings, kept in this browser only. */
export interface TableViewSettings {
  fullText: boolean; // cells show their whole text instead of two lines
  hideSort: boolean; // header sort buttons hidden
  striped: boolean; // alternate row background
}

const DEFAULT_TABLE_VIEW_SETTINGS: TableViewSettings = {
  fullText: false,
  hideSort: false,
  striped: false,
};

function tableViewKey(owner: string | null): string {
  return `matex-admin-table-view:${owner ?? 'guest'}`;
}

export function readTableViewSettings(owner: string | null): TableViewSettings {
  try {
    const stored = JSON.parse(
      globalThis.localStorage?.getItem(tableViewKey(owner)) ?? 'null',
    );

    return {
      fullText: stored?.fullText === true,
      hideSort: stored?.hideSort === true,
      striped: stored?.striped === true,
    };
  } catch {
    return { ...DEFAULT_TABLE_VIEW_SETTINGS };
  }
}

export function writeTableViewSettings(
  owner: string | null,
  settings: TableViewSettings,
): void {
  try {
    globalThis.localStorage?.setItem(
      tableViewKey(owner),
      JSON.stringify(settings),
    );
  } catch {
    // Storage blocked (private window, quota): the setting lasts for this page only.
  }
}
