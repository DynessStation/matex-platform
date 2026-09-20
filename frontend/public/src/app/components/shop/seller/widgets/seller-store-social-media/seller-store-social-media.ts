import { Component, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { IStores } from '../../../../../shared/interface/store.interface';

@Component({
  selector: 'app-seller-store-social-media',
  imports: [TranslateModule],
  templateUrl: './seller-store-social-media.html',
  styleUrl: './seller-store-social-media.scss',
})
export class SellerStoreSocialMedia {
  readonly store = input<IStores>();
}
