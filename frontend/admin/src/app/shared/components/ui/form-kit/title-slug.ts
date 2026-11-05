import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import { AutoField } from './auto-field';
import { slugify } from './form-kit.util';
import {
  SlugCheckService,
  SlugEntity,
} from '../../../services/slug-check.service';
import { HelpTip } from '../help/help-tip/help-tip';

// Title, then its address (G-3). In a new record the address follows what is typed in the title
// until someone sets a custom one; in an existing record it stays put, since changing it moves a
// page that may already be linked (the old address keeps working, backend slug-redirect).
@Component({
  selector: 'app-title-slug',
  imports: [ReactiveFormsModule, TranslateModule, AutoField, HelpTip],
  templateUrl: './title-slug.html',
})
export class TitleSlug {
  private readonly slugCheck = inject(SlugCheckService);
  private readonly destroyRef = inject(DestroyRef);

  readonly titleControl = input.required<FormControl<string | null>>();
  readonly slugControl = input.required<FormControl<string | null>>();
  /** Whether the address follows the title: true for a new record. */
  readonly follow = input(true);
  /** Address before the slug, such as /artikel/. */
  readonly prefix = input('');
  /** Start of the ids of both inputs, unique per language. */
  readonly fieldPrefix = input('');
  readonly titleLabelKey = input('form_kit.title');
  readonly slugLabelKey = input('form_kit.slug');
  readonly titleHelp = input('');
  readonly slugHelp = input('');
  /** Shown small under the address. Empty for a new record: the server makes it. */
  readonly internalKey = input('');
  /** For the "already used" check; no check without an entity. */
  readonly entity = input<SlugEntity | null>(null);
  readonly locale = input('id-ID');
  readonly recordId = input<string | null>(null);

  readonly slugify = slugify;
  readonly moved = signal(false);
  private custom = false;
  private savedSlug = '';
  private readonly checks = new Subject<string>();

  constructor() {
    this.checks
      .pipe(
        debounceTime(300),
        switchMap((slug) => {
          const entity = this.entity();
          if (!entity || !slug) return of(null);
          return this.slugCheck
            .check(entity, this.locale(), slug, this.recordId())
            .pipe(
              map((response) => response.data.available),
              catchError(() => of(null)),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((available) => this.markTaken(available === false));
  }

  // Only typing moves the address: loading a saved record does not reach this.
  onTitleInput(): void {
    const slug = this.slugControl();
    if (this.custom || (!this.follow() && slug.value)) return;
    slug.setValue(slugify(this.titleControl().value));
    this.checks.next(slug.value ?? '');
  }

  onSlugOpened(): void {
    this.savedSlug = this.slugControl().value ?? '';
  }

  onSlugClosed(value: string): void {
    this.custom = !!value;
    this.moved.set(
      !this.follow() && !!this.savedSlug && value !== this.savedSlug,
    );
    this.checks.next(value);
  }

  get slugInvalid(): boolean {
    const slug = this.slugControl();
    return slug.touched && slug.invalid;
  }

  private markTaken(taken: boolean): void {
    const slug = this.slugControl();
    const errors = { ...(slug.errors ?? {}) };
    delete errors['duplicate'];
    if (taken) errors['duplicate'] = true;
    slug.setErrors(Object.keys(errors).length ? errors : null);
    if (taken) slug.markAsTouched();
  }
}
