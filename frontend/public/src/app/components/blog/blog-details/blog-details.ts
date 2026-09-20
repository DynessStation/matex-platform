import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IBlog } from '../../../shared/interface/blog.interface';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { Option } from '../../../shared/interface/theme-option.interface';
import { BlogState } from '../../../shared/store/state/blog.state';
import { ThemeOptionState } from '../../../shared/store/state/theme-option.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-blog-details',
  imports: [Sidebar, HomeNewsletter, AsyncPipe, DatePipe],
  templateUrl: './blog-details.html',
  styleUrl: './blog-details.scss',
})
export class BlogDetails {
  private route = inject(ActivatedRoute);

  blog$: Observable<IBlog> = inject(Store).select(BlogState.selectedBlog) as Observable<IBlog>;
  themeOption$: Observable<Option> = inject(Store).select(
    ThemeOptionState.themeOptions,
  ) as Observable<Option>;

  public breadcrumb: breadcrumb = {
    title: 'Product',
    items: [],
  };
  public open: boolean = false;
  public sidebar: string;

  constructor() {
    this.blog$.subscribe((blog) => {
      this.breadcrumb.items = [];
      this.breadcrumb.title = blog.title;
      this.breadcrumb.items.push(
        { label: 'IBlog', active: true },
        { label: blog.title, active: false },
      );
    });

    // For Demo Purpose only
    this.route.queryParams.subscribe((params) => {
      if (params['sidebar']) {
        this.sidebar = params['sidebar'];
      } else {
        // Get Blog Layout
        this.themeOption$.subscribe((theme) => {
          this.sidebar = theme?.blog.blog_sidebar_type;
        });
      }
    });
  }

  filterOpen() {
    this.open = !this.open;
  }
}
