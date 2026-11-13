import { Component, computed, inject, input } from '@angular/core';

import { EnglishAutofill } from './english-autofill';

const LABELS = {
  auto: {
    text: 'otomatis',
    title: 'Diterjemahkan otomatis dari Bahasa Indonesia',
  },
  manual: {
    text: 'disunting',
    title: 'Disunting manual; tidak ditimpa terjemahan otomatis',
  },
  copy: {
    text: 'belum diterjemahkan',
    title: 'Terjemahan otomatis gagal; isinya masih salinan Bahasa Indonesia',
  },
} as const;

/** Where the text of one English field came from, beside its label. Nothing outside a form
 * that provides EnglishAutofill, and nothing for fields it does not know. */
@Component({
  selector: 'app-english-badge',
  template: `@if (label(); as current) {
    <span
      [class]="'english-badge english-badge-' + state()"
      [attr.title]="current.title"
      data-testid="english-badge"
      [attr.data-state]="state()"
      >{{ current.text }}</span
    >
  }`,
})
export class EnglishBadge {
  private autofill = inject(EnglishAutofill, { optional: true });

  /** The id of the English input. */
  readonly field = input<string | null | undefined>(null);

  readonly state = computed(() => this.autofill?.stateOf(this.field()) ?? null);
  readonly label = computed(() => {
    const state = this.state();
    return state ? LABELS[state] : null;
  });
}
