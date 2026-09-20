import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BannerLink } from '../../../../shared/interface/core.interface';

@Component({
  selector: 'app-home-banner',
  imports: [RouterLink],
  templateUrl: './home-banner.html',
  styleUrl: './home-banner.scss',
})
export class HomeBanner {
  image = input<BannerLink>();
  className = input<string | null>(null);
  bgImage = input<boolean>(false);
  imageClass = input<string | null>('img-fluid');
}
