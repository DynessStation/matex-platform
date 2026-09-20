import { Component, inject } from '@angular/core';

import {
  APP_LANGUAGES,
  IAppLanguage,
} from '../../../../config/localization.config';

import { LocalizationService } from '../../../../services/localization.service';

import { Button } from '../../../ui/button/button';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-languages',

  imports: [Button],

  templateUrl: './languages.html',

  styleUrl: './languages.scss',
})
export class Languages {
  //==================================================
  //==== INJECT
  //==================================================

  private localization = inject(LocalizationService);

  //==================================================
  //==== DATA
  //==================================================

  public active = false;

  public languages = APP_LANGUAGES;

  readonly selectedLanguage = this.localization.currentLanguage;

  //==================================================
  //==== SELECT LANGUAGE
  //==================================================

  async selectLanguage(language: IAppLanguage) {
    this.active = false;

    await this.localization.setLanguage(language.code);
  }

  //==================================================
  //==== TOGGLE
  //==================================================

  clickHeaderOnMobile() {
    this.active = !this.active;
  }

  //==================================================
  //==== HIDE DROPDOWN
  //==================================================

  hideDropdown() {
    this.active = false;
  }
}
