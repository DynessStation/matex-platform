import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, inject, viewChild, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';

import { DeleteModal } from '../../../shared/components/ui/modal/delete-modal/delete-modal';
import { NoData } from '../../../shared/components/ui/no-data/no-data';
import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';
import { ICategory } from '../../../shared/interface/category.interface';
import { IMenu } from '../../../shared/interface/menu.interface';
import { DeleteMenuAction, UpdateSortMenuAction } from '../../../shared/store/action/menu.action';
import { Button } from './../../../shared/components/ui/button/button';

@Component({
  selector: 'app-menu-tree',
  imports: [
    CommonModule,
    NoData,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    RouterModule,
    DeleteModal,
    HasPermissionDirective,
    Button,
  ],
  templateUrl: './menu-tree.html',
  styleUrl: './menu-tree.scss',
})
export class MenuTree {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  readonly type = input<string>(undefined);
  readonly data = input<IMenu[]>(undefined);
  readonly recursionKey = input<string>(undefined);
  readonly displayKey = input<string>('title');
  readonly categoryType = input<string | null>('product');

  public treeSearch = new FormControl('');
  public dataToShow: IMenu[] = [];
  public showChildrenNode: boolean = true;
  public id: number;

  constructor() {
    this.treeSearch.valueChanges.subscribe(data => {
      if (data) {
        this.dataToShow = [];
        this.data().forEach(item => {
          this.hasValue(item) && this.dataToShow.push(item);
        });
      } else {
        this.dataToShow = this.data();
      }
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => (this.id = params['id']));
  }

  onShowChildrenNode(node: IMenu) {
    node['show'] = !node['show'];
  }

  delete(actionType: string, data: ICategory) {
    this.store.dispatch(new DeleteMenuAction(data.id!)).subscribe({
      complete: () => {
        void this.router.navigateByUrl('/menu');
      },
    });
  }

  ngOnChanges() {
    this.dataToShow = this.data();
    this.addKey(this.dataToShow);
  }

  addKey(data: IMenu[]) {
    data.forEach(item => {
      item['show'] = true;
      this.addKey(item.child);
    });
  }

  hasValue(item: IMenu) {
    let valueToReturn = false;
    if (item[this.displayKey()].toLowerCase().includes(this.treeSearch?.value?.toLowerCase())) {
      valueToReturn = true;
    }
    item[this.recursionKey()]?.length &&
      item[this.recursionKey()].forEach((child: IMenu) => {
        if (this.hasValue(child)) {
          valueToReturn = true;
        }
      });
    return valueToReturn;
  }

  drop(event: CdkDragDrop<IMenu[]>, items: IMenu[]) {
    if (event.previousContainer === event.container) {
      moveItemInArray(items, event.previousIndex, event.currentIndex);
      this.updateShortNumbers(items);
    }
  }

  updateShortNumbers(items: any[]) {
    items.forEach((item, index) => {
      item.short = index + 1;
      if (item.subtasks) {
        this.updateShortNumbers(item.subtasks);
      }
    });
  }

  saveChanges() {
    this.filterJson(this.dataToShow);
    this.store.dispatch(new UpdateSortMenuAction({ menus: this.filterJson(this.dataToShow) }));
  }

  filterJson(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item, index) => {
        item['sort'] = index;
        return this.filterJson(item);
      });
    } else if (typeof obj === 'object') {
      const newObj: any = {};
      newObj['id'] = obj['id'];
      newObj['parent_id'] = obj['parent_id'];
      newObj['sort'] = obj['sort'];
      if (Array.isArray(obj['child'])) {
        newObj['child'] = this.filterJson(obj['child']);
      }
      return newObj;
    } else {
      return obj;
    }
  }
}
