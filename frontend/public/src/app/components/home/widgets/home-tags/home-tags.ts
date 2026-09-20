import { Component, effect, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { Tag, TagModel } from '../../../../shared/interface/tag.interface';
import { TagState } from '../../../../shared/store/state/tag.state';

@Component({
  selector: 'app-home-tags',
  imports: [RouterModule],
  templateUrl: './home-tags.html',
  styleUrl: './home-tags.scss',
})
export class HomeTags {
  tagsIds = input<number[] | null>(null);
  class = input<string>();
  private store = inject(Store);
  tags$: Observable<TagModel> = this.store.select(TagState.tag);

  public tags: Tag[];

  constructor() {
    effect(() => {
      const ids = this.tagsIds();
      if (Array.isArray(ids) && ids.length) {
        this.tags$.subscribe((tags) => {
          this.tags = tags.data.filter((t) => ids.includes(t.id));
        });
      } else {
        this.tags = [];
      }
    });
  }
}
