import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { HelpService } from '../../../../services/help.service';
import { HelpGuide, helpTipFor } from '../help.util';

// The "?" help tip (U-4): a short note from the page guide, shown while hovered or
// kept open by a click until a click outside; "Selengkapnya" opens the help drawer at
// the same section.
@Component({
  selector: 'app-help-tip',
  imports: [NgbPopover, TranslateModule],
  templateUrl: './help-tip.html',
  host: {
    // The anchor and guide, readable from the page (the help spec checks them).
    '[attr.data-anchor]': 'section() || null',
    '[attr.data-guide]': 'page() || null',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'popover()?.close()',
  },
})
export class HelpTip {
  private readonly help = inject(HelpService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly popover = viewChild(NgbPopover);

  /** Guide key (assets/help/<page>.md); the current page's guide when empty. */
  readonly page = input<string>('');

  /** Section anchor in the guide; the page summary is shown when empty. */
  readonly section = input<string>('');

  /** i18n key of a note to show instead of the guide text. */
  readonly text = input<string>('');

  readonly note = signal('');

  readonly loading = signal(false);

  // Opened by a click: stays until a click outside, Escape, or another click.
  private pinned = false;

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  private loaded = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelClose());
  }

  //==================================================
  //==== OPEN AND CLOSE
  //==================================================

  hoverOpen(popover: NgbPopover): void {
    this.cancelClose();

    if (!popover.isOpen()) {
      this.pinned = false;

      this.show(popover);
    }
  }

  hoverLeave(popover: NgbPopover): void {
    if (this.pinned) {
      return;
    }

    this.cancelClose();

    // A short delay lets the cursor cross the gap into the note.
    this.closeTimer = setTimeout(() => popover.close(), 200);
  }

  cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);

      this.closeTimer = null;
    }
  }

  toggle(popover: NgbPopover): void {
    this.cancelClose();

    if (popover.isOpen() && this.pinned) {
      popover.close();

      return;
    }

    this.pinned = true;

    this.show(popover);
  }

  // A click outside the button and the note closes it (ngbPopover's own autoClose
  // also closes on a click on the button, which must pin instead).
  onDocumentClick(event: MouseEvent): void {
    const popover = this.popover();

    const target = event.target as HTMLElement | null;

    if (
      !popover?.isOpen() ||
      this.host.nativeElement.contains(target) ||
      target?.closest('.help-tip-popover')
    ) {
      return;
    }

    popover.close();
  }

  onHidden(): void {
    this.pinned = false;
  }

  openDrawer(popover: NgbPopover): void {
    popover.close();

    this.help.open(this.guideKey(), this.section() || null);
  }

  private show(popover: NgbPopover): void {
    this.load();

    if (!popover.isOpen()) {
      popover.open();
    }
  }

  //==================================================
  //==== NOTE TEXT
  //==================================================

  private guideKey(): string {
    return this.page() || this.help.currentKey();
  }

  private load(): void {
    if (this.loaded || this.text()) {
      return;
    }

    this.loaded = true;

    this.loading.set(true);

    this.help
      .guide(this.guideKey())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((guide) => {
        this.loading.set(false);

        this.note.set(guide ? this.noteFrom(guide) : '');

        if (!guide) {
          this.loaded = false;
        }
      });
  }

  private noteFrom(guide: HelpGuide): string {
    return (this.section() && helpTipFor(guide, this.section())) || guide.tip;
  }
}
