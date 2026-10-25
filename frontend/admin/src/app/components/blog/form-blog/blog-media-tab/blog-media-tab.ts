import { Component, inject } from '@angular/core';

import { ImageUpload } from '../../../../shared/components/ui/image-upload/image-upload';
import { BlogFormService } from '../blog-form.service';

// Media tab (thumbnail, share image) of the article form.
// Shared state lives in BlogFormService.
@Component({
  selector: 'app-blog-media-tab',

  imports: [ImageUpload],

  templateUrl: './blog-media-tab.html',

  // Shared with the other tabs (see FormBlog).
  styleUrl: '../form-blog.scss',
})
export class BlogMediaTab {
  readonly editor = inject(BlogFormService);

  readonly form = this.editor.form;
}
