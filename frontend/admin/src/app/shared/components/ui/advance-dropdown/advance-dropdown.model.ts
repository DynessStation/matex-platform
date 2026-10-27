/**
 * One option of the advance dropdown (a category tree today): an id, its label under the
 * `displayKey` field, and its children under the `subArrayKey` field.
 */
export interface DropdownOption {
  id: string | number;
  selected?: boolean;
  category_icon?: { original_url?: string } | null;
}

const field = (option: DropdownOption, key: string): unknown =>
  (option as unknown as Record<string, unknown>)[key];

export type DropdownOptionId = DropdownOption['id'];

/** The children of an option under `key`, or none. */
export const optionChildren = (
  option: DropdownOption,
  key: string | undefined,
): DropdownOption[] => {
  const children = key ? field(option, key) : undefined;
  return Array.isArray(children) ? (children as DropdownOption[]) : [];
};

/** The label of an option under `key`, as text. */
export const optionLabel = (option: DropdownOption, key: string): string =>
  String(field(option, key) ?? '');
