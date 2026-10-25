import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Params, Router } from '@angular/router';

import { filter } from 'rxjs';

// Remembers the last query of each admin list so the form back button (U-7) returns
// to the list as it was left: the last list URL (lists that keep their query in the
// URL, such as Produk and Log Aktivitas) and the last table query (all other lists,
// restored by the table when the navigation carries RESTORE_LIST_QUERY).
export const RESTORE_LIST_QUERY = 'restoreListQuery';

@Injectable({ providedIn: 'root' })
export class ListReturnService {
  private readonly router = inject(Router);

  private readonly urls = new Map<string, string>();

  private readonly queries = new Map<string, Params>();

  // List path the last navigation returned to with the back button, until its
  // table has used it (the table starts after the navigation has ended).
  private returnedTo: string | null = null;

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;

        const path = listPath(url);

        const state = this.router.lastSuccessfulNavigation()?.extras.state;

        this.returnedTo = state?.[RESTORE_LIST_QUERY] === true ? path : null;

        this.recordListUrl(url);
      });

    // Created by the first list or form on the page, possibly after its navigation.
    this.recordListUrl(this.router.url);
  }

  // A list is a one-segment route ("/product"); forms sit below it.
  private recordListUrl(url: string): void {
    const path = listPath(url);

    if (path.split('/').length === 2 && path !== '/') {
      this.urls.set(path, url);
    }
  }

  /** Called by the list table each time it asks for data. */
  rememberQuery(query: Params): void {
    this.queries.set(listPath(this.router.url), { ...query });
  }

  /** The query to restore when this list was opened with the back button; once. */
  takeReturnQuery(): Params | null {
    const path = listPath(this.router.url);

    if (this.returnedTo !== path) {
      return null;
    }

    this.returnedTo = null;

    return this.queries.get(path) ?? null;
  }

  /** The URL the back button opens for a list path. */
  returnUrl(path: string): string {
    return this.urls.get(path) ?? path;
  }

  back(path: string): void {
    void this.router.navigateByUrl(this.returnUrl(path), {
      state: { [RESTORE_LIST_QUERY]: true },
    });
  }
}

function listPath(url: string): string {
  return url.split(/[?#]/)[0];
}
