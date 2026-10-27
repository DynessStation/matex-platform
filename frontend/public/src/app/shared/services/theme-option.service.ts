import { Injectable, signal } from '@angular/core';

import { Observable, of } from 'rxjs';

import { THEME_OPTIONS } from '../data/theme-options';
import { ThemeOption } from '../interface/theme-option.interface';

@Injectable({
  providedIn: 'root',
})
export class ThemeOptionService {
  preloader = signal(true);

  public theme_color: string;
  public theme_color_2: string;
  public theme_color_class: string;
  public footer_height: number;
  public newsletterModal: boolean = false;
  public productBox: string;

  // Site options ship with the app (shared/data); a copy keeps the constant unchanged.
  getThemeOption(): Observable<ThemeOption> {
    return of(structuredClone(THEME_OPTIONS) as unknown as ThemeOption);
  }
}
