/** Paging and counts of an API list (A-2; backend helper/list-query.helper.ts pageMeta). */
export interface IListMeta {
  page?: number;
  limit?: number;
  /** Rows matching the search and filters. */
  total: number;
  /** Rows before search and filters ("showing x of y"). */
  total_all?: number;
  total_pages?: number;
}

/** Every API list answers its items in `data` and its paging in `meta`. */
export interface IListResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T[];
  meta: IListMeta;
}

/** An empty list, for store defaults and failed loads. */
export const emptyList = <T>(): IListResponse<T> => ({
  success: true,
  code: '',
  message: '',
  data: [],
  meta: { total: 0, total_all: 0 },
});
