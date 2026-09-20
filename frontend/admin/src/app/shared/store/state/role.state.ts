import { Injectable, inject } from '@angular/core';

import { Store, Action, Selector, State, StateContext } from '@ngxs/store';
import { tap } from 'rxjs';

import { IRole, IModule } from '../../interface/role.interface';
import { NotificationService } from '../../services/notification.service';
import { RoleService } from '../../services/role.service';
import {
  GetRolesAction,
  GetRoleModulesAction,
  CreateRoleAction,
  EditRoleAction,
  UpdateRoleAction,
  DeleteRoleAction,
  DeleteAllRoleAction,
} from '../action/role.action';

export class RoleStateModel {
  role = {
    data: [] as IRole[],
    total: 0,
  };
  selectedRole: IRole | null;
  modules: IModule[];
}

@State<RoleStateModel>({
  name: 'role',
  defaults: {
    role: {
      data: [],
      total: 0,
    },
    selectedRole: null,
    modules: [],
  },
})
@Injectable()
export class RoleState {
  private store = inject(Store);
  private notificationService = inject(NotificationService);
  private roleService = inject(RoleService);

  @Selector()
  static role(state: RoleStateModel) {
    return state.role;
  }

  @Selector()
  static roles(state: RoleStateModel) {
    return state.role.data
      .map(res => {
        return { label: res?.name, value: res?.id };
      })
      .filter(value => value.label !== 'admin' && value.label !== 'vendor');
  }

  @Selector()
  static selectedRole(state: RoleStateModel) {
    return state.selectedRole;
  }

  @Selector()
  static roleModules(state: RoleStateModel) {
    return state.modules;
  }

  @Action(GetRolesAction)
  getRoles(ctx: StateContext<RoleStateModel>, action: GetRolesAction) {
    return this.roleService.getRoles(action?.payload).pipe(
      tap({
        next: result => {
          ctx.patchState({
            role: {
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

  @Action(GetRoleModulesAction)
  getRoleModules(ctx: StateContext<RoleStateModel>) {
    return this.roleService.getRoleModules().pipe(
      tap({
        next: result => {
          const state = ctx.getState();
          ctx.patchState({
            ...state,
            modules: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(CreateRoleAction)
  create(_ctx: StateContext<RoleStateModel>, _action: CreateRoleAction) {
    // Create Role Logic Here
  }

  @Action(EditRoleAction)
  edit(ctx: StateContext<RoleStateModel>, { id }: EditRoleAction) {
    return this.roleService.getRoles().pipe(
      tap({
        next: results => {
          const state = ctx.getState();
          const result = results.data.find(role => role.id == id);
          ctx.patchState({
            ...state,
            selectedRole: result,
          });
        },
        error: err => {
          throw new Error(err?.error?.message);
        },
      }),
    );
  }

  @Action(UpdateRoleAction)
  update(_ctx: StateContext<RoleStateModel>, { payload: _payload, id: _id }: UpdateRoleAction) {
    // Update Role Logic Here
  }

  @Action(DeleteRoleAction)
  delete(_ctx: StateContext<RoleStateModel>, { id: _id }: DeleteRoleAction) {
    // Delete Role Logic Here
  }

  @Action(DeleteAllRoleAction)
  deleteAll(_ctx: StateContext<RoleStateModel>, { ids: _ids }: DeleteAllRoleAction) {
    // Delete All Role Logic Here
  }
}
