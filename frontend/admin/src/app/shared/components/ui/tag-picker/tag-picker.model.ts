/** A tag in the list. */
export interface TagOption {
  id: string;
  name: string;
  count: number;
}

/** A tag on the record: without id, a new one the server makes when the record is saved. */
export interface TagChoice {
  id?: string;
  name: string;
}
