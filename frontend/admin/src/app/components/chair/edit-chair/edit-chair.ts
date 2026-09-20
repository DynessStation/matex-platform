import { AsyncPipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap, tap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import {
  IChairDetail,
  IChairPayload,
} from '../../../shared/interface/chair.interface';

import {
  GetChairDetailAction,
  UpdateChairAction,
} from '../../../shared/store/action/chair.action';

import { ChairState } from '../../../shared/store/state/chair.state';

import { ChairFormValue, FormChair } from '../form-chair/form-chair';

import { TranslateModule } from '@ngx-translate/core';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-edit-chair',

  imports: [
    AsyncPipe,
    PageWrapper,
    FormChair,
    TranslateModule,
    DetailErrorState,
  ],

  templateUrl: './edit-chair.html',

  styleUrl: './edit-chair.scss',
})
export class EditChair {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== DATA
  //==================================================

  public id = '';

  public detailErrorStatus: number | null = null;

  chair$: Observable<IChairDetail | null> = this.store.select(
    ChairState.selectedChair,
  );

  //==================================================
  //==== INIT
  //==================================================

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

  private loadDetail(id: string): Observable<unknown> {
    const cleanId = id.trim();

    if (!cleanId) {
      this.detailErrorStatus = 404;

      return EMPTY;
    }

    this.detailErrorStatus = null;

    return this.store.dispatch(new GetChairDetailAction(cleanId)).pipe(
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error, [
          'CHAIR_INVALID_ID',
        ]);

        return EMPTY;
      }),
    );
  }

  retryDetail(): void {
    if (!this.id) {
      return;
    }

    this.loadDetail(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(value: ChairFormValue): void {
    if (!this.id) {
      return;
    }

    const payload: IChairPayload = {
      chair_name: value.chair_name,

      chair_description: value.chair_description || null,
    };

    this.store
      .dispatch(
        new UpdateChairAction(
          this.id,

          payload,
        ),
      )
      .subscribe({
        complete: () => {
          void this.router.navigateByUrl('/chair');
        },
      });
  }
}
