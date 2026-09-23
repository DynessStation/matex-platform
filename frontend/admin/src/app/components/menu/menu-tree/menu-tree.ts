import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

import { CommonModule } from '@angular/common';

import { Component, input, output, viewChild } from '@angular/core';

import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { Button } from '../../../shared/components/ui/button/button';

import { DeleteModal } from '../../../shared/components/ui/modal/delete-modal/delete-modal';

import { NoData } from '../../../shared/components/ui/no-data/no-data';

import { HasPermissionDirective } from '../../../shared/directive/has-permission.directive';

import {
  IWebNavigationReorderItem,
  IWebNavigationTreeItem,
} from '../../../shared/interface/web-navigation.interface';

@Component({
  selector: 'app-menu-tree',

  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    TranslateModule,
    DeleteModal,
    NoData,
    HasPermissionDirective,
    Button,
  ],

  templateUrl: './menu-tree.html',

  styleUrl: './menu-tree.scss',
})
export class MenuTree {
  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  readonly data = input<IWebNavigationTreeItem[]>([]);

  readonly deleteItem = output<IWebNavigationTreeItem>();

  readonly editItem = output<IWebNavigationTreeItem>();

  readonly selectedItemId = input<string | null>(null);

  readonly reorderItems = output<IWebNavigationReorderItem[]>();

  readonly treeSearch = new FormControl('', {
    nonNullable: true,
  });

  treeData: IWebNavigationTreeItem[] = [];

  dataToShow: IWebNavigationTreeItem[] = [];

  constructor() {
    this.treeSearch.valueChanges.subscribe((value) => {
      this.applySearch(value);
    });
  }

  ngOnChanges(): void {
    this.treeData = this.cloneItems(this.data());

    this.applySearch(this.treeSearch.value);
  }

  onShowChildrenNode(node: IWebNavigationTreeItem): void {
    node.show = !node.show;
  }

  confirmDelete(item: IWebNavigationTreeItem): void {
    this.DeleteModal()?.openModal('delete', item);
  }

  delete(actionType: string, item: IWebNavigationTreeItem): void {
    if (actionType !== 'delete') {
      return;
    }

    this.deleteItem.emit(item);
  }

  edit(item: IWebNavigationTreeItem): void {
    this.editItem.emit(item);
  }

  drop(
    event: CdkDragDrop<IWebNavigationTreeItem[]>,
    items: IWebNavigationTreeItem[],
  ): void {
    if (
      this.treeSearch.value.trim() ||
      event.previousContainer !== event.container
    ) {
      return;
    }

    moveItemInArray(items, event.previousIndex, event.currentIndex);

    this.normalizeSortOrder(this.treeData);

    this.dataToShow = this.treeData;
  }

  saveChanges(): void {
    if (this.treeSearch.value.trim()) {
      return;
    }

    this.normalizeSortOrder(this.treeData);

    this.reorderItems.emit(this.buildReorderPayload(this.treeData));
  }

  private applySearch(value: string): void {
    const query = value.trim().toLowerCase();

    if (!query) {
      this.dataToShow = this.treeData;

      return;
    }

    this.dataToShow = this.filterItems(this.treeData, query);
  }

  private filterItems(
    items: IWebNavigationTreeItem[],
    query: string,
  ): IWebNavigationTreeItem[] {
    const result: IWebNavigationTreeItem[] = [];

    for (const item of items) {
      const children = this.filterItems(item.child, query);

      const matches =
        item.title.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query);

      if (matches || children.length) {
        result.push({
          ...item,

          child: children,

          show: true,
        });
      }
    }

    return result;
  }

  private cloneItems(
    items: IWebNavigationTreeItem[],
  ): IWebNavigationTreeItem[] {
    return items.map((item) => ({
      ...item,

      child: this.cloneItems(item.child),

      show: true,
    }));
  }

  private normalizeSortOrder(items: IWebNavigationTreeItem[]): void {
    items.forEach((item, index) => {
      item.sort_order = index;

      this.normalizeSortOrder(item.child);
    });
  }

  private buildReorderPayload(
    items: IWebNavigationTreeItem[],
    parentId: string | null = null,
    result: IWebNavigationReorderItem[] = [],
  ): IWebNavigationReorderItem[] {
    items.forEach((item, index) => {
      result.push({
        id_web_navigation_item: item.id_web_navigation_item,

        id_parent_web_navigation_item: parentId,

        sort_order: index,
      });

      this.buildReorderPayload(item.child, item.id_web_navigation_item, result);
    });

    return result;
  }
}
