import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  public headerCategoryCanvas = false;
  public headerCategoryCanvasToggle = false;
  public offCanvasFilterMenu: boolean = false;
  constructor() {}
}
