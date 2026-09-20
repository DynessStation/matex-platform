import { isPlatformBrowser } from '@angular/common';
import { Component, DOCUMENT, Inject, PLATFORM_ID, Renderer2 } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-theme-customizer',
  imports: [FormsModule],
  templateUrl: './theme-customizer.html',
  styleUrl: './theme-customizer.scss',
})
export class ThemeCustomizer {
  public isBrowser: boolean;

  public layoutDirection: string = 'ltr';
  public mode: boolean = true;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.layoutDirection = localStorage.getItem('dir') || 'ltr';

      this.renderer.setAttribute(
        this.document.documentElement,
        'dir',
        this.layoutDirection === 'rtl' ? 'rtl' : '',
      );

      const savedDark = localStorage.getItem('darkMode');
      this.mode = savedDark === 'dark' ? false : true;

      setTimeout(() => {
        if (!this.mode) {
          this.renderer.addClass(document.body, 'dark');
        } else {
          this.renderer.removeClass(document.body, 'dark');
        }
      }, 0);
    }
  }

  layoutMode() {
    this.mode = !this.mode;
    if (this.mode) {
      this.renderer.removeClass(document.body, 'dark');
      localStorage.setItem('darkMode', 'light');
    } else {
      this.renderer.addClass(document.body, 'dark');
      localStorage.setItem('darkMode', 'dark');
    }
  }

  layoutType() {
    if (!this.isBrowser) return;

    const html = this.document.documentElement;

    if (this.layoutDirection === 'ltr') {
      this.layoutDirection = 'rtl';
      this.renderer.setAttribute(html, 'dir', 'rtl');
      localStorage.setItem('dir', 'rtl');
    } else {
      this.layoutDirection = 'ltr';
      this.renderer.setAttribute(html, 'dir', '');
      localStorage.setItem('dir', 'ltr');
    }
  }
}
