import { Component, inject } from '@angular/core';

import { EnglishAutofill } from './english-autofill';
import { EnglishService } from '../../../services/english.service';

/** "Tampilkan Inggris": the switch above a form, with what English currently holds. */
@Component({
  selector: 'app-english-toggle',
  template: `<div class="english-toggle" data-testid="english-toggle">
    <label class="english-toggle-switch">
      <input
        type="checkbox"
        role="switch"
        data-testid="english-show"
        [checked]="english.visible()"
        (change)="english.setVisible($any($event.target).checked)"
      />
      <span>Tampilkan Inggris</span>
    </label>
    <span class="english-toggle-note">
      @if (autofill; as fill) {
        @if (fill.busy()) {
          Menerjemahkan ke English…
        } @else {
          English mengikuti Bahasa Indonesia saat disimpan.
          @if (fill.summary().manual) {
            <span class="english-badge english-badge-manual"
              >{{ fill.summary().manual }} disunting</span
            >
          }
          @if (fill.summary().copy) {
            <span class="english-badge english-badge-copy"
              >{{ fill.summary().copy }} belum diterjemahkan</span
            >
          }
        }
      }
    </span>
    @if (autofill && english.visible()) {
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        data-testid="english-refill"
        [disabled]="autofill.busy()"
        (click)="autofill.refillAll()"
        title="Semua field English diterjemahkan ulang dari Bahasa Indonesia saat disimpan, termasuk yang pernah disunting."
      >
        Isi ulang English dari Indonesia
      </button>
    }
  </div>`,
})
export class EnglishToggle {
  readonly english = inject(EnglishService);
  readonly autofill = inject(EnglishAutofill, { optional: true });
}
