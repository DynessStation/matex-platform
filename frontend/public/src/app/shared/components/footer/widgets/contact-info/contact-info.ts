import { Component, input } from '@angular/core';

import { Option } from '../../../../interface/theme-option.interface';

@Component({
  selector: 'app-contact-info',
  imports: [],
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.scss',
})
export class ContactInfo {
  readonly data = input<Option | null>();
}
