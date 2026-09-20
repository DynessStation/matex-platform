import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Values } from '../../../shared/interface/setting.interface';
import { GetSettingOption } from '../../../shared/store/action/setting.action';
import { SettingState } from '../../../shared/store/state/setting.state';

@Component({
  selector: 'app-maintenance',
  imports: [RouterModule, AsyncPipe],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.scss',
})
export class Maintenance {
  private store = inject(Store);

  setting$: Observable<Values> = inject(Store).select(SettingState.setting) as Observable<Values>;

  constructor() {
    this.store.dispatch(new GetSettingOption());
  }
}
