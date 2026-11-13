import { Injectable, computed, inject, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { firstValueFrom } from 'rxjs';

import {
  EnglishContentType,
  EnglishFieldType,
  EnglishService,
  EnglishSource,
} from '../../../services/english.service';
import { NotificationService } from '../../../services/notification.service';
import { slugify } from '../form-kit/form-kit.util';

/** One English field and the Indonesian field it follows. */
export interface EnglishPair {
  /** Stable name inside the record: name, specs.0.label, content.items.1.title. */
  key: string;
  id: () => string;
  en: () => string;
  set: (value: string) => void;
  /** Format for the translator; guessed from the Indonesian text when missing. */
  type?: EnglishFieldType;
  /** Id of the English input, so its label can show where the text came from. */
  domId?: string;
  /** An address made from another English field instead of translated. Filled only while
   * empty, so a saved address never moves on its own. */
  slugOf?: string;
}

interface Snapshot {
  id: string;
  en: string;
}

const MAX_FIELDS = 60;
const MAX_CHARS = 150_000;

const typeOf = (text: string): EnglishFieldType =>
  /<\/?[a-z][\s\S]*>/i.test(text)
    ? 'rich_text_html'
    : text.includes('\n')
      ? 'multiline_text'
      : 'plain_text';

/**
 * English filled from Indonesian when a form is saved (V1.2 Part 3, stage 4). Provided by each
 * form component; the form tells it its pairs, remembers the record's state after loading,
 * calls fill() before validating, and saveSources() once the record is saved.
 * Rules: a field someone edited (now or before) stays as it is; any other field is translated
 * when its Indonesian changed or its English is empty; a failed translation copies the
 * Indonesian and marks it. Records from before this existed keep the English they have.
 */
@Injectable()
export class EnglishAutofill {
  private english = inject(EnglishService);
  private notification = inject(NotificationService);

  private type: EnglishContentType = 'product';
  private pairs: () => EnglishPair[] = () => [];
  private baseline = new Map<string, Snapshot>();
  private force = false;

  readonly states = signal<Record<string, EnglishSource>>({});
  readonly busy = signal(false);
  readonly visible = this.english.visible;

  readonly summary = computed(() => {
    const values = Object.values(this.states());
    return {
      auto: values.filter((v) => v === 'auto').length,
      manual: values.filter((v) => v === 'manual').length,
      copy: values.filter((v) => v === 'copy').length,
    };
  });

  private readonly byDomId = computed(() => {
    const states = this.states();
    const result = new Map<string, EnglishSource>();
    for (const pair of this.pairs()) {
      if (pair.domId && states[pair.key])
        result.set(pair.domId, states[pair.key]);
    }
    return result;
  });

  configure(type: EnglishContentType, pairs: () => EnglishPair[]): void {
    this.type = type;
    this.pairs = pairs;
  }

  /** The source shown beside an English input. */
  stateOf(domId: string | null | undefined): EnglishSource | null {
    return domId ? (this.byDomId().get(domId) ?? null) : null;
  }

  /**
   * Remembers the record as loaded. A saved record brings its stored sources; English that is
   * there without one was written before this existed and counts as edited.
   */
  async remember(ref: string | null): Promise<void> {
    let stored: Record<string, EnglishSource> = {};
    if (ref) {
      try {
        const response = await firstValueFrom(
          this.english.sources(this.type, ref),
        );
        stored = response.data?.sources ?? {};
      } catch {
        stored = {};
      }
    }
    const states: Record<string, EnglishSource> = {};
    this.baseline.clear();
    for (const pair of this.pairs()) {
      const snapshot = { id: pair.id() ?? '', en: pair.en() ?? '' };
      this.baseline.set(pair.key, snapshot);
      const source = stored[pair.key];
      if (source) states[pair.key] = source;
      else if (ref && snapshot.en.trim()) states[pair.key] = 'manual';
    }
    this.states.set(states);
    this.force = false;
  }

  /** "Isi ulang EN dari Indonesia": every English field is translated again on save. */
  refillAll(): void {
    const states: Record<string, EnglishSource> = {};
    for (const pair of this.pairs()) {
      states[pair.key] = 'auto';
      // What is there now no longer counts as an edit.
      const base = this.baseline.get(pair.key);
      this.baseline.set(pair.key, { id: base?.id ?? '', en: pair.en() ?? '' });
    }
    this.states.set(states);
    this.force = true;
  }

  /** Fills the English fields that follow Indonesian. Never throws. */
  async fill(context = ''): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.run(context);
    } finally {
      this.busy.set(false);
    }
  }

  private async run(context: string): Promise<void> {
    const pairs = this.pairs();
    const states = { ...this.states() };
    const queue: EnglishPair[] = [];
    const translated = new Set<string>();

    for (const pair of pairs) {
      const base = this.baseline.get(pair.key) ?? { id: '', en: '' };
      const id = pair.id() ?? '';
      const en = pair.en() ?? '';
      // Edited in this form since it opened: the person's text wins from now on.
      if (en !== base.en && states[pair.key] !== 'manual')
        states[pair.key] = 'manual';
      if (states[pair.key] === 'manual' || pair.slugOf) continue;
      if (!id.trim()) {
        if (en && states[pair.key]) pair.set('');
        delete states[pair.key];
        continue;
      }
      const needed =
        this.force ||
        !en.trim() ||
        id !== base.id ||
        states[pair.key] === 'copy';
      if (needed) queue.push(pair);
    }

    let failed = 0;
    for (const chunk of this.chunks(queue)) {
      const fields: Record<string, string> = {};
      const types: Record<string, EnglishFieldType> = {};
      chunk.forEach((pair, index) => {
        const id = pair.id() ?? '';
        fields[`f${index}`] = id;
        types[`f${index}`] = pair.type ?? typeOf(id);
      });
      let answer: Record<string, string> | null = null;
      try {
        const response = await firstValueFrom(
          this.english.translate(this.type, fields, types, context),
        );
        answer = response.data?.fields ?? null;
      } catch {
        answer = null;
      }
      chunk.forEach((pair, index) => {
        const value = answer?.[`f${index}`];
        if (typeof value === 'string' && value.trim()) {
          pair.set(value);
          states[pair.key] = 'auto';
        } else {
          pair.set(pair.id() ?? '');
          states[pair.key] = 'copy';
          failed += 1;
        }
        translated.add(pair.key);
      });
    }

    // Addresses: made from their English title while still empty.
    for (const pair of pairs) {
      if (!pair.slugOf || states[pair.key] === 'manual') continue;
      const from = pairs.find((item) => item.key === pair.slugOf);
      const en = pair.en() ?? '';
      const base = this.baseline.get(pair.key) ?? { id: '', en: '' };
      if (en !== base.en) {
        states[pair.key] = 'manual';
        continue;
      }
      if (en.trim() || !from) continue;
      const slug = slugify(from.en());
      if (!slug) continue;
      pair.set(slug);
      states[pair.key] =
        translated.has(from.key) && states[from.key] === 'copy'
          ? 'copy'
          : 'auto';
    }

    for (const pair of pairs) {
      this.baseline.set(pair.key, { id: pair.id() ?? '', en: pair.en() ?? '' });
    }
    this.states.set(states);
    this.force = false;
    if (failed) {
      this.notification.showError(
        `Terjemahan otomatis belum berhasil untuk ${failed} field. English sementara disalin dari Bahasa Indonesia dan ditandai "belum diterjemahkan".`,
      );
    }
  }

  /** Shows English when one of its controls (named en_*) is still invalid, so the red field
   * can be seen. True when English was hidden and is now shown. */
  revealInvalid(controls: Record<string, { invalid: boolean }>): boolean {
    if (this.visible()) return false;
    const invalid = Object.entries(controls).some(
      ([name, control]) => name.startsWith('en_') && control.invalid,
    );
    if (invalid) this.english.setVisible(true);
    return invalid;
  }

  /** Stores where each English field came from. Call after the record is saved. */
  async saveSources(ref: string | null | undefined): Promise<void> {
    if (!ref) return;
    const keys = new Set(this.pairs().map((pair) => pair.key));
    const sources = Object.fromEntries(
      Object.entries(this.states()).filter(([key]) => keys.has(key)),
    );
    try {
      await firstValueFrom(this.english.saveSources(this.type, ref, sources));
    } catch {
      // Only the marks are lost; the record itself is saved.
    }
  }

  private chunks(queue: EnglishPair[]): EnglishPair[][] {
    const result: EnglishPair[][] = [];
    let current: EnglishPair[] = [];
    let size = 0;
    for (const pair of queue) {
      const length = (pair.id() ?? '').length;
      if (
        current.length &&
        (current.length >= MAX_FIELDS || size + length > MAX_CHARS)
      ) {
        result.push(current);
        current = [];
        size = 0;
      }
      current.push(pair);
      size += length;
    }
    if (current.length) result.push(current);
    return result;
  }
}

/** Pairs for controls named id_<key> and en_<key> in one form group. */
export function controlPairs(
  controls: Record<string, AbstractControl>,
  keys: string[],
  options: {
    types?: Record<string, EnglishFieldType>;
    domIds?: Record<string, string>;
    slugs?: Record<string, string>;
  } = {},
): EnglishPair[] {
  return keys
    .filter((key) => controls[`id_${key}`] && controls[`en_${key}`])
    .map((key) => ({
      key,
      id: () => String(controls[`id_${key}`].value ?? ''),
      en: () => String(controls[`en_${key}`].value ?? ''),
      set: (value: string) => controls[`en_${key}`].setValue(value),
      type: options.types?.[key],
      domId: options.domIds?.[key] ?? `en_${key}`,
      slugOf: options.slugs?.[key],
    }));
}

/** Text fields that are not translated: addresses, links, keys, and settings. */
const SKIP_KEYS =
  /(^|_)(slug|url|href|link|path|key|id|icon|image|locale|status|type|robots|schema|canonical|cta_url|action_value|category_id|role|order|version)$/i;

/**
 * Pairs for every text leaf of an Indonesian object and its English twin of the same shape,
 * such as the content blocks of a website page. Writes go into the English object in place.
 */
export function objectPairs(
  prefix: string,
  id: () => unknown,
  en: () => unknown,
  write: (path: (string | number)[], value: string) => void,
): EnglishPair[] {
  const pairs: EnglishPair[] = [];
  const walk = (value: unknown, path: (string | number)[]) => {
    if (typeof value === 'string') {
      const last = String(path[path.length - 1] ?? '');
      if (SKIP_KEYS.test(last)) return;
      const read = (root: unknown) => {
        let node = root;
        for (const step of path) {
          if (node == null || typeof node !== 'object') return '';
          node = (node as Record<string | number, unknown>)[step];
        }
        return typeof node === 'string' ? node : '';
      };
      pairs.push({
        key: [prefix, ...path].join('.'),
        id: () => read(id()),
        en: () => read(en()),
        set: (text: string) => write(path, text),
      });
      return;
    }
    if (Array.isArray(value))
      value.forEach((item, index) => walk(item, [...path, index]));
    else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value))
        walk(item, [...path, key]);
    }
  };
  walk(id(), []);
  return pairs;
}

/** Writes a value at a path inside an object, creating missing objects on the way. */
export function writePath(
  root: unknown,
  path: (string | number)[],
  value: string,
): void {
  if (!root || typeof root !== 'object' || !path.length) return;
  let node = root as Record<string | number, unknown>;
  for (const [index, step] of path.slice(0, -1).entries()) {
    const next = node[step];
    if (!next || typeof next !== 'object') {
      node[step] = typeof path[index + 1] === 'number' ? [] : {};
    }
    node = node[step] as Record<string | number, unknown>;
  }
  node[path[path.length - 1]] = value;
}
