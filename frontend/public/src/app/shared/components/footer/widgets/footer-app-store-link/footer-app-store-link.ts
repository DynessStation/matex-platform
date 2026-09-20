import { Component, input } from '@angular/core';

import { Option } from '../../../../interface/theme-option.interface';

@Component({
  selector: 'app-footer-app-store-link',
  imports: [],
  templateUrl: './footer-app-store-link.html',
  styleUrl: './footer-app-store-link.scss',
})
export class FooterAppStoreLink {
  readonly data = input<Option | null>();
}
