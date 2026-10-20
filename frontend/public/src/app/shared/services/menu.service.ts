import { Injectable } from '@angular/core';

// Open/closed state of the header menu, side navigation, and search.
@Injectable({
  providedIn: 'root',
})
export class MenuService {
  public skeletonLoader: boolean = false;
  public mainMenuToggle: boolean = false;
  public sideNavToggle: boolean = false;
  public isOpenSearch: boolean = false;
}
