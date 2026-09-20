import { SlicePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

import { Tag } from '../../../../shared/interface/tag.interface';

@Component({
  selector: 'app-blog-tag',
  imports: [RouterModule, SlicePipe],
  templateUrl: './blog-tag.html',
  styleUrl: './blog-tag.scss',
})
export class BlogTag {
  readonly tags = input<Tag[]>();
}
