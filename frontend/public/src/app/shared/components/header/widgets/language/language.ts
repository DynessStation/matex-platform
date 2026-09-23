import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { ClickOutsideDirective } from '../../../../directive/out-side-directive';
import { ILanguages } from '../../../../interface/theme-option.interface';

@Component({
  selector: 'app-language',
  imports: [ClickOutsideDirective],
  templateUrl: './language.html',
  styleUrl: './language.scss',
})
export class Language {
  private translate = inject(TranslateService);
  private platformId = inject<Object>(PLATFORM_ID);

  public active: boolean = false;
  public languages: ILanguages[] = [
    {
      language: 'English',
      code: 'en',
      icon: 'assets/images/country/us.svg',
    },
    {
      language: 'Français',
      code: 'fr',
      icon: 'assets/images/country/fr.svg',
    }, // Add More Language
  ];

  public selectedLanguage: ILanguages = {
    language: 'English',
    code: 'en',
    icon: 'assets/images/country/us.svg',
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      let language = localStorage.getItem('language');

      if (language == null) {
        localStorage.setItem('language', JSON.stringify(this.selectedLanguage));
        this.translate.use(this.selectedLanguage.code);
      } else {
        this.selectedLanguage = JSON.parse(language);
        this.translate.use(this.selectedLanguage.code);
      }
    }
  }

  openDropDown() {
    this.active = !this.active;
  }

  hideDropdown() {
    this.active = false;
  }

  selectLanguage(language: ILanguages) {
    this.active = false;
    this.translate.use(language.code);
    this.selectedLanguage = language;
    localStorage.setItem('language', JSON.stringify(this.selectedLanguage));
  }
}
