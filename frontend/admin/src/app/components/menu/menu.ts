import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { FormMenu } from './form-menu/form-menu';
import { MenuTree } from './menu-tree/menu-tree';
import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { IMenuModel } from '../../shared/interface/menu.interface';
import { GetMenuAction } from '../../shared/store/action/menu.action';
import { MenuState } from '../../shared/store/state/menu.state';

@Component({
  selector: 'app-menu',
  imports: [
    CommonModule,
    MenuTree,
    PageWrapper,
    TranslateModule,
    FormMenu,
    DragDropModule,
    NgbDropdownModule,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  private store = inject(Store);
  private router = inject(Router);

  readonly type = input<string>('create');

  menu$: Observable<IMenuModel> = inject(Store).select(MenuState.menu);

  constructor() {
    this.store.dispatch(new GetMenuAction());
  }

  create() {
    void this.router.navigateByUrl('/menu');
  }
}
