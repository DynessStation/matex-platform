import { Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { TagChoice, TagOption } from './tag-picker.model';

// Pick several tags, or write a new one. The list shows how many records use each tag. New tags
// stay names in the control until the record is saved (the server makes them).
@Component({
  selector: 'app-tag-picker',
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './tag-picker.html',
})
export class TagPicker {
  readonly control = input.required<FormControl<TagChoice[] | null>>();
  readonly options = input<TagOption[]>([]);
  readonly inputId = input('tags');
  readonly max = input(20);
  /** Size of the longest name the server takes. */
  readonly maxLength = input(100);

  readonly manage = output<void>();

  readonly term = signal('');
  readonly open = signal(false);

  private chosen(): TagChoice[] {
    return this.control().value ?? [];
  }

  list(): TagChoice[] {
    return this.chosen();
  }

  private isChosen(option: { id?: string; name: string }): boolean {
    return this.chosen().some(
      (item) =>
        (option.id && item.id === option.id) ||
        item.name.toLowerCase() === option.name.toLowerCase(),
    );
  }

  readonly clean = computed(() => this.term().trim());

  matches(): TagOption[] {
    const term = this.clean().toLowerCase();
    return this.options().filter(
      (option) =>
        !this.isChosen(option) && option.name.toLowerCase().includes(term),
    );
  }

  /** The written word can be added when no tag has exactly that name. */
  canCreate(): boolean {
    const name = this.clean().toLowerCase();
    return (
      !!name &&
      !this.options().some((option) => option.name.toLowerCase() === name) &&
      !this.chosen().some((item) => item.name.toLowerCase() === name)
    );
  }

  add(choice: TagChoice): void {
    if (this.chosen().length >= this.max() || this.isChosen(choice)) return;
    const control = this.control();
    control.setValue([...this.chosen(), choice]);
    control.markAsDirty();
    this.term.set('');
  }

  addWritten(): void {
    const name = this.clean();
    if (!name) return;
    const known = this.options().find(
      (option) => option.name.toLowerCase() === name.toLowerCase(),
    );
    this.add(
      known
        ? { id: known.id, name: known.name }
        : { name: name.slice(0, this.maxLength()) },
    );
  }

  remove(choice: TagChoice): void {
    const control = this.control();
    control.setValue(this.chosen().filter((item) => item !== choice));
    control.markAsDirty();
  }

  onEnter(event: Event): void {
    event.preventDefault();
    this.addWritten();
  }

  onBackspace(): void {
    const items = this.chosen();
    if (!this.term() && items.length) this.remove(items[items.length - 1]);
  }

  // After the click on an option has landed.
  close(): void {
    setTimeout(() => this.open.set(false), 150);
  }
}
