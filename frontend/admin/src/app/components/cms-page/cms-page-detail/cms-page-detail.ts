import { AsyncPipe, DatePipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import {
  ICmsPageDetail,
  ICmsPageTranslation,
} from '../../../shared/interface/cms-page.interface';

import { LocalizationService } from '../../../shared/services/localization.service';

import {
  ClearCmsPageDetailAction,
  GetCmsPageDetailAction,
} from '../../../shared/store/action/cms-page.action';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-cms-page-detail',

  imports: [
    AsyncPipe,
    DatePipe,
    RouterModule,
    TranslateModule,
    PageWrapper,
    DetailErrorState,
  ],

  templateUrl: './cms-page-detail.html',
})
export class CmsPageDetail {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private route = inject(ActivatedRoute);

  private destroyRef = inject(DestroyRef);

  public readonly localization = inject(LocalizationService);

  //==================================================
  //==== STATE
  //==================================================

  public id = '';

  public detailErrorStatus: number | null = null;

  public cmsPage$: Observable<ICmsPageDetail | null> = this.store.select(
    CmsPageState.selectedCmsPage,
  );

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.id = params.get('id')?.trim() ?? '';

          this.detailErrorStatus = null;

          return this.loadDetail(this.id);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  //==================================================
  //==== LOAD DETAIL
  //==================================================

  private loadDetail(id: string): Observable<unknown> {
    const cleanId = id.trim();

    if (!cleanId) {
      this.detailErrorStatus = 404;

      return EMPTY;
    }

    this.detailErrorStatus = null;

    return this.store.dispatch(new GetCmsPageDetailAction(cleanId)).pipe(
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error, [
          'CMS_PAGE_INVALID_ID',
        ]);

        return EMPTY;
      }),
    );
  }

  //==================================================
  //==== RETRY
  //==================================================

  retryDetail(): void {
    if (!this.id) {
      return;
    }

    this.loadDetail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  //==================================================
  //==== DISPLAY TRANSLATION
  //==================================================

  displayTranslation(page: ICmsPageDetail): ICmsPageTranslation | null {
    if (!page.translations.length) {
      return null;
    }

    const currentLocale = this.localization.locale();

    return (
      page.translations.find(
        (item) => item.cms_page_locale === currentLocale,
      ) ??
      page.translations.find(
        (item) => item.cms_page_locale === page.cms_page_default_locale,
      ) ??
      page.translations[0]
    );
  }

  //==================================================
  //==== VISIBILITY
  //==================================================

  visibilityKey(value: number): string {
    if (value === 0) {
      return 'private';
    }

    if (value === 2) {
      return 'unlisted';
    }

    return 'public';
  }

  //==================================================
  //==== HUMANIZE
  //==================================================

  humanize(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy(): void {
    this.store.dispatch(new ClearCmsPageDetailAction());
  }
}
