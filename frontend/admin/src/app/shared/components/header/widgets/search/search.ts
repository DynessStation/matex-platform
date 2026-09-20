import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Output,
  Renderer2,
  inject,
  viewChild,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';

import { RouterModule } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Store } from '@ngxs/store';

import { combineLatest } from 'rxjs';

import { menu } from '../../../../data/menu';

import { ISidebar } from '../../../../interface/sidebar.interface';

import { NavService } from '../../../../services/nav.service';

import { AuthState } from '../../../../store/state/auth.state';

import { filterSidebarByPermission } from '../../../../utils/sidebar-permission.util';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-search',

  imports: [TranslateModule, RouterModule, FormsModule],

  templateUrl: './search.html',

  styleUrl: './search.scss',
})
export class Search {
  //==================================================
  //==== INJECT
  //==================================================

  navServices = inject(NavService);

  private renderer = inject(Renderer2);

  private store = inject(Store);

  private translate = inject(TranslateService);

  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== OUTPUT
  //==================================================

  @Output()
  searchChange = new EventEmitter<string>();

  //==================================================
  //==== DATA
  //==================================================

  public menuItems: ISidebar[] = [];

  public items: ISidebar[] = [];

  public searchResult = false;

  public searchResultEmpty = false;

  public text = '';

  public open = false;

  //==================================================
  //==== VIEW CHILD
  //==================================================

  readonly toggleButton = viewChild<ElementRef>('toggleButton');

  readonly menu = viewChild<ElementRef>('menu');

  readonly dropdownContainer = viewChild<ElementRef>('dropdownContainer');

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    combineLatest([
      this.store.select(AuthState.permissions),

      this.store.select(AuthState.isAllAccess),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([permissions, isAllAccess]) => {
        this.items = filterSidebarByPermission(
          menu,
          permissions ?? [],
          isAllAccess === true,
        );

        //==================================================
        //==== REFRESH SEARCH
        //==================================================

        if (this.text) {
          this.searchTerm(this.text);
        }
      });
  }

  //==================================================
  //==== CLOSE SEARCH
  //==================================================

  closeSearch() {
    this.navServices.search = false;
  }

  //==================================================
  //==== SIDEBAR SEARCH
  //==================================================

  onSearch(value: string) {
    this.searchChange.emit(value);
  }

  //==================================================
  //==== OPEN DROPDOWN
  //==================================================

  openDropDown(text: string) {
    if (text) {
      this.searchResult = !this.searchResult;
    }

    document.getElementsByTagName('body')[0].classList.toggle('overlay-search');
  }

  //==================================================
  //==== SEARCH TERM
  //==================================================

  searchTerm(term?: string) {
    if (!term?.trim()) {
      this.removeFix();

      this.menuItems = [];

      this.searchResultEmpty = false;

      return this.menuItems;
    }

    //==================================================
    //==== SEARCH
    //==================================================

    this.addFix();

    const normalized = term.toLowerCase().trim();

    const items: ISidebar[] = [];

    this.collectSearchItems(this.items, normalized, items);

    this.menuItems = items;

    this.checkSearchResultEmpty(items);

    return this.menuItems;
  }

  //==================================================
  //==== COLLECT SEARCH ITEMS
  //==================================================

  private collectSearchItems(
    menus: ISidebar[],
    term: string,
    result: ISidebar[],
    parentIcon?: string,
  ): void {
    for (const item of menus) {
      const title = item.title ?? '';

      const translatedTitle = String(this.translate.instant(title));

      //==================================================
      //==== LINK
      //==================================================

      if (
        item.path &&
        (title.toLowerCase().includes(term) ||
          translatedTitle.toLowerCase().includes(term))
      ) {
        result.push({
          ...item,

          icon: item.icon ?? parentIcon,
        });
      }

      //==================================================
      //==== CHILDREN
      //==================================================

      if (item.children?.length) {
        this.collectSearchItems(
          item.children,
          term,
          result,
          item.icon ?? parentIcon,
        );
      }
    }
  }

  //==================================================
  //==== SEARCH EMPTY
  //==================================================

  checkSearchResultEmpty(items: ISidebar[]) {
    this.searchResultEmpty = !items.length;
  }

  //==================================================
  //==== ADD FIX
  //==================================================

  addFix() {
    this.searchResult = true;

    document.getElementsByTagName('body')[0].classList.add('overlay-search');
  }

  //==================================================
  //==== REMOVE FIX
  //==================================================

  removeFix() {
    this.searchResult = false;

    this.text = '';

    document.getElementsByTagName('body')[0].classList.remove('overlay-search');
  }

  //==================================================
  //==== CLICK OUTSIDE
  //==================================================

  clickOutside(): void {
    this.searchResult = false;
  }
}
