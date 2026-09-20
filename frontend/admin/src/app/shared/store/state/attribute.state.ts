import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IAttribute, IAttributeValue } from '../../interface/attribute.interface';
import { AttributeService } from '../../services/attribute.service';
import { NotificationService } from '../../services/notification.service';
import {
  GetAttributesAction,
  GetAttributeValuesAction,
  CreateAttributeAction,
  EditAttributeAction,
  UpdateAttributeAction,
  UpdateAttributeStatusAction,
  DeleteAttributeAction,
  DeleteAllAttributeAction,
  ExportAttributeAction,
  ImportAttributeAction,
} from '../action/attribute.action';
import { ImportTagAction } from '../action/tag.action';

export class AttributeStateModel {
  attribute = {
    data: [] as IAttribute[],
    total: 0,
  };
  attribute_values: IAttributeValue[];
  selectedAttribute: IAttribute | null;
}

@State<AttributeStateModel>({
  name: 'attribute',
  defaults: {
    attribute: {
      data: [],
      total: 0,
    },
    attribute_values: [],
    selectedAttribute: null,
  },
})
@Injectable()
export class AttributeState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private attributeService = inject(AttributeService);

  @Selector()
  static attribute(state: AttributeStateModel) {
    return state.attribute;
  }

  @Selector()
  static attributes(state: AttributeStateModel) {
    return (ids: string) => {
      let attrIds = Array.from(new Set(ids.split(','))).map(Number);
      let filter = attrIds.length
        ? state.attribute.data.filter(attr => !attrIds.includes(Number(attr.id!)))
        : state.attribute.data;
      return filter.map((attribute: IAttribute) => {
        return {
          label: attribute?.name,
          value: attribute?.id,
          attribute_values: attribute?.attribute_values,
        };
      });
    };
  }

  @Selector()
  static attribute_value(state: AttributeStateModel) {
    return (id: number | null) => {
      if (!id) return [];
      return state?.attribute_values
        .filter(attr_val => +attr_val.attribute_id === id)
        ?.map((value: IAttributeValue) => {
          return { label: value?.value, value: value?.id };
        });
    };
  }

  @Selector()
  static selectedAttribute(state: AttributeStateModel) {
    return state.selectedAttribute;
  }

  @Action(GetAttributesAction)
  getAttributes(ctx: StateContext<AttributeStateModel>, action: GetAttributesAction) {
    return this.attributeService.getAttributes(action.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            attribute: {
              data: result.data,
              total: result?.total ? result?.total : result.data.length,
            },
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(GetAttributeValuesAction)
  getAttributeValues(ctx: StateContext<AttributeStateModel>, action: GetAttributeValuesAction) {
    return this.attributeService.getAttributeValues(action.payload).pipe(
      tap({
        next: result => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            attribute_values: result.data,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateAttributeAction)
  create(_ctx: StateContext<AttributeStateModel>, _action: CreateAttributeAction) {
    // Create Attribute Logic Here
  }

  @Action(EditAttributeAction)
  edit(ctx: StateContext<AttributeStateModel>, { id }: EditAttributeAction) {
    return this.attributeService.getAttributes().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(attribute => attribute.id == id);
          ctx.patchState({
            ...state,
            selectedAttribute: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateAttributeAction)
  update(
    _ctx: StateContext<AttributeStateModel>,
    { payload: _payload, id: _id }: UpdateAttributeAction,
  ) {
    // Update Attribute Logic Here
  }

  @Action(UpdateAttributeStatusAction)
  updateStatus(
    _ctx: StateContext<AttributeStateModel>,
    { id: _id, status: _status }: UpdateAttributeStatusAction,
  ) {
    // Update Attribute Status Logic Here
  }

  @Action(DeleteAttributeAction)
  delete(_ctx: StateContext<AttributeStateModel>, { id: _id }: DeleteAttributeAction) {
    // Delete Attribute Logic Here
  }

  @Action(DeleteAllAttributeAction)
  deleteAll(_ctx: StateContext<AttributeStateModel>, { ids: _ids }: DeleteAllAttributeAction) {
    // Delete ALl Attribute Logic Here
  }

  @Action(ImportAttributeAction)
  import(_ctx: StateContext<AttributeStateModel>, _action: ImportTagAction) {
    // Import Attribute Logic Here
  }

  @Action(ExportAttributeAction)
  export(_ctx: StateContext<AttributeStateModel>, _action: ExportAttributeAction) {
    // Export Attribute Logic Here
  }
}
