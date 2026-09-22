import { Component, computed, input } from '@angular/core';
import { IPublicCmsPage } from '../../shared/interface/cms-page.interface';

@Component({
  selector: 'app-cms-home',
  templateUrl: './cms-home.html',
  styleUrl: './cms-home.scss',
})
export class CmsHome {
  readonly page = input.required<IPublicCmsPage>();

  readonly hero = computed(() =>
    this.page().attachments.find((attachment) => attachment.role === 'hero'),
  );
}
