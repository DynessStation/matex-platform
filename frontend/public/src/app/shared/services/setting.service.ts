import { Injectable } from '@angular/core';

import { firstValueFrom, Observable, of } from 'rxjs';

import { SITE_SETTINGS } from '../data/settings';
import { GoogleReCaptcha, Setting } from '../interface/setting.interface';

@Injectable({
  providedIn: 'root',
})
export class SettingService {
  reCaptchaConfig: GoogleReCaptcha;

  // Site settings ship with the app (shared/data); a copy keeps the constant unchanged.
  getSettingOption(): Observable<Setting> {
    return of(structuredClone(SITE_SETTINGS) as unknown as Setting);
  }

  async getReCaptchaConfig(): Promise<void> {
    const config = await firstValueFrom(this.getSettingOption());
    this.reCaptchaConfig = config?.values?.google_reCaptcha!;
  }
}
