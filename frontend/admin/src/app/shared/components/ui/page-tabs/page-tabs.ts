import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

export interface PageTab {
  key: string;
  labelKey: string;
  /** Not built yet: shows a SOON mark. */
  soon?: boolean;
  /** Something on this tab needs a look: shows a dot. */
  alert?: boolean;
  /** i18n key that says what the dot means. */
  alertKey?: string;
}

/** The tab named by ?tab=, or the first one. */
export function activeTabKey(tabs: PageTab[], value: string | null): string {
  return tabs.find((tab) => tab.key === value)?.key ?? tabs[0]?.key ?? '';
}

// Tabs at the top of a page, kept in the URL (?tab=) so a tab can be shared and survives a reload.
@Component({
  selector: 'app-page-tabs',
  imports: [TranslateModule],
  template: `
    <div class="page-tabs" role="tablist" data-testid="page-tabs">
      @for (tab of tabs(); track tab.key) {
        <button
          type="button"
          role="tab"
          [class.active]="active() === tab.key"
          [attr.aria-selected]="active() === tab.key"
          [attr.data-tab]="tab.key"
          (click)="select(tab.key)"
        >
          {{ tab.labelKey | translate }}
          @if (tab.soon) {
            <span class="page-tabs-soon">SOON</span>
          } @else if (tab.alert) {
            <span
              class="page-tabs-alert"
              role="img"
              data-testid="page-tab-alert"
              [attr.aria-label]="tab.alertKey ?? '' | translate"
              [title]="tab.alertKey ?? '' | translate"
            ></span>
          }
        </button>
      }
    </div>
  `,
})
export class PageTabs {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs = input.required<PageTab[]>();

  private readonly query = toSignal(this.route.queryParamMap, {
    requireSync: true,
  });
  readonly active = computed(() =>
    activeTabKey(this.tabs(), this.query().get('tab')),
  );

  select(key: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: key === this.tabs()[0]?.key ? null : key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
