import { ViewportScroller } from '@angular/common';
import { Component, DOCUMENT, HostListener, Inject, inject } from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  templateUrl: './back-to-top.html',
  styleUrl: './back-to-top.scss',
})
export class BackToTop {
  public show: boolean = false;
  public scrollPercent = 0;

  private viewScroller = inject(ViewportScroller);

  constructor(@Inject(DOCUMENT) private document: Document) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop =
      window.pageYOffset ||
      this.document.documentElement.scrollTop ||
      this.document.body.scrollTop ||
      0;

    const scrollHeight =
      this.document.documentElement.scrollHeight - this.document.documentElement.clientHeight;

    this.scrollPercent = (scrollTop / scrollHeight) * 100;

    this.show = scrollTop > 400;
  }

  backToTop() {
    this.viewScroller.scrollToPosition([0, 0]);
  }
}
