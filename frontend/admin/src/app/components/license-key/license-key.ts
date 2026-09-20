import { Component, inject } from '@angular/core';
import { Params, Router } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { ILicenseKey, ILicenseKeyModel } from '../../shared/interface/license-key.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import {
  DeleteAllLicenseKeyAction,
  DeleteLicenseKeyAction,
  GetLicenseKeysAction,
  UpdateLicenseKeyStatusAction,
} from '../../shared/store/action/license-key.actions';
import { LicenseKeysState } from '../../shared/store/state/license-key.state';

@Component({
  selector: 'app-license-key',
  imports: [PageWrapper, Table],
  templateUrl: './license-key.html',
  styleUrl: './license-key.scss',
})
export class LicenseKey {
  private store = inject(Store);
  router = inject(Router);

  licenseKey$: Observable<ILicenseKeyModel> = inject(Store).select(LicenseKeysState.licenseKey);

  public tableConfig: ITableConfig = {
    columns: [
      { title: 'product', dataField: 'item_name' },
      { title: 'license_key', dataField: 'license_key', sortable: true, sort_direction: 'desc' },
      { title: 'purchased_by', dataField: 'purchased_by.name' },
      {
        title: 'created_at',
        dataField: 'created_at',
        type: 'date',
        sortable: true,
        sort_direction: 'desc',
      },
    ],
    data: [] as ILicenseKey[],
    total: 0,
  };

  ngOnInit() {
    this.licenseKey$.subscribe(licenseKey => {
      this.tableConfig.data = licenseKey ? licenseKey?.data : [];
      this.tableConfig.total = licenseKey ? licenseKey?.total : 0;
    });
  }

  onTableChange(data?: Params) {
    this.store.dispatch(new GetLicenseKeysAction(data));
  }

  onActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.edit(action.data);
    else if (action.actionToPerform == 'status') this.status(action.data);
    else if (action.actionToPerform == 'delete') this.delete(action.data);
    else if (action.actionToPerform == 'deleteAll') this.deleteAll(action.data);
  }

  edit(data: ILicenseKey) {
    void this.router.navigateByUrl(`/license-key/edit/${data.id}`);
  }

  status(data: ILicenseKey) {
    this.store.dispatch(new UpdateLicenseKeyStatusAction(data.id, data.status));
  }

  delete(data: ILicenseKey) {
    this.store.dispatch(new DeleteLicenseKeyAction(data.id));
  }

  deleteAll(ids: number[]) {
    this.store.dispatch(new DeleteAllLicenseKeyAction(ids));
  }
}
