import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-loader',
  imports: [TranslateModule],
  templateUrl: './loader.html',
  styleUrl: './loader.scss',
})
export class Loader {
  loaderClass = input<string>('loader-wrapper');
}
