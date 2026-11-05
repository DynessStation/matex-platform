import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, concat, finalize, of, switchMap, toArray } from 'rxjs';

import {
  VisibleGroup,
  groupPrefixes,
  isDeletable,
  keyAction,
  keyPrefix,
  visibleGroups,
} from './admin-permission.util';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { HelpTip } from '../../shared/components/ui/help/help-tip/help-tip';
import { ConfirmationModal } from '../../shared/components/ui/modal/confirmation-modal/confirmation-modal';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { TextFitDirective } from '../../shared/directives/text-fit.directive';
import {
  IAdminPermission,
  IAdminPermissionGroup,
} from '../../shared/interface/admin-permission.interface';
import { ITableClickedAction } from '../../shared/interface/table.interface';
import { AdminPermissionService } from '../../shared/services/admin-permission.service';
import { NotificationService } from '../../shared/services/notification.service';

const QUERY = {
  searchGroup: 'searchgroup',
  searchPermission: 'searchpermission',
  group: 'group',
  edit: 'edit',
} as const;

// What the confirmation modal is asked about.
type DeleteTarget =
  { kind: 'permissions'; ids: string[] } | { kind: 'group'; id: string };

// Hak Akses: groups on the left, the chosen group's permissions on the right, adding and editing
// inside the panels. Everything that says what is on screen lives in the URL
// (?searchgroup=office&searchpermission=creat&group=Office&edit=<id>), so a view can be shared.
@Component({
  selector: 'app-admin-permission',
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    TranslateModule,
    PageWrapper,
    HelpTip,
    ConfirmationModal,
    HasPermissionDirective,
    TextFitDirective,
  ],
  templateUrl: './admin-permission.html',
})
export class AdminPermission {
  private readonly service = inject(AdminPermissionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly confirmation = viewChild<ConfirmationModal>('confirmationModal');

  readonly isDeletable = isDeletable;

  readonly groups = signal<IAdminPermissionGroup[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  /** The group whose name is in the group input; null while adding a new one. */
  readonly editingGroup = signal<IAdminPermissionGroup | null>(null);

  private readonly query = toSignal(this.route.queryParamMap, {
    requireSync: true,
  });

  readonly searchGroup = computed(
    () => this.query().get(QUERY.searchGroup) ?? '',
  );
  readonly searchPermission = computed(
    () => this.query().get(QUERY.searchPermission) ?? '',
  );

  readonly visible = computed<VisibleGroup[]>(() =>
    visibleGroups(this.groups(), this.searchGroup(), this.searchPermission()),
  );

  /** The permission named by ?edit=, wherever it is. */
  readonly editing = computed<IAdminPermission | null>(() => {
    const id = this.query().get(QUERY.edit);
    if (!id) return null;
    for (const group of this.groups()) {
      const found = group.permissions.find(
        (item) => item.id_admin_permission === id,
      );
      if (found) return found;
    }
    return null;
  });

  readonly active = computed<VisibleGroup | null>(() => {
    const editing = this.editing();
    const name = editing
      ? (editing.permission_group ?? 'Other')
      : this.query().get(QUERY.group);
    const groups = this.visible();
    return groups.find((group) => group.name === name) ?? groups[0] ?? null;
  });

  readonly prefixes = computed(() => groupPrefixes(this.active()));

  readonly selectable = computed(() =>
    (this.active()?.shown ?? []).filter(isDeletable),
  );
  readonly allSelected = computed(() => {
    const items = this.selectable();
    return (
      items.length > 0 &&
      items.every((item) => this.selected().has(item.id_admin_permission))
    );
  });

  readonly groupName = this.fb.control('', [
    Validators.required,
    Validators.maxLength(100),
  ]);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    prefix: [''],
    action: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
    description: ['', Validators.maxLength(255)],
    active: [false],
  });

  constructor() {
    this.load();

    // The form follows what is being edited, or the chosen group's first key start.
    effect(() => {
      const item = this.editing();
      const prefixes = this.prefixes();
      if (item) {
        this.form.reset({
          name: item.permission_name,
          prefix: keyPrefix(item.permission_key),
          action: keyAction(item.permission_key),
          description: item.permission_description ?? '',
          active: item.permission_status === 1,
        });
        this.form.controls.action.disable();
        this.form.controls.prefix.disable();
      } else {
        this.form.controls.action.enable();
        this.form.controls.prefix.enable();
        if (!prefixes.includes(this.form.controls.prefix.value ?? '')) {
          this.form.controls.prefix.setValue(prefixes[0] ?? '');
        }
      }
    });
  }

  //==================================================
  //==== LOADING AND URL
  //==================================================

  load(): void {
    this.loading.set(true);
    this.service
      .getGroups()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe((response) => {
        this.groups.set(response.data ?? []);
        this.selected.set(new Set());
      });
  }

  private setQuery(params: Params): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearchGroup(value: string): void {
    this.setQuery({ [QUERY.searchGroup]: value || null });
  }

  onSearchPermission(value: string): void {
    this.setQuery({ [QUERY.searchPermission]: value || null });
  }

  selectGroup(group: IAdminPermissionGroup): void {
    this.selected.set(new Set());
    this.resetForm();
    this.setQuery({ [QUERY.group]: group.name, [QUERY.edit]: null });
  }

  //==================================================
  //==== GROUPS
  //==================================================

  editGroup(group: IAdminPermissionGroup, event: Event): void {
    event.stopPropagation();
    this.editingGroup.set(group);
    this.groupName.setValue(group.name);
  }

  cancelGroup(): void {
    this.editingGroup.set(null);
    this.groupName.reset('');
  }

  saveGroup(): void {
    this.groupName.markAsTouched();
    const name = (this.groupName.value ?? '').trim();
    if (!name || this.groupName.invalid || this.saving()) return;
    const editing = this.editingGroup();
    const request = editing?.id_admin_permission_group
      ? this.service.renameGroup(editing.id_admin_permission_group, name)
      : this.service.createGroup(name);
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.notification.showSuccess(
        this.translate.instant('admin_permission.group_saved'),
      );
      this.cancelGroup();
      this.setQuery({ [QUERY.group]: name });
      this.load();
    });
  }

  //==================================================
  //==== PERMISSION FORM
  //==================================================

  /** What the key's last part cannot be: the group's actions already in use. */
  existingActions(): string[] {
    const prefix = this.form.controls.prefix.value;
    return (this.active()?.permissions ?? [])
      .filter((item) => keyPrefix(item.permission_key) === prefix)
      .map((item) => keyAction(item.permission_key));
  }

  get actionTaken(): boolean {
    return (
      !this.editing() &&
      this.existingActions().includes(this.form.controls.action.value ?? '')
    );
  }

  edit(item: IAdminPermission): void {
    this.setQuery({ [QUERY.edit]: item.id_admin_permission });
  }

  cancelEdit(): void {
    this.resetForm();
    this.setQuery({ [QUERY.edit]: null });
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      prefix: this.prefixes()[0] ?? '',
      action: '',
      description: '',
      active: false,
    });
  }

  submit(): void {
    this.form.markAllAsTouched();
    const group = this.active();
    if (this.form.invalid || this.actionTaken || !group || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const fields = {
      permission_name: value.name ?? '',
      permission_group: group.id_admin_permission_group ? group.name : null,
      permission_description: value.description || null,
    };
    const status: 0 | 1 = value.active ? 1 : 0;
    const editing = this.editing();
    const request: Observable<unknown> = editing
      ? this.service
          .update(editing.id_admin_permission, fields)
          .pipe(
            switchMap(() =>
              editing.permission_status === status
                ? of(null)
                : this.service.setStatus(editing.id_admin_permission, status),
            ),
          )
      : this.service.create({
          ...fields,
          permission_key: `${value.prefix}.${value.action}`,
          permission_status: status,
        });
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe(() => {
      this.notification.showSuccess(
        this.translate.instant(
          editing ? 'admin_permission.updated' : 'admin_permission.created',
        ),
      );
      this.cancelEdit();
      this.load();
    });
  }

  //==================================================
  //==== SELECTING AND DELETING
  //==================================================

  toggleSelected(id: string): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(
      this.allSelected()
        ? new Set()
        : new Set(this.selectable().map((item) => item.id_admin_permission)),
    );
  }

  askDelete(item: IAdminPermission): void {
    const target: DeleteTarget = {
      kind: 'permissions',
      ids: [item.id_admin_permission],
    };
    this.confirmation()?.openModal(
      'delete',
      { name: item.permission_name },
      target,
    );
  }

  askDeleteSelected(): void {
    const ids = [...this.selected()];
    const target: DeleteTarget = { kind: 'permissions', ids };
    this.confirmation()?.openModal(
      'delete',
      {
        name: this.translate.instant('admin_permission.selected_count', {
          count: ids.length,
        }),
      },
      target,
    );
  }

  askDeleteGroup(group: IAdminPermissionGroup, event: Event): void {
    event.stopPropagation();
    if (!group.id_admin_permission_group) return;
    const target: DeleteTarget = {
      kind: 'group',
      id: group.id_admin_permission_group,
    };
    this.confirmation()?.openModal('delete', { name: group.name }, target);
  }

  onConfirmed(action: ITableClickedAction<unknown>): void {
    const target = action.value as DeleteTarget;
    const requests: Observable<unknown> =
      target.kind === 'group'
        ? this.service.deleteGroup(target.id)
        : concat(...target.ids.map((id) => this.service.delete(id))).pipe(
            toArray(),
          );
    requests.subscribe({
      next: () => {
        this.confirmation()?.closeModal();
        this.notification.showSuccess(
          this.translate.instant('admin_permission.deleted'),
        );
        this.cancelEdit();
        this.load();
      },
      error: () => {
        this.confirmation()?.closeModal();
        this.load();
      },
    });
  }
}
