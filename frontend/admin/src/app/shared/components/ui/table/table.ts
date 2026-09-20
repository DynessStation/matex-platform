import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DOCUMENT,
  inject,
  input,
  Input,
  output,
  PLATFORM_ID,
  Renderer2,
  viewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Params } from '@angular/router';

import {
  NgbCalendar,
  NgbDate,
  NgbDateParserFormatter,
  NgbModule,
  NgbRatingConfig,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { debounceTime, distinctUntilChanged, Observable } from 'rxjs';

import { IAccountUser } from '../../../interface/account.interface';
import { IPermission } from '../../../interface/role.interface';
import {
  ITableClickedAction,
  ITableColumn,
  IBaseRow,
  ITableConfig,
  TableRowId,
} from '../../../interface/table.interface';
import { CurrencySymbolPipe } from '../../../pipe/currency-symbol.pipe';
import { AccountState } from '../../../store/state/account.state';
import { LoaderState } from '../../../store/state/loader.state';
import { ConfirmationModal } from '../modal/confirmation-modal/confirmation-modal';
import { DeleteModal } from '../modal/delete-modal/delete-modal';
import { Pagination } from '../pagination/pagination';
import { LocalizationService } from '../../../services/localization.service';

@Component({
  selector: 'app-table',
  imports: [
    CommonModule,
    TranslateModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    CurrencySymbolPipe,
    Pagination,
    DeleteModal,
    ConfirmationModal,
  ],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table {
  private document = inject<Document>(DOCUMENT);
  private renderer = inject(Renderer2);
  private calendar = inject(NgbCalendar);
  public localization = inject(LocalizationService);

  formatter = inject(NgbDateParserFormatter);

  //==================================================
  //==== TEMPLATE STATE
  //==================================================

  loadingStatus$: Observable<boolean> = inject(Store).select(
    LoaderState.status,
  ) as Observable<boolean>;

  permissions$: Observable<IPermission[]> = inject(Store).select(
    AccountState.permissions,
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
  //==== ACTION DISPLAY
  //==================================================

  readonly actionMode = input<'inline' | 'dropdown'>('inline');

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

  readonly rowClicked = output<any>();

  readonly selectedItems = output<TableRowId[]>();

  //==================================================
  //==== MODAL
  //==================================================

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  readonly ConfirmationModal =
    viewChild<ConfirmationModal>('confirmationModal');

  //==================================================
  //==== TABLE STATE
  //==================================================

  public term = new FormControl();

  public rows = [15, 25, 50, 100];

  public tableData: Params = {
    search: '',
    field: '',
    sort: '',
    page: 1,
    paginate: 15,
  };

  public selected: TableRowId[] = [];

  public permissions: string[] = [];

  public role: string;

  //==================================================
  //==== DATE RANGE
  //==================================================

  public hoveredDate: NgbDate | null = null;

  public fromDate: NgbDate | null;

  public toDate: NgbDate | null;

  public isBrowser: boolean;

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    const config = inject(NgbRatingConfig);

    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);

    config.max = 5;
    config.readonly = true;

    this.term.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((data: string) => {
        this.onChangeTable(data, 'search');
      });
  }

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit() {
    if (this.emitInitialChange()) {
      this.tableChanged.emit({
        ...this.tableData,
      });
    }

    //==================================================
    //==== LEGACY TEMPLATE PERMISSIONS
    //==================================================

    this.permissions$.subscribe((permission) => {
      this.permissions = permission?.map((value) => value?.name) ?? [];
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
      new Set([...this.permissions, ...(this.externalPermissions() ?? [])]),
    );
  }

  //==================================================
  //==== CHECK PERMISSION
  //==================================================

  private checkPermission(permission?: string | string[]): boolean {
    if (this.externalAllAccess()) {
      return true;
    }

    if (!permission) {
      return true;
    }

    const permissions = this.getCurrentPermissions();

    if (Array.isArray(permission)) {
      return permission.some((item) => permissions.includes(item));
    }

    return permissions.includes(permission);
  }

  //==================================================
  //==== CAN ALLOW
  //==================================================

  checkIsCanAllow() {
    return (
      this.tableConfig()
        ?.columns?.map(
          (data) => data.canAllow != undefined && data.canAllow.length,
        )
        .includes(1) && this.role == 'vendor'
    );
  }

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
      this.DeleteModal().openModal('delete', rowData);

      return;
    }

    this.onActionClicked(action.actionToPerform, rowData);
  }

  //==================================================
  //==== SYNC EXTERNAL STATE
  //==================================================

  public syncState(params: Params): void {
    const page = Number(params['page']);

    const paginate = Number(params['paginate']);

    this.tableData = {
      ...this.tableData,

      search: typeof params['search'] === 'string' ? params['search'] : '',

      field: typeof params['field'] === 'string' ? params['field'] : '',

      sort:
        params['sort'] === 'asc' || params['sort'] === 'desc'
          ? params['sort']
          : '',

      page: Number.isInteger(page) && page > 0 ? page : 1,

      paginate: this.rows.includes(paginate) ? paginate : 15,
    };

    //==================================================
    //==== SEARCH
    //==================================================

    this.term.setValue(this.tableData['search'], {
      emitEvent: false,
    });

    //==================================================
    //==== DATE RANGE
    //==================================================

    this.fromDate = this.parseDateState(params['start_date']);

    this.toDate = this.parseDateState(params['end_date']);

    if (this.fromDate) {
      this.tableData['start_date'] = this.formatter.format(this.fromDate);
    } else {
      delete this.tableData['start_date'];
    }

    if (this.toDate) {
      this.tableData['end_date'] = this.formatter.format(this.toDate);
    } else {
      delete this.tableData['end_date'];
    }

    //==================================================
    //==== SORT INDICATOR
    //==================================================

    const field = this.tableData['field'];

    const sort = this.tableData['sort'];

    if (field && (sort === 'asc' || sort === 'desc')) {
      const column = this.tableConfig()?.columns?.find(
        (item) => item.dataField === field,
      );

      if (column) {
        column.sort_direction = sort;
      }
    }
  }

  //==================================================
  //==== PARSE DATE STATE
  //==================================================

  private parseDateState(value: unknown): NgbDate | null {
    if (typeof value !== 'string' || !value) {
      return null;
    }

    const parsed = this.formatter.parse(value);

    if (!parsed) {
      return null;
    }

    const date = NgbDate.from(parsed);

    return this.calendar.isValid(date) ? date : null;
  }

  //==================================================
  //==== CHANGE TABLE
  //==================================================

  onChangeTable(
    data: ITableColumn | any,

    type: string,
  ): void {
    //==================================================
    //==== SORT
    //==================================================

    if (type === 'sort' && data && data.sortable !== false) {
      const nextSort = data.sort_direction === 'asc' ? 'desc' : 'asc';

      data.sort_direction = nextSort;

      this.tableData['field'] = data.dataField!;

      this.tableData['sort'] = nextSort;

      this.tableData['page'] = 1;
    }

    //==================================================
    //==== PAGINATE
    //==================================================
    else if (type === 'paginate') {
      this.tableData['paginate'] = Number(
        (data.target as HTMLInputElement)?.value,
      );

      this.tableData['page'] = 1;
    }

    //==================================================
    //==== PAGE
    //==================================================
    else if (type === 'page') {
      this.tableData['page'] = Number(data);
    }

    //==================================================
    //==== SEARCH
    //==================================================
    else if (type === 'search') {
      this.tableData['search'] = typeof data === 'string' ? data.trim() : '';

      this.tableData['page'] = 1;
    }

    //==================================================
    //==== DATE RANGE
    //==================================================
    else if (type === 'daterange') {
      if (data?.start_date) {
        this.tableData['start_date'] = data.start_date;
      } else {
        delete this.tableData['start_date'];
      }

      if (data?.end_date && !String(data.end_date).includes('undefined')) {
        this.tableData['end_date'] = data.end_date;
      } else {
        delete this.tableData['end_date'];
      }

      this.tableData['page'] = 1;
    }

    this.renderer.addClass(this.document.body, 'loader-none');

    this.tableChanged.emit({
      ...this.tableData,
    });
  }

  //==================================================
  //==== ACTION CLICK
  //==================================================

  onActionClicked(actionType: string, rowData: any, value?: number) {
    this.renderer.addClass(this.document.body, 'loader-none');

    rowData[actionType] = value;

    this.action.emit({
      actionToPerform: actionType,

      data: rowData,
    });
  }

  //==================================================
  //==== ROW CLICK
  //==================================================

  onRowClicked(rowData: any): void {
    if (this.hasPermission(['edit', 'view'])) {
      this.rowClicked.emit(rowData);
    }
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
  //==== CONDITION
  //==================================================

  isConditionMet(
    condition: {
      field: string;
      condition: string;
      value: string;
    },
    columnData: any,
  ): boolean {
    const field = Array.isArray(columnData[condition.field])
      ? columnData[condition.field].length
      : columnData[condition.field];

    switch (condition.condition) {
      case '==':
        return field == condition.value;

      case '!=':
        return field != condition.value;

      default:
        return false;
    }
  }

  //==================================================
  //==== DATE SELECTION
  //==================================================

  onDateSelection(date: NgbDate) {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
    } else if (
      this.fromDate &&
      !this.toDate &&
      date &&
      date.after(this.fromDate)
    ) {
      this.toDate = date;
    } else {
      this.toDate = null;

      this.fromDate = date;
    }

    const params: Params = {
      start_date: this.fromDate ? this.formatter.format(this.fromDate) : '',
    };

    if (this.toDate) {
      params['end_date'] = this.formatter.format(this.toDate);
    }

    this.onChangeTable(params, 'daterange');
  }

  //==================================================
  //==== DATE HOVER
  //==================================================

  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  //==================================================
  //==== DATE INSIDE
  //==================================================

  isInside(date: NgbDate) {
    return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
  }

  //==================================================
  //==== DATE RANGE
  //==================================================

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      (this.toDate && date.equals(this.toDate)) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  //==================================================
  //==== VALIDATE DATE
  //==================================================

  validateInput(
    currentValue: NgbDate | null,

    input: string,
  ): NgbDate | null {
    const parsed = this.formatter.parse(input);

    return parsed && this.calendar.isValid(NgbDate.from(parsed))
      ? NgbDate.from(parsed)
      : currentValue;
  }

  //==================================================
  //==== NESTED PROPERTY
  //==================================================

  getNestedPropertyValue(
    dataField: string | undefined,

    columnData: any,
  ): string {
    if (!dataField) {
      return '';
    }

    const keys = dataField.split('.');

    let value = columnData;

    for (const key of keys) {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) {
        value = value[key];
      } else {
        return '';
      }
    }

    return value;
  }

  //==================================================
  //==== CLEAR DATE RANGE
  //==================================================

  clearDateRange() {
    this.fromDate = null;

    this.toDate = null;

    this.onChangeTable(null, 'daterange');
  }

  //==================================================
  //==== DESTROY
  //==================================================

  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'loader-none');
  }
}
