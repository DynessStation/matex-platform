import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  DOCUMENT,
  Injectable,
  OutputEmitterRef,
  PLATFORM_ID,
  Signal,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Params } from '@angular/router';

import {
  NgbCalendar,
  NgbDate,
  NgbDateParserFormatter,
} from '@ng-bootstrap/ng-bootstrap';
import { Store } from '@ngxs/store';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import {
  TABLE_PAGE_SIZES,
  TableViewSettings,
  normalizeTableState,
  readTableViewSettings,
  writeTableViewSettings,
} from './table.util';
import { ITableColumn, ITableConfig } from '../../../interface/table.interface';
import { ListReturnService } from '../../../services/list-return.service';
import { AuthState } from '../../../store/state/auth.state';
import { LoaderState } from '../../../store/state/loader.state';

// Query state of one list table (search, sort, paging, date range), the reload and reset
// tools, the load timer, and the viewer's display settings. Provided by Table, so each
// table has its own; the toolbar and footer components inject it.
interface TableDateRange {
  start_date?: string;
  end_date?: string;
}

type TableChange =
  ITableColumn | Event | TableDateRange | Params | number | string | null;

@Injectable()
export class TableStateService {
  private readonly document = inject<Document>(DOCUMENT);
  private readonly calendar = inject(NgbCalendar);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lists = inject(ListReturnService);
  readonly formatter = inject(NgbDateParserFormatter);
  readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  //==================================================
  //==== TABLE BINDING
  //==================================================

  // Bound to the table's input and output in connect().
  private tableConfig: Signal<ITableConfig | undefined> = signal(undefined);

  private tableChanged: OutputEmitterRef<Params> | null = null;

  connect(table: {
    tableConfig: Signal<ITableConfig | undefined>;
    tableChanged: OutputEmitterRef<Params>;
  }): void {
    this.tableConfig = table.tableConfig;
    this.tableChanged = table.tableChanged;
  }

  //==================================================
  //==== QUERY STATE
  //==================================================

  public term = new FormControl();

  public readonly rows = TABLE_PAGE_SIZES;

  public tableData: Params = {
    search: '',
    field: '',
    sort: '',
    page: 1,
    paginate: TABLE_PAGE_SIZES[0],
  };

  // Sort direction each column starts with, restored by reset.
  private initialSortDirections = new Map<ITableColumn, string | undefined>();

  //==================================================
  //==== DATE RANGE
  //==================================================

  public hoveredDate: NgbDate | null = null;

  public fromDate: NgbDate | null = null;

  public toDate: NgbDate | null = null;

  //==================================================
  //==== LOAD TIME
  //==================================================

  // Seconds the last list request took, shown under the table; null until measured.
  public loadSeconds: number | null = null;

  private requestStartedAt: number | null = null;

  private requestLoading = false;

  //==================================================
  //==== TOOLS
  //==================================================

  // Reload and reset pause for a moment after use, so a list is not hammered.
  public toolsCoolingDown = false;

  public readonly toolsCooldownMs = 3000;

  private toolsCooldownTimer: ReturnType<typeof setTimeout> | null = null;

  //==================================================
  //==== DISPLAY SETTINGS
  //==================================================

  public settings: TableViewSettings = readTableViewSettings(null);

  constructor() {
    this.term.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data: string) => {
        this.onChangeTable(data, 'search');
      });

    this.store
      .select(LoaderState.status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((loading) => {
        if (loading === true && this.requestStartedAt !== null) {
          this.requestLoading = true;
        }

        if (loading === false) {
          this.stopLoadTimer();
        }
      });

    this.destroyRef.onDestroy(() => {
      if (this.toolsCooldownTimer) {
        clearTimeout(this.toolsCooldownTimer);
      }
    });
  }

  /** Called by Table on init: remembers sort defaults, then asks for the first page. */
  init(emitInitialChange: boolean): void {
    this.tableConfig()?.columns?.forEach((column) =>
      this.initialSortDirections.set(column, column.sort_direction),
    );

    if (this.isBrowser) {
      this.settings = readTableViewSettings(this.settingsOwner());
    }

    if (emitInitialChange) {
      // Back from a form (U-7): the query the list was left with.
      const remembered = this.lists.takeReturnQuery();

      if (remembered) {
        this.syncState(remembered);
      }

      this.startLoadTimer();

      this.emitQuery();
    }
  }

  //==================================================
  //==== SYNC EXTERNAL STATE
  //==================================================

  public syncState(params: Params): void {
    this.tableData = normalizeTableState(params, this.tableData);

    this.term.setValue(this.tableData['search'], {
      emitEvent: false,
    });

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

    // Sort indicator.
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

  /**
   * `data` by `type`: sort a column, paginate a select change event, page a number,
   * search a text, daterange the dates (or null), reload nothing.
   */
  onChangeTable(data: TableChange, type: string): void {
    const column = data as ITableColumn | null;

    if (type === 'sort' && column && column.sortable !== false) {
      const nextSort = column.sort_direction === 'asc' ? 'desc' : 'asc';

      column.sort_direction = nextSort;

      this.tableData['field'] = column.dataField!;

      this.tableData['sort'] = nextSort;

      this.tableData['page'] = 1;
    } else if (type === 'paginate') {
      this.tableData['paginate'] = Number(
        ((data as Event).target as HTMLInputElement)?.value,
      );

      this.tableData['page'] = 1;
    } else if (type === 'page') {
      this.tableData['page'] = Number(data);
    } else if (type === 'search') {
      this.tableData['search'] = typeof data === 'string' ? data.trim() : '';

      this.tableData['page'] = 1;
    } else if (type === 'daterange') {
      const range = data as TableDateRange | null;

      if (range?.start_date) {
        this.tableData['start_date'] = range.start_date;
      } else {
        delete this.tableData['start_date'];
      }

      if (range?.end_date && !String(range.end_date).includes('undefined')) {
        this.tableData['end_date'] = range.end_date;
      } else {
        delete this.tableData['end_date'];
      }

      this.tableData['page'] = 1;
    }

    this.document.body.classList.add('loader-none');

    this.startLoadTimer();

    this.emitQuery();
  }

  private emitQuery(): void {
    this.lists.rememberQuery(this.tableData);

    this.tableChanged?.emit({
      ...this.tableData,
    });
  }

  /** Whether the list is currently sorted by this column. */
  isSortedBy(column: ITableColumn): boolean {
    return (
      Boolean(column.dataField) && this.tableData['field'] === column.dataField
    );
  }

  //==================================================
  //==== RELOAD AND RESET
  //==================================================

  /** Loads the list again with the same query. */
  reloadTable(): void {
    if (this.toolsCoolingDown) {
      return;
    }

    this.startToolsCooldown();

    this.onChangeTable(null, 'reload');
  }

  /** Clears search, sort, dates, and paging, then loads page 1. */
  resetTable(): void {
    if (this.toolsCoolingDown) {
      return;
    }

    this.startToolsCooldown();

    this.term.setValue('', { emitEvent: false });

    this.fromDate = null;

    this.toDate = null;

    this.tableConfig()?.columns?.forEach((column) => {
      column.sort_direction = this.initialSortDirections.get(column);
    });

    const next: Params = { ...this.tableData };

    delete next['start_date'];

    delete next['end_date'];

    this.tableData = {
      ...next,
      search: '',
      field: '',
      sort: '',
      page: 1,
      paginate: TABLE_PAGE_SIZES[0],
    };

    this.onChangeTable(null, 'reload');
  }

  private startToolsCooldown(): void {
    this.toolsCoolingDown = true;

    if (this.toolsCooldownTimer) {
      clearTimeout(this.toolsCooldownTimer);
    }

    this.toolsCooldownTimer = setTimeout(() => {
      this.toolsCoolingDown = false;

      this.toolsCooldownTimer = null;
    }, this.toolsCooldownMs);
  }

  //==================================================
  //==== LOAD TIMER
  //==================================================

  // From emitting a query until the global loader settles after its request.
  private startLoadTimer(): void {
    if (!this.isBrowser) {
      return;
    }

    this.requestStartedAt = performance.now();

    this.requestLoading = false;
  }

  private stopLoadTimer(): void {
    if (this.requestStartedAt === null || !this.requestLoading) {
      return;
    }

    this.loadSeconds = (performance.now() - this.requestStartedAt) / 1000;

    this.requestStartedAt = null;

    this.requestLoading = false;
  }

  //==================================================
  //==== DATE RANGE
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

  isHovered(date: NgbDate) {
    return (
      this.fromDate &&
      !this.toDate &&
      this.hoveredDate &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate) {
    return this.toDate && date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate) {
    return (
      date.equals(this.fromDate) ||
      (this.toDate && date.equals(this.toDate)) ||
      this.isInside(date) ||
      this.isHovered(date)
    );
  }

  validateInput(currentValue: NgbDate | null, input: string): NgbDate | null {
    const parsed = this.formatter.parse(input);

    return parsed && this.calendar.isValid(NgbDate.from(parsed))
      ? NgbDate.from(parsed)
      : currentValue;
  }

  clearDateRange() {
    this.fromDate = null;

    this.toDate = null;

    this.onChangeTable(null, 'daterange');
  }

  //==================================================
  //==== DISPLAY SETTINGS
  //==================================================

  /** Flips one display setting and keeps it for this admin in this browser. */
  toggleSetting(name: keyof TableViewSettings): void {
    this.settings = { ...this.settings, [name]: !this.settings[name] };

    writeTableViewSettings(this.settingsOwner(), this.settings);
  }

  private settingsOwner(): string | null {
    return this.store.selectSnapshot(AuthState.user)?.id_admin_acct ?? null;
  }
}
