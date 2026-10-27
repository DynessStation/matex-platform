import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { APP_VERSION } from '../../shared/data/app-version';
import { CHANGELOG } from '../../shared/data/changelog';

/** /changelog: what changed per version, readable without signing in (the link is shared). */
@Component({
  selector: 'app-changelog',
  imports: [RouterLink],
  templateUrl: './changelog.html',
})
export class Changelog {
  readonly version = APP_VERSION;
  readonly entries = CHANGELOG;

  constructor() {
    inject(Title).setTitle(`Catatan Perubahan MATEX v${APP_VERSION}`);
  }
}
