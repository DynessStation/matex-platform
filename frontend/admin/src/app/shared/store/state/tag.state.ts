import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { ITag } from '../../interface/tag.interface';
import { NotificationService } from '../../services/notification.service';
import { TagService } from '../../services/tag.service';
import {
  GetTagsAction,
  CreateTagAction,
  EditTagAction,
  UpdateTagAction,
  UpdateTagStatusAction,
  DeleteTagAction,
  DeleteAllTagAction,
  ExportTagAction,
  ImportTagAction,
} from '../action/tag.action';

export class TagStateModel {
  tag = {
    data: [] as ITag[],
    total: 0,
  };
  selectedTag: ITag | null;
}

@State<TagStateModel>({
  name: 'tag',
  defaults: {
    tag: {
      data: [],
      total: 0,
    },
    selectedTag: null,
  },
})
@Injectable()
export class TagState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private tagService = inject(TagService);

  @Selector()
  static tag(state: TagStateModel) {
    return state.tag;
  }

  @Selector()
  static selectedTag(state: TagStateModel) {
    return state.selectedTag;
  }

  @Action(GetTagsAction)
  getTags(ctx: StateContext<TagStateModel>, action: GetTagsAction) {
    return this.tagService.getTags(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            tag: {
              data: result.data,
              total: result?.total ? result?.total : result.data?.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateTagAction)
  create(_ctx: StateContext<TagStateModel>, _action: CreateTagAction) {
    // Create Tag Logic Here
  }

  @Action(EditTagAction)
  edit(ctx: StateContext<TagStateModel>, { id }: EditTagAction) {
    return this.tagService.getTags().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(tag => tag.id == id);
          ctx.patchState({
            ...state,
            selectedTag: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateTagAction)
  update(_ctx: StateContext<TagStateModel>, { payload: _payload, id: _id }: UpdateTagAction) {
    // Update Tag Logic Here
  }

  @Action(UpdateTagStatusAction)
  updateStatus(
    _ctx: StateContext<TagStateModel>,
    { id: _id, status: _status }: UpdateTagStatusAction,
  ) {
    // Update Tag Status Logic Here
  }

  @Action(DeleteTagAction)
  delete(_ctx: StateContext<TagStateModel>, { id: _id }: DeleteTagAction) {
    // Delete Tag Logic Here
  }

  @Action(DeleteAllTagAction)
  deleteAll(_ctx: StateContext<TagStateModel>, { ids: _ids }: DeleteAllTagAction) {
    // Delete All Tag Logic Here
  }

  @Action(ImportTagAction)
  import(_ctx: StateContext<TagStateModel>, _action: ImportTagAction) {
    // Import Tag Logic Here
  }

  @Action(ExportTagAction)
  export(_ctx: StateContext<TagStateModel>, _action: ExportTagAction) {
    // Export Tag Logic Here
  }
}
