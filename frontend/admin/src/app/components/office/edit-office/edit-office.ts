import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap, tap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import {
  IOfficeDetail,
  IOfficePayload,
} from '../../../shared/interface/office.interface';

import {
  GetOfficeDetailAction,
  UpdateOfficeAction,
} from '../../../shared/store/action/office.action';

import { OfficeState } from '../../../shared/store/state/office.state';

import { FormOffice } from '../form-office/form-office';
import { TranslateModule } from '@ngx-translate/core';

import { HttpErrorResponse } from '@angular/common/http';
import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

@Component({
  selector: 'app-edit-office',

  imports: [
    AsyncPipe,
    PageWrapper,
    FormOffice,
    TranslateModule,
    DetailErrorState,
  ],

  templateUrl: './edit-office.html',

  styleUrl: './edit-office.scss',
})
export class EditOffice {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  public id = '';

  //==================================================
  //==== DETAIL ERROR STATE
  //==================================================

  public detailErrorStatus: number | null = null;

  office$: Observable<IOfficeDetail | null> = this.store.select(
    OfficeState.selectedOffice,
  );

  constructor() {
    this.route.params
      .pipe(
        tap((params) => {
          this.id = String(params['id'] ?? '').trim();

          this.detailErrorStatus = null;
        }),

        switchMap(() => this.loadDetail(this.id)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  submit(payload: IOfficePayload): void {
    if (!this.id) {
      return;
    }

    this.store.dispatch(new UpdateOfficeAction(this.id, payload)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/office');
      },
    });
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

    return this.store.dispatch(new GetOfficeDetailAction(cleanId)).pipe(
      catchError((error: HttpErrorResponse) => {
        const code =
          typeof error.error?.code === 'string' ? error.error.code : '';

        this.detailErrorStatus =
          error.status === 404 || code === 'OFFICE_INVALID_ID'
            ? 404
            : error.status || 0;

        return EMPTY;
      }),
    );
  }

  //==================================================
  //==== RETRY DETAIL
  //==================================================

  retryDetail(): void {
    if (!this.id) {
      return;
    }

    this.loadDetail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
