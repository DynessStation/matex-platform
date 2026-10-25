import {
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { filter, map, startWith, switchMap } from 'rxjs';

import { HelpService } from '../../../../services/help.service';
import { HELP_GUIDES, HelpGuide } from '../help.util';

type GuideState =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; guide: HelpGuide };

// The help drawer (U-5): the page guide on the right, with a list of sections that
// jump to the clicked one. Placed once in the layout; HelpService opens it. It does
// not block the page, so the guide can stay open while working.
@Component({
  selector: 'app-help-drawer',
  imports: [TranslateModule],
  templateUrl: './help-drawer.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(window:resize)': 'placeBelowHeader()',
  },
})
export class HelpDrawer {
  readonly help = inject(HelpService);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly router = inject(Router);

  readonly guides = HELP_GUIDES;

  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly state = signal<GuideState>({ status: 'loading' });

  readonly guide = computed(() => {
    const state = this.state();

    return state.status === 'ready' ? state.guide : null;
  });

  // Distance from the top of the window: just below the header, whose height
  // changes with the screen width.
  readonly top = signal(0);

  // Section highlighted after a jump.
  readonly target = signal<string | null>(null);

  private targetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    toObservable(this.help.drawerKey)
      .pipe(
        switchMap((key) =>
          this.help.guide(key).pipe(
            map((guide): GuideState =>
              guide ? { status: 'ready', guide } : { status: 'failed' },
            ),
            startWith<GuideState>({ status: 'loading' }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));

    // Another page: show its guide while the drawer stays open.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.help.drawerOpen()) {
          this.help.drawerKey.set(this.help.currentKey());

          this.help.drawerAnchor.set(null);
        }
      });

    // Wide screens make room for the drawer instead of covering the page.
    effect(() => {
      this.document.body.classList.toggle(
        'help-drawer-open',
        this.help.drawerOpen(),
      );
    });

    effect(() => {
      if (this.help.drawerOpen()) {
        this.placeBelowHeader();

        setTimeout(() => this.panel()?.nativeElement.focus());
      }
    });

    // Jump to the requested section once its guide is on screen; a newly shown
    // guide without one starts at the top.
    let shownGuide: HelpGuide | null = null;

    effect(() => {
      const anchor = this.help.drawerAnchor();

      const guide = this.guide();

      if (!this.help.drawerOpen() || !guide) {
        shownGuide = null;

        return;
      }

      const fresh = guide !== shownGuide;

      shownGuide = guide;

      if (!anchor && !fresh) {
        return;
      }

      setTimeout(() => {
        if (anchor && guide.sections.some((section) => section.id === anchor)) {
          this.jump(anchor);
        } else if (fresh) {
          this.body()?.nativeElement.scrollTo({ top: 0 });
        }

        if (anchor) {
          this.help.drawerAnchor.set(null);
        }
      });
    });
  }

  //==================================================
  //==== ACTIONS
  //==================================================

  onJump(event: Event, id: string): void {
    event.preventDefault();

    this.jump(id);
  }

  jump(id: string): void {
    const section = this.body()?.nativeElement.querySelector<HTMLElement>(
      `#help-${id}`,
    );

    if (!section) {
      return;
    }

    section.scrollIntoView({ block: 'start', behavior: 'smooth' });

    this.target.set(id);

    if (this.targetTimer) {
      clearTimeout(this.targetTimer);
    }

    this.targetTimer = setTimeout(() => this.target.set(null), 1600);
  }

  switchGuide(event: Event): void {
    this.help.drawerAnchor.set(null);

    this.help.drawerKey.set((event.target as HTMLSelectElement).value);
  }

  placeBelowHeader(): void {
    const header = this.document.querySelector('.page-header');

    this.top.set(Math.round(header?.getBoundingClientRect().bottom ?? 0));
  }

  onEscape(): void {
    if (this.help.drawerOpen()) {
      this.help.close();
    }
  }
}
