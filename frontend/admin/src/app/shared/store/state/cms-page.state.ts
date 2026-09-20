import { Injectable, inject } from '@angular/core';

import { Action, Selector, State, StateContext } from '@ngxs/store';

import { tap } from 'rxjs';

import {
  ICmsPageDetail,
  ICmsPageModel,
  ICmsPageTrashModel,
} from '../../interface/cms-page.interface';

import { ApiMessageService } from '../../services/api-message.service';

import { CmsPageService } from '../../services/cms-page.service';

import { NotificationService } from '../../services/notification.service';

import {
  CreateCmsPageAction,
  DeleteCmsPageAction,
  GetCmsPageDetailAction,
  GetCmsPageTrashAction,
  GetCmsPagesAction,
  RestoreCmsPageAction,
  UpdateCmsPageAction,
  UpdateCmsPagePublicationAction,
} from '../action/cms-page.action';

//==================================================
//==== STATE MODEL
//==================================================

export interface CmsPageStateModel {
  cmsPages: ICmsPageModel | null;

  trash: ICmsPageTrashModel | null;

  selectedCmsPage: ICmsPageDetail | null;
}

//==================================================
//==== STATE
//==================================================

@State<CmsPageStateModel>({
  name: 'cmsPage',

  defaults: {
    cmsPages: null,

    trash: null,

    selectedCmsPage: null,
  },
})
@Injectable()
export class CmsPageState {
  private cmsPageService = inject(CmsPageService);

  private apiMessageService = inject(ApiMessageService);

  private notificationService = inject(NotificationService);

  //==================================================
  //==== SELECTORS
  //==================================================

  @Selector()
  static cmsPages(state: CmsPageStateModel) {
    return state.cmsPages;
  }

  @Selector()
  static trash(state: CmsPageStateModel) {
    return state.trash;
  }

  @Selector()
  static selectedCmsPage(state: CmsPageStateModel) {
    return state.selectedCmsPage;
  }

  //==================================================
  //==== LIST
  //==================================================

  @Action(GetCmsPagesAction)
  getCmsPages(ctx: StateContext<CmsPageStateModel>, action: GetCmsPagesAction) {
    return this.cmsPageService.getCmsPages(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          cmsPages: result,
        });
      }),
    );
  }

  //==================================================
  //==== TRASH
  //==================================================

  @Action(GetCmsPageTrashAction)
  getTrash(
    ctx: StateContext<CmsPageStateModel>,
    action: GetCmsPageTrashAction,
  ) {
    return this.cmsPageService.getTrash(action.payload).pipe(
      tap((result) => {
        ctx.patchState({
          trash: result,
        });
      }),
    );
  }

  //==================================================
  //==== DETAIL
  //==================================================

  @Action(GetCmsPageDetailAction)
  getCmsPageDetail(
    ctx: StateContext<CmsPageStateModel>,
    action: GetCmsPageDetailAction,
  ) {
    //==================================================
    //==== CLEAR PREVIOUS DETAIL
    //==================================================

    ctx.patchState({
      selectedCmsPage: null,
    });

    //==================================================
    //==== GET DETAIL
    //==================================================

    return this.cmsPageService.getCmsPageDetail(action.id).pipe(
      tap((result) => {
        ctx.patchState({
          selectedCmsPage: result.data,
        });
      }),
    );
  }

  //==================================================
  //==== CREATE
  //==================================================

  @Action(CreateCmsPageAction)
  createCmsPage(
    _ctx: StateContext<CmsPageStateModel>,
    action: CreateCmsPageAction,
  ) {
    return this.cmsPageService.createCmsPage(action.payload).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== UPDATE
  //==================================================

  @Action(UpdateCmsPageAction)
  updateCmsPage(
    _ctx: StateContext<CmsPageStateModel>,
    action: UpdateCmsPageAction,
  ) {
    return this.cmsPageService.updateCmsPage(action.id, action.payload).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== PUBLICATION
  //==================================================

  @Action(UpdateCmsPagePublicationAction)
  updatePublication(
    _ctx: StateContext<CmsPageStateModel>,
    action: UpdateCmsPagePublicationAction,
  ) {
    return this.cmsPageService
      .updatePublication(action.id, action.payload)
      .pipe(
        tap((result) => {
          this.notificationService.showSuccess(
            this.apiMessageService.resolveResponse(result),
          );
        }),
      );
  }

  //==================================================
  //==== DELETE
  //==================================================

  @Action(DeleteCmsPageAction)
  deleteCmsPage(
    _ctx: StateContext<CmsPageStateModel>,
    action: DeleteCmsPageAction,
  ) {
    return this.cmsPageService.deleteCmsPage(action.id).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }

  //==================================================
  //==== RESTORE
  //==================================================

  @Action(RestoreCmsPageAction)
  restoreCmsPage(
    _ctx: StateContext<CmsPageStateModel>,
    action: RestoreCmsPageAction,
  ) {
    return this.cmsPageService.restoreCmsPage(action.id).pipe(
      tap((result) => {
        this.notificationService.showSuccess(
          this.apiMessageService.resolveResponse(result),
        );
      }),
    );
  }
}
