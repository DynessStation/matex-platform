import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import {
  IAuditLogDetail,
  IAuditLogModel,
} from '../../interface/audit-log.interface';

import { AuditLogService } from '../../services/audit-log.service';
import {
  ClearAuditLogDetailAction,
  GetAuditLogDetailAction,
  GetAuditLogsAction,
} from '../action/audit-log.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface AuditLogStateModel {
  auditLogs: IAuditLogModel | null;

  selectedAuditLog: IAuditLogDetail | null;
}

//==================================================
//==== STATE
//==================================================

@State<AuditLogStateModel>({
  name: 'auditLog',

  defaults: {
    auditLogs: null,

    selectedAuditLog: null,
  },
})
@Injectable()
export class AuditLogState {
  private auditLogService = inject(AuditLogService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static auditLogs(state: AuditLogStateModel) {
    return state.auditLogs;
  }

  @Selector()
  static selectedAuditLog(state: AuditLogStateModel) {
    return state.selectedAuditLog;
  }

  //==================================================
  //==== GET LIST
  //==================================================

  @Action(GetAuditLogsAction)
  getAuditLogs(
    ctx: StateContext<AuditLogStateModel>,

    action: GetAuditLogsAction,
  ) {
    return this.auditLogService.getAuditLogs(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          auditLogs: result,
        });
      }),
    );
  }

  //==================================================
  //==== GET DETAIL
  //==================================================

  @Action(GetAuditLogDetailAction)
  getAuditLogDetail(
    ctx: StateContext<AuditLogStateModel>,

    action: GetAuditLogDetailAction,
  ) {
    ctx.patchState({
      selectedAuditLog: null,
    });

    return this.auditLogService.getAuditLogDetail(action.id).pipe(
      tap((result) => {
        ctx.patchState({
          selectedAuditLog: result.data,
        });
      }),
    );
  }

  //==================================================
  //==== CLEAR DETAIL
  //==================================================

  @Action(ClearAuditLogDetailAction)
  clearAuditLogDetail(ctx: StateContext<AuditLogStateModel>) {
    ctx.patchState({
      selectedAuditLog: null,
    });
  }
}
