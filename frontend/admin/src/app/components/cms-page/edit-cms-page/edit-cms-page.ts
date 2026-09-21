import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import { ICmsPageDetail } from '../../../shared/interface/cms-page.interface';

import {
  ClearCmsPageDetailAction,
  GetCmsPageDetailAction,
} from '../../../shared/store/action/cms-page.action';

import { CmsPageState } from '../../../shared/store/state/cms-page.state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

import { FormCmsPage } from '../form-cms-page/form-cms-page';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-edit-cms-page',

  imports: [
    AsyncPipe,
    RouterModule,
    TranslateModule,
    PageWrapper,
    DetailErrorState,
    FormCmsPage,
  ],

  templateUrl: './edit-cms-page.html',
})
export class EditCmsPage {
  //==================================================
  //==== INJECT
  //==================================================

  private store = inject(Store);

  private route = inject(ActivatedRoute);

  private destroyRef = inject(DestroyRef);

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
  //==== DESTROY
  //==================================================

  ngOnDestroy(): void {
    this.store.dispatch(new ClearCmsPageDetailAction());
  }
}
