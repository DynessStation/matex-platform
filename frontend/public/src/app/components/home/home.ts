import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { BabyShop } from './baby-shop/baby-shop';
import { Electro } from './electro/electro';
import { Gadget } from './gadget/gadget';
import { MegaMart } from './mega-mart/mega-mart';
import { OrganicStore } from './organic-store/organic-store';
import { StyleTech } from './style-tech/style-tech';
import { LayoutService } from '../../shared/services/layout.service';
import { ThemeOptionService } from '../../shared/services/theme-option.service';
import { GetHomePage } from '../../shared/store/action/theme.action';
import { ThemeState } from '../../shared/store/state/theme.state';

@Component({
  selector: 'app-home',
  imports: [Gadget, MegaMart, OrganicStore, BabyShop, StyleTech, Electro],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  homePage$: Observable<any> = inject(Store).select(ThemeState.homePage);
  activeTheme$: Observable<string> = inject(Store).select(ThemeState.activeTheme);

  public theme: string;
  public homePage: any;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    public layoutService: LayoutService,
    public themeOptionService: ThemeOptionService,
  ) {
    this.route.queryParams.subscribe((params) => {
      this.themeOptionService.preloader.set(true);
      this.activeTheme$.subscribe((theme) => {
        this.theme = params['theme'] ? params['theme'] : theme;
        if (this.theme) {
          this.store
            .dispatch(new GetHomePage(params['theme'] ? params['theme'] : theme))
            .subscribe((data: any) => {
              this.homePage = data?.theme?.homePage;
              this.themeOptionService.preloader.set(false);
            });
        }
      });
    });
  }
}
