import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { APP_VERSION } from '../../data/app-version';
import { IValues } from '../../interface/setting.interface';
import { SessionService } from '../../services/session.service';
import { SettingState } from '../../store/state/setting.state';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  setting$: Observable<IValues> = inject(Store).select(
    SettingState.setting,
  ) as Observable<IValues>;
  private sessionService = inject(SessionService);

  remainingTime$ = this.sessionService.remainingTime$;

  readonly version = APP_VERSION;
}
