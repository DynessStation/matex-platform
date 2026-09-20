import { AsyncPipe, DatePipe } from '@angular/common';

import { Component, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { EMPTY, Observable, catchError, switchMap } from 'rxjs';

import { PageWrapper } from '../../../shared/components/page-wrapper/page-wrapper';

import { IAuditLogDetail } from '../../../shared/interface/audit-log.interface';

import {
  ClearAuditLogDetailAction,
  GetAuditLogDetailAction,
} from '../../../shared/store/action/audit-log.action';

import { AuditLogState } from '../../../shared/store/state/audit-log.state';

import { DetailErrorState } from '../../../shared/components/ui/detail-error-state/detail-error-state';

import { LocalizationService } from '../../../shared/services/localization.service';

import { resolveDetailErrorStatus } from '../../../shared/utils/detail-error.util';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-activity-log-detail',

  imports: [
    AsyncPipe,
    DatePipe,
    RouterModule,
    TranslateModule,
    PageWrapper,
    DetailErrorState,
  ],

  templateUrl: './activity-log-detail.html',

  styleUrl: './activity-log-detail.scss',
})
export class ActivityLogDetail {
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

  auditLog$: Observable<IAuditLogDetail | null> = this.store.select(
    AuditLogState.selectedAuditLog,
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

  private loadDetail(id: string): Observable<unknown> {
    const cleanId = id.trim();

    if (!cleanId) {
      this.detailErrorStatus = 404;

      return EMPTY;
    }

    this.detailErrorStatus = null;

    return this.store.dispatch(new GetAuditLogDetailAction(cleanId)).pipe(
      catchError((error) => {
        this.detailErrorStatus = resolveDetailErrorStatus(error, [
          'AUDIT_LOG_INVALID_ID',
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
  //==== JSON FORMAT
  //==================================================

  formatJson(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy(): void {
    this.store.dispatch(new ClearAuditLogDetailAction());
  }
}
