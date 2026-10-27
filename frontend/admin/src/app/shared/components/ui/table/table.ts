import { CommonModule } from '@angular/common';
import {
  Component,
  DOCUMENT,
  inject,
  input,
  Input,
  output,
  viewChild,
} from '@angular/core';
import { Params } from '@angular/router';

import { NgbModule, NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { TableFooter } from './table-footer/table-footer';
import { TableStateService } from './table-state.service';
import { TableToolbar } from './table-toolbar/table-toolbar';
import {
  getNestedPropertyValue,
  isConditionMet,
  isPermissionGranted,
  isSwitchActive,
  nextSwitchValue,
  TableViewSettings,
} from './table.util';
import { ImagePreviewDirective } from '../../../directives/image-preview.directive';
import { TextFitDirective } from '../../../directives/text-fit.directive';
import { IAccountUser } from '../../../interface/account.interface';
import { IPermission } from '../../../interface/role.interface';
import {
  ITableClickedAction,
  ITableConfig,
  TableRowId,
} from '../../../interface/table.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency-symbol.pipe';
import { LocalizationService } from '../../../services/localization.service';
import { AccountState } from '../../../store/state/account.state';
import { AuthState } from '../../../store/state/auth.state';
import { LoaderState } from '../../../store/state/loader.state';
import { ConfirmationModal } from '../modal/confirmation-modal/confirmation-modal';
import { DeleteModal } from '../modal/delete-modal/delete-modal';

@Component({
  selector: 'app-table',
  imports: [
    CommonModule,
    TranslateModule,
    NgbModule,
    CurrencySymbolPipe,
    DeleteModal,
    ConfirmationModal,
    TableToolbar,
    TableFooter,
    TextFitDirective,
    ImagePreviewDirective,
  ],
  templateUrl: './table.html',
  styleUrl: './table.scss',
  providers: [TableStateService],
})
export class Table {
  private document = inject<Document>(DOCUMENT);
  public localization = inject(LocalizationService);

  // Query state, tools, load timer, and display settings (shared with toolbar and footer).
  readonly state = inject(TableStateService);

  //==================================================
  //==== TEMPLATE STATE
  //==================================================

  loadingStatus$: Observable<boolean> = inject(Store).select(
    LoaderState.status,
  ) as Observable<boolean>;

  permissions$: Observable<IPermission[]> = inject(Store).select(
    AccountState.permissions,
  );

  authPermissions$: Observable<string[]> = inject(Store).select(
    AuthState.permissions,
  );

  isAllAccess$: Observable<boolean> = inject(Store).select(
    AuthState.isAllAccess,
  );

  user$: Observable<IAccountUser> = inject(Store).select(AccountState.user);

  //==================================================
  //==== INPUT
  //==================================================

  @Input() hasCheckbox: boolean = false;

  readonly tableConfig = input<ITableConfig>(undefined);

  readonly hasDuplicate = input<boolean>(false);

  readonly topbar = input<boolean>(true);

  readonly pagination = input<boolean>(true);

  readonly loading = input<boolean>(true);

  readonly dateRange = input<boolean>(false);

  //==================================================
  //==== URL / EXTERNAL STATE
  //==================================================

  readonly emitInitialChange = input<boolean>(true);

  //==================================================
  //==== EXTERNAL PERMISSION
  //==================================================

  readonly externalPermissions = input<string[]>([]);

  readonly externalAllAccess = input<boolean>(false);

  //==================================================
  //==== OUTPUT
  //==================================================

  readonly tableChanged = output<Params>();

  readonly action = output<ITableClickedAction>();

  readonly selectedItems = output<TableRowId[]>();

  //==================================================
  //==== MODAL
  //==================================================

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  readonly ConfirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  public selected: TableRowId[] = [];

  public permissions: string[] = [];

  public authPermissions: string[] = [];

  public isAllAccess = false;

  public role: string;

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    const config = inject(NgbRatingConfig);

    config.max = 5;
    config.readonly = true;

    this.state.connect({
      tableConfig: this.tableConfig,
      tableChanged: this.tableChanged,
    });
  }

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit() {
    this.state.init(this.emitInitialChange());

    //==================================================
    //==== LEGACY TEMPLATE PERMISSIONS
    //==================================================

    this.permissions$.subscribe((permission) => {
      this.permissions = permission?.map((value) => value?.name) ?? [];
    });

    this.authPermissions$.subscribe((permissions) => {
      this.authPermissions = permissions ?? [];
    });

    this.isAllAccess$.subscribe((isAllAccess) => {
      this.isAllAccess = isAllAccess === true;
    });

    //==================================================
    //==== LOADER
    //==================================================

    this.loadingStatus$.subscribe((res) => {
      if (res === false) {
        this.selected = [];
      }
    });

    //==================================================
    //==== USER ROLE
    //==================================================

    this.user$.subscribe((user) => {
      this.role = user?.role?.name;
    });
  }

  //==================================================
  //==== CURRENT PERMISSIONS
  //==================================================

  private getCurrentPermissions(): string[] {
    return Array.from(
      new Set([
        ...this.permissions,
        ...this.authPermissions,
        ...(this.externalPermissions() ?? []),
      ]),
    );
  }

  //==================================================
  //==== CHECK PERMISSION
  //==================================================

  private checkPermission(permission?: string | string[]): boolean {
    if (this.isAllAccess || this.externalAllAccess()) {
      return true;
    }

    return isPermissionGranted(this.getCurrentPermissions(), permission);
  }

  //==================================================
  //==== VISIBLE COLUMNS
  //==================================================

  /** Columns shown to this admin (some are limited to roles). */
  visibleColumnCount(): number {
    return (
      this.tableConfig()?.columns?.filter(
        (column) =>
          !column.canAllow ||
          (column.canAllow.length &&
            this.role &&
            column.canAllow.includes(this.role)),
      ).length ?? 0
    );
  }

  //==================================================
  //==== DISPLAY SETTINGS (U-3)
  //==================================================

  // Options in the gear menu of the action column header.
  readonly settingOptions: { key: keyof TableViewSettings; label: string }[] = [
    { key: 'fullText', label: 'table_full_text' },
    { key: 'hideSort', label: 'table_hide_sort' },
    { key: 'striped', label: 'table_striped' },
  ];

  //==================================================
  //==== HAS PERMISSION
  //==================================================

  hasPermission(actions?: string[]): boolean {
    const action = this.tableConfig()?.rowActions?.find((item) =>
      actions?.includes(item.actionToPerform),
    );

    if (!action) {
      return false;
    }

    return this.checkPermission(action.permission);
  }

  //==================================================
  //==== CAN SHOW ACTION
  //==================================================

  public canShowAction(action: any): boolean {
    return this.checkPermission(action?.permission);
  }

  //==================================================
  //==== HAS VISIBLE ACTION
  //==================================================

  public hasVisibleRowActions(): boolean {
    return (
      this.tableConfig()?.rowActions?.some((action) =>
        this.canShowAction(action),
      ) ?? false
    );
  }

  //==================================================
  //==== HANDLE ROW ACTION
  //==================================================

  public handleRowAction(action: any, rowData: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (action.actionToPerform === 'delete') {
      void this.DeleteModal().openModal('delete', rowData);

      return;
    }

    this.onActionClicked(action.actionToPerform, rowData);
  }

  // Pure cell helpers used by the template (see table.util.ts).

  public readonly isSwitchActive = isSwitchActive;

  public readonly nextSwitchValue = nextSwitchValue;

  public readonly isConditionMet = isConditionMet;

  public readonly getNestedPropertyValue = getNestedPropertyValue;

  //==================================================
  //==== SYNC EXTERNAL STATE
  //==================================================

  /** Called by pages that keep the table query in their URL (products, activity log). */
  public syncState(params: Params): void {
    this.state.syncState(params);
  }

  //==================================================
  //==== ACTION CLICK
  //==================================================

  onActionClicked(actionType: string, rowData: any, value?: number) {
    this.document.body.classList.add('loader-none');

    rowData[actionType] = value;

    this.action.emit({
      actionToPerform: actionType,

      data: rowData,
    });

    this.ConfirmationModal()?.closeModal();
  }

  //==================================================
  //==== CHECK ALL
  //==================================================

  checkUncheckAll(event: Event) {
    this.tableConfig()?.data!.forEach((item: any) => {
      if (item.system_reserve != '1') {
        item.isChecked = (event?.target as HTMLInputElement)?.checked;

        this.setSelectedItem(
          (event?.target as HTMLInputElement)?.checked,

          item?.id,
        );
      }
    });
  }

  //==================================================
  //==== ITEM CHECK
  //==================================================

  onItemChecked(event: Event, id: TableRowId): void {
    this.setSelectedItem((event.target as HTMLInputElement).checked, id);
  }

  //==================================================
  //==== SELECTED ITEM
  //==================================================

  setSelectedItem(checked: boolean, value: TableRowId): void {
    const index = this.selected.indexOf(value);

    if (checked) {
      if (index === -1) {
        this.selected.push(value);
      }
    } else {
      this.selected = this.selected.filter((id) => id !== value);
    }

    this.selectedItems.emit(this.selected);
  }

  //==================================================
  //==== DELETE BUTTON STATUS
  //==================================================

  get deleteButtonStatus() {
    let status = false;

    this.tableConfig()?.data?.forEach((data: any) => {
      if (!this.selected.includes(data?.id)) {
        return;
      }

      const action = this.tableConfig()?.rowActions?.find(
        (item) => item.actionToPerform === 'delete',
      );

      if (action && this.checkPermission(action.permission)) {
        status = true;
      }
    });

    return status;
  }

  //==================================================
  //==== DUPLICATE BUTTON STATUS
  //==================================================

  get duplicateButtonStatus() {
    let status = false;

    this.tableConfig()?.data?.forEach((data: any) => {
      if (!this.selected.includes(data?.id)) {
        return;
      }

      const action = this.tableConfig()?.rowActions?.find(
        (item) => item.actionToPerform === 'edit',
      );

      if (action && this.checkPermission(action.permission)) {
        status = true;
      }
    });

    return status;
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy() {
    this.document.body.classList.remove('loader-none');
  }
}
