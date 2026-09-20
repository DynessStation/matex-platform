import { DOCUMENT } from '@angular/common';
import { Injectable, Renderer2, RendererFactory2, Inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyService {
  private renderer: Renderer2;

  constructor(
    private rendererFactory: RendererFactory2,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  addClass(...classNames: string[]) {
    classNames.forEach((className) => this.renderer.addClass(this.document.body, className));
  }

  removeClass(...classNames: string[]) {
    classNames.forEach((className) => this.renderer.removeClass(this.document.body, className));
  }

  setClasses(classNames: string[]) {
    this.document.body.className = '';
    classNames.forEach((className) => this.renderer.addClass(this.document.body, className));
  }

  setAttr(name: string, value: string) {
    this.renderer.setAttribute(this.document.documentElement, name, value);
  }
}
