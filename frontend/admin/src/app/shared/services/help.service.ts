import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import { SKIP_GLOBAL_LOADER } from '../../core/interceptors/loader-context';
import {
  HelpGuide,
  helpKeyForUrl,
  parseHelpGuide,
} from '../components/ui/help/help.util';

// Admin help guides (assets/help/*.md) and the state of the help drawer.
// Tips (U-4) read guides here; the drawer (U-5) is placed once in the layout.
@Injectable({ providedIn: 'root' })
export class HelpService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly guides = new Map<string, Observable<HelpGuide | null>>();

  //==================================================
  //==== DRAWER STATE
  //==================================================

  readonly drawerOpen = signal(false);

  readonly drawerKey = signal('umum');

  // Section to jump to once the guide is shown; cleared by the drawer.
  readonly drawerAnchor = signal<string | null>(null);

  /** Opens the drawer on a guide (the current page's when omitted), at a section. */
  open(key?: string, anchor?: string | null): void {
    this.drawerKey.set(key ?? this.currentKey());

    this.drawerAnchor.set(anchor ?? null);

    this.drawerOpen.set(true);
  }

  close(): void {
    this.drawerOpen.set(false);
  }

  currentKey(): string {
    return helpKeyForUrl(this.router.url);
  }

  //==================================================
  //==== GUIDES
  //==================================================

  /** The parsed guide, loaded once per session; null when the file cannot be read. */
  guide(key: string): Observable<HelpGuide | null> {
    let guide = this.guides.get(key);

    if (!guide) {
      guide = this.http
        .get(`assets/help/${key}.md`, {
          responseType: 'text',
          context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
        })
        .pipe(
          map((markdown) => parseHelpGuide(markdown)),
          catchError(() => {
            this.guides.delete(key);

            return of(null);
          }),
          shareReplay(1),
        );

      this.guides.set(key, guide);
    }

    return guide;
  }
}
