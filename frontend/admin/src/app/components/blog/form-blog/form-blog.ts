import { Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { BlogAssistantService } from './blog-assistant.service';
import { BlogContentTab } from './blog-content-tab/blog-content-tab';
import { BlogFormService } from './blog-form.service';
import { BlogGeneralTab } from './blog-general-tab/blog-general-tab';
import { BlogMediaTab } from './blog-media-tab/blog-media-tab';
import { BlogPublicationTab } from './blog-publication-tab/blog-publication-tab';
import { BlogSeoTab } from './blog-seo-tab/blog-seo-tab';

@Component({
  selector: 'app-form-blog',
  imports: [
    ReactiveFormsModule,
    NgbModule,
    BlogGeneralTab,
    BlogContentTab,
    BlogSeoTab,
    BlogMediaTab,
    BlogPublicationTab,
  ],
  templateUrl: './form-blog.html',
  // Kept as component styles, used by every tab: they override base elements and use
  // nested selectors, so a move to the global layer changes the cascade (standar-kode
  // 4.3). They move with the other base overrides in 6D.
  styleUrl: './form-blog.scss',
  providers: [BlogFormService, BlogAssistantService],
})
export class FormBlog implements OnInit, OnDestroy {
  readonly editor = inject(BlogFormService);
  readonly type = input<'create' | 'edit'>('create');

  constructor() {
    this.editor.connect({ type: this.type });
  }

  ngOnInit() {
    this.editor.init();
  }

  ngOnDestroy() {
    this.editor.destroy();
  }
}
