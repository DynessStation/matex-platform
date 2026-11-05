import { AbstractControl } from '@angular/forms';

// Rules shared by the form kit: slug shape and the state dot of a form tab.

/** Same shape as the server's slugs (backend input.helper.ts). */
export function slugify(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

export type TabState = 'ok' | 'warn' | 'error';

export interface TabRules {
  /** Must be valid to save. */
  required?: AbstractControl[];
  /** Saved without them, but worth a look when empty. */
  recommended?: AbstractControl[];
}

/**
 * error: a required field was visited and is still invalid; warn: something needs a look (a
 * required field not filled in yet, or a recommended one left empty); ok: nothing left to do.
 */
export function tabState({
  required = [],
  recommended = [],
}: TabRules): TabState {
  const invalid = required.filter((control) => control.invalid);
  if (invalid.some((control) => control.touched)) return 'error';
  if (invalid.length) return 'warn';
  const empty = (control: AbstractControl) =>
    control.value === null ||
    control.value === undefined ||
    String(control.value).trim() === '';
  return recommended.some(empty) ? 'warn' : 'ok';
}
