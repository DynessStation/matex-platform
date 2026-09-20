import { Component, inject } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IValues } from '../../../../interface/setting.interface';
import { SettingState } from '../../../../store/state/setting.state';

@Component({
  selector: 'app-mode',
  imports: [],
  templateUrl: './mode.html',
  styleUrl: './mode.scss',
})
export class Mode {
  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public mode: boolean;

  constructor() {
    this.setting$.subscribe(
      res => (this.mode = res && res.general && res.general.mode === 'dark-only' ? true : false),
    );
  }

  customizeLayoutDark() {
    this.mode = !this.mode;
    document.body.classList.toggle('dark-only');
  }
}
