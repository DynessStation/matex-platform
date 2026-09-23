import { Component, computed, input } from '@angular/core';
import { IPublicCmsPage } from '../../shared/interface/cms-page.interface';

@Component({
  selector: 'app-cms-home',
  templateUrl: './cms-home.html',
  styleUrl: './cms-home.scss',
})
export class CmsHome {
  readonly page = input.required<IPublicCmsPage>();

  readonly mainBanner = computed(() => this.attachment('home_main') ?? this.attachment('hero'));
  readonly sideBanner1 = computed(() => this.attachment('home_side_1'));
  readonly sideBanner2 = computed(() => this.attachment('home_side_2'));
  readonly hasSideBanners = computed(() => Boolean(this.sideBanner1() || this.sideBanner2()));
  readonly tiles = computed(() =>
    ['home_tile_1', 'home_tile_2', 'home_tile_3', 'home_tile_4']
      .map((role) => this.attachment(role))
      .filter((attachment) => attachment !== undefined),
  );

  private attachment(role: string) {
    return this.page().attachments.find((attachment) => attachment.role === role);
  }
}
