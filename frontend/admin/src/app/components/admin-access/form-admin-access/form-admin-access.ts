import { AsyncPipe } from '@angular/common';

import { Component, effect, inject, input, output } from '@angular/core';

import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { Observable, combineLatest, map, shareReplay, startWith } from 'rxjs';

import { Button } from '../../../shared/components/ui/button/button';

import {
  IAdminAccessDetail,
  IAdminAccessPermission,
  IAdminAccessPermissionGroup,
} from '../../../shared/interface/admin-access.interface';

import { GetAdminAccessPermissionMatrixAction } from '../../../shared/store/action/admin-access.action';

import { AdminAccessState } from '../../../shared/store/state/admin-access.state';

//==================================================
//==== FORM VALUE
//==================================================

export interface AdminAccessFormValue {
  access_name: string;

  access_description: string;

  permissions: string[];
}

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-form-admin-access',

  imports: [AsyncPipe, ReactiveFormsModule, TranslateModule, Button],

  templateUrl: './form-admin-access.html',

  styleUrl: './form-admin-access.scss',
})
export class FormAdminAccess {
  //==================================================
  //==== INJECT
  //==================================================

  private formBuilder = inject(FormBuilder);

  private store = inject(Store);

  //==================================================
  //==== INPUT / OUTPUT
  //==================================================

  readonly mode = input<'create' | 'edit'>('create');

  readonly data = input<IAdminAccessDetail | null>(null);

  readonly formSubmit = output<AdminAccessFormValue>();

  //==================================================
  //==== ACTIVE GROUP
  //==================================================

  public activePermissionGroup = '';

  //==================================================
  //==== GROUP SEARCH
  //==================================================

  public groupSearch = new FormControl('', {
    nonNullable: true,
  });

  //==================================================
  //==== PERMISSION ORDER
  //==================================================

  private readonly permissionOrder: Record<string, number> = {
    view: 1,

    create: 2,

    update: 3,

    edit: 3,

    delete: 4,

    approve: 5,

    reject: 6,

    publish: 7,

    unpublish: 8,

    assign: 9,

    manage: 10,

    export: 11,

    import: 12,

    restore: 13,
  };

  //==================================================
  //==== PERMISSION DEPENDENCIES
  //==================================================

  private readonly permissionDependencies: Record<string, string[]> = {
    'attachment.view': ['attachment.create', 'attachment.delete'],
  };

  //==================================================
  //==== GET PERMISSION BY KEY
  //==================================================

  private getPermissionByKey(key: string): IAdminAccessPermission | null {
    const groups =
      this.store.selectSnapshot(AdminAccessState.permissionMatrix) ?? [];

    for (const group of groups) {
      const permission = group.permissions.find(
        (item) => item.permission_key === key,
      );

      if (permission) {
        return permission;
      }
    }

    return null;
  }

  //==================================================
  //==== NORMALIZE PERMISSION DEPENDENCIES
  //==================================================

  private normalizePermissionDependencies(ids: string[]): string[] {
    const permissions = new Set(ids);

    for (const [requiredKey, dependentKeys] of Object.entries(
      this.permissionDependencies,
    )) {
      const requiredPermission = this.getPermissionByKey(requiredKey);

      if (!requiredPermission) {
        continue;
      }

      const dependencySelected = dependentKeys.some((dependentKey) => {
        const dependentPermission = this.getPermissionByKey(dependentKey);

        return (
          dependentPermission !== null &&
          permissions.has(dependentPermission.id_admin_permission)
        );
      });

      if (dependencySelected) {
        permissions.add(requiredPermission.id_admin_permission);
      }
    }

    return [...permissions];
  }

  //==================================================
  //==== SET PERMISSIONS
  //==================================================

  private setPermissions(ids: string[]): void {
    this.form.controls.permissions.setValue(
      this.normalizePermissionDependencies(ids),
    );

    this.form.controls.permissions.markAsDirty();
  }

  //==================================================
  //==== REQUIRED PERMISSION
  //==================================================

  isPermissionRequired(permission: IAdminAccessPermission): boolean {
    const dependentKeys =
      this.permissionDependencies[permission.permission_key];

    if (!dependentKeys?.length) {
      return false;
    }

    return dependentKeys.some((dependentKey) => {
      const dependentPermission = this.getPermissionByKey(dependentKey);

      return (
        dependentPermission !== null &&
        this.isPermissionChecked(dependentPermission.id_admin_permission)
      );
    });
  }

  //==================================================
  //==== SYNC DEPENDENCIES
  //==================================================

  private syncPermissionDependencies(): void {
    const current = this.form.controls.permissions.value;

    const normalized = this.normalizePermissionDependencies(current);

    if (
      normalized.length === current.length &&
      normalized.every((id) => current.includes(id))
    ) {
      return;
    }

    this.form.controls.permissions.setValue(normalized, {
      emitEvent: false,
    });
  }

  //==================================================
  //==== MATRIX
  //==================================================

  permissionMatrix$: Observable<IAdminAccessPermissionGroup[]> =
    this.store.select(AdminAccessState.permissionMatrix);

  //==================================================
  //==== SORTED MATRIX
  //==================================================

  permissionMatrixView$ = this.permissionMatrix$.pipe(
    map((groups) =>
      groups.map((group) => ({
        ...group,

        permissions: [...group.permissions].sort((a, b) =>
          this.sortPermissions(a, b),
        ),
      })),
    ),

    shareReplay({
      bufferSize: 1,

      refCount: true,
    }),
  );

  //==================================================
  //==== FILTERED GROUPS
  //==================================================

  filteredPermissionMatrix$ = combineLatest([
    this.permissionMatrixView$,

    this.groupSearch.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([groups, search]) => {
      const term = search.trim().toLowerCase();

      if (!term) {
        return groups;
      }

      return groups.filter((group) =>
        group.permission_group.toLowerCase().includes(term),
      );
    }),

    shareReplay({
      bufferSize: 1,

      refCount: true,
    }),
  );

  //==================================================
  //==== FORM
  //==================================================

  public form = this.formBuilder.nonNullable.group({
    access_name: ['', [Validators.required, Validators.maxLength(255)]],

    access_description: ['', [Validators.maxLength(500)]],

    permissions: this.formBuilder.nonNullable.control<string[]>([]),
  });

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    effect(() => {
      const data = this.data();

      if (!data) {
        return;
      }

      this.form.patchValue(
        {
          access_name: data.access_name,

          access_description: data.access_description ?? '',

          permissions: this.normalizePermissionDependencies([
            ...data.permission_ids,
          ]),
        },
        {
          emitEvent: false,
        },
      );
    });
  }

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    this.store.dispatch(new GetAdminAccessPermissionMatrixAction()).subscribe({
      complete: () => {
        this.syncPermissionDependencies();
      },
    });
  }

  //==================================================
  //==== SORT PERMISSIONS
  //==================================================

  private sortPermissions(
    a: IAdminAccessPermission,

    b: IAdminAccessPermission,
  ): number {
    const actionA = this.getPermissionAction(a.permission_key);

    const actionB = this.getPermissionAction(b.permission_key);

    const orderA = this.permissionOrder[actionA] ?? 999;

    const orderB = this.permissionOrder[actionB] ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.permission_name.localeCompare(b.permission_name);
  }

  //==================================================
  //==== GET PERMISSION ACTION
  //==================================================

  private getPermissionAction(permissionKey: string): string {
    const parts = permissionKey.toLowerCase().split('.');

    return parts.at(-1) ?? '';
  }

  //==================================================
  //==== DOM ID
  //==================================================

  groupDomId(groupName: string): string {
    return groupName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  //==================================================
  //==== ACTIVE GROUP
  //==================================================

  selectGroup(group: IAdminAccessPermissionGroup): void {
    this.activePermissionGroup = group.permission_group;
  }

  getActiveGroup(
    groups: IAdminAccessPermissionGroup[],
  ): IAdminAccessPermissionGroup | null {
    if (!groups.length) {
      return null;
    }

    if (this.activePermissionGroup) {
      const selected = groups.find(
        (group) => group.permission_group === this.activePermissionGroup,
      );

      if (selected) {
        return selected;
      }
    }

    return groups[0];
  }

  //==================================================
  //==== PERMISSION CHECKED
  //==================================================

  isPermissionChecked(id: string): boolean {
    return this.form.controls.permissions.value.includes(id);
  }

  //==================================================
  //==== TOGGLE PERMISSION
  //==================================================

  togglePermission(
    id: string,

    checked: boolean,
  ): void {
    const permissions = new Set(this.form.controls.permissions.value);

    if (checked) {
      permissions.add(id);
    } else {
      permissions.delete(id);
    }

    this.setPermissions([...permissions]);
  }

  //==================================================
  //==== GROUP SELECTED COUNT
  //==================================================

  getGroupSelectedCount(group: IAdminAccessPermissionGroup): number {
    return group.permissions.filter((permission) =>
      this.isPermissionChecked(permission.id_admin_permission),
    ).length;
  }

  //==================================================
  //==== GROUP CHECKED
  //==================================================

  isGroupChecked(group: IAdminAccessPermissionGroup): boolean {
    if (!group.permissions.length) {
      return false;
    }

    return group.permissions.every((permission) =>
      this.isPermissionChecked(permission.id_admin_permission),
    );
  }

  //==================================================
  //==== GROUP INDETERMINATE
  //==================================================

  isGroupIndeterminate(group: IAdminAccessPermissionGroup): boolean {
    const selected = this.getGroupSelectedCount(group);

    return selected > 0 && selected < group.permissions.length;
  }

  //==================================================
  //==== TOGGLE GROUP
  //==================================================

  toggleGroup(
    group: IAdminAccessPermissionGroup,

    checked: boolean,
  ): void {
    const permissions = new Set(this.form.controls.permissions.value);

    for (const permission of group.permissions) {
      if (checked) {
        permissions.add(permission.id_admin_permission);
      } else {
        permissions.delete(permission.id_admin_permission);
      }
    }

    this.setPermissions([...permissions]);
  }

  //==================================================
  //==== TOTAL PERMISSIONS
  //==================================================

  getTotalPermissions(groups: IAdminAccessPermissionGroup[]): number {
    return groups.reduce(
      (total, group) => total + group.permissions.length,

      0,
    );
  }

  //==================================================
  //==== TOTAL SELECTED
  //==================================================

  getTotalSelected(): number {
    return this.form.controls.permissions.value.length;
  }

  //==================================================
  //==== ALL CHECKED
  //==================================================

  isAllChecked(groups: IAdminAccessPermissionGroup[]): boolean {
    const ids = groups.flatMap((group) =>
      group.permissions.map((permission) => permission.id_admin_permission),
    );

    return ids.length > 0 && ids.every((id) => this.isPermissionChecked(id));
  }

  //==================================================
  //==== ALL INDETERMINATE
  //==================================================

  isAllIndeterminate(groups: IAdminAccessPermissionGroup[]): boolean {
    const total = this.getTotalPermissions(groups);

    const selected = groups.reduce(
      (count, group) => count + this.getGroupSelectedCount(group),

      0,
    );

    return selected > 0 && selected < total;
  }

  //==================================================
  //==== TOGGLE ALL
  //==================================================

  toggleAll(
    groups: IAdminAccessPermissionGroup[],

    checked: boolean,
  ): void {
    if (!checked) {
      this.setPermissions([]);

      return;
    }

    const ids = groups.flatMap((group) =>
      group.permissions.map((permission) => permission.id_admin_permission),
    );

    this.setPermissions([...new Set(ids)]);
  }

  //==================================================
  //==== SUBMIT
  //==================================================

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const value = this.form.getRawValue();

    this.formSubmit.emit({
      access_name: value.access_name.trim(),

      access_description: value.access_description.trim(),

      permissions: value.permissions,
    });
  }
}
