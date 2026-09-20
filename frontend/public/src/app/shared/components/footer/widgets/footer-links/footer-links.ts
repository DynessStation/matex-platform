import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { CustomDropdown } from '../../../../interface/theme-option.interface';

@Component({
  selector: 'app-footer-links',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer-links.html',
  styleUrls: ['./footer-links.scss'],
})
export class FooterLinks {
  section = input<CustomDropdown[]>();
}
