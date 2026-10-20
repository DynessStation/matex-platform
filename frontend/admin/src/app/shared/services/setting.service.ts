import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

import { APP_SETTINGS } from '../data/settings';
import { IGoogleReCaptcha, ISetting } from '../interface/setting.interface';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  reCaptchaConfig: IGoogleReCaptcha;

  // The settings ship with the app (shared/data); a copy keeps the constant unchanged.
  getSettingOption(): Observable<ISetting> {
    return of(structuredClone(APP_SETTINGS) as unknown as ISetting);
  }
}
