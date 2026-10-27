import { Pipe, PipeTransform } from '@angular/core';

import { Category } from '../interface/category.interface';

type SearchRow = { name: string } & Record<string, unknown>;

@Pipe({
  name: 'filter',
  standalone: true,
})
export class SearchFilterPipe implements PipeTransform {
  transform(items: Category[], searchText: string, subDataKey: string): Category[] {
    if (!items || !searchText) {
      return items;
    }
    searchText = searchText.toLowerCase();
    return items.filter(
      (item) =>
        this.searchWithinProperties(item as unknown as SearchRow, searchText) ||
        this.searchWithinSubcategories(item as unknown as SearchRow, searchText, subDataKey),
    );
  }

  private searchWithinProperties(item: { name: string }, searchText: string): boolean {
    return item.name.toLowerCase().includes(searchText);
  }

  private searchWithinSubcategories(
    item: SearchRow,
    searchText: string,
    subDataKey: string,
  ): boolean {
    const children = item[subDataKey];
    if (Array.isArray(children) && children.length > 0) {
      for (const subcategory of children as Record<string, unknown>[]) {
        for (const key in subcategory) {
          if (Object.prototype.hasOwnProperty.call(subcategory, key)) {
            const value = subcategory[key];
            if (typeof value === 'string' && value.toLowerCase().includes(searchText)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
