import { Component, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { TreeNode } from './tree-node/tree-node';
import { NoData } from '../../../shared/components/ui/no-data/no-data';
import { ICategory } from '../../../shared/interface/category.interface';

@Component({
  selector: 'app-tree',
  imports: [
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    TreeNode,
    NoData,
  ],
  templateUrl: './tree.html',
  styleUrl: './tree.scss',
})
export class Tree {
  readonly type = input<string>(undefined);
  readonly data = input<ICategory[]>(undefined);
  readonly recursionKey = input<string>(undefined);
  readonly displayKey = input<string>('name');
  readonly categoryType = input<string | null>('product');

  public treeSearch = new FormControl('');
  public dataToShow: ICategory[] = [];

  constructor() {
    this.treeSearch.valueChanges.subscribe(() => this.applySearch());
  }

  // Reloaded data (after a drag or delete) keeps the search that is still typed.
  ngOnChanges() {
    this.applySearch();
  }

  private applySearch() {
    const all = this.data() ?? [];
    this.dataToShow = this.treeSearch.value
      ? all.filter((item) => this.hasValue(item))
      : all;
  }

  hasValue(item: ICategory) {
    let valueToReturn = false;
    if (
      item[this.displayKey()]
        .toLowerCase()
        .includes(this.treeSearch?.value?.toLowerCase())
    ) {
      valueToReturn = true;
    }
    item[this.recursionKey()]?.length &&
      item[this.recursionKey()].forEach((child: ICategory) => {
        if (this.hasValue(child)) {
          valueToReturn = true;
        }
      });
    return valueToReturn;
  }
}
