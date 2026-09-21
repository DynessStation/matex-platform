import { AsyncPipe, DatePipe } from '@angular/common';

import { Component, DestroyRef, inject, viewChild } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, finalize, switchMap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import {
  ICmsPageDetail,
  ICmsPageTranslation,
} from '../../../shared/interface/cms-page.interface';

import { LocalizationService } from '../../../shared/services/localization.service';

import {
  ClearCmsPageDetailAction,
  DeleteCmsPageAction,
  GetCmsPageDetailAction,
} from '../../../shared/store/action/cms-page.action';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

import { CmsPagePreview } from '../cms-page-preview/cms-page-preview';

import { ConfirmationModal } from '../../../shared/components/ui/modal/confirmation-modal/confirmation-modal';

import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';

import { ITableClickedAction } from '../../../shared/interface/table.interface';

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
    CmsPagePreview,
    HasPermissionDirective,
    ConfirmationModal,
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

  private router = inject(Router);

  //==================================================
  //==== STATE
  //==================================================

  public id = '';

  public detailErrorStatus: number | null = null;

  public cmsPage$: Observable<ICmsPageDetail | null> = this.store.select(
    CmsPageState.selectedCmsPage,
  );

  readonly confirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  public deleting = false;

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
  //==== MOVE TO TRASH
  //==================================================

  moveToTrash(page: ICmsPageDetail): void {
    if (page.cms_page_is_system === 1 || this.deleting) {
      return;
    }

    const title =
      this.displayTranslation(page)?.cms_page_title?.trim() ||
      page.cms_page_key;

    this.confirmationModal()?.openModal('trash', {
      id_cms_page: page.id_cms_page,
      name: title,
    });
  }

  //==================================================
  //==== CONFIRMED
  //==================================================

  onConfirmed(action: ITableClickedAction): void {
    if (action.actionToPerform !== 'trash' || this.deleting) {
      return;
    }

    const id = String(action.data?.id_cms_page ?? '').trim();

    if (!id) {
      return;
    }

    this.deleting = true;

    this.store
      .dispatch(new DeleteCmsPageAction(id))
      .pipe(
        finalize(() => {
          this.deleting = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        complete: () => {
          this.confirmationModal()?.closeModal();

          void this.router.navigate(['/cms-page']);
        },
      });
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy(): void {
    this.store.dispatch(new ClearCmsPageDetailAction());
  }
}
