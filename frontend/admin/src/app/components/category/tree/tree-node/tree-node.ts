import { Component, inject, viewChild, input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';

import { DeleteModal } from '../../../../shared/components/ui/modal/delete-modal/delete-modal';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { ICategory } from '../../../../shared/interface/category.interface';
import {
  DeleteCategoryAction,
  GetCategoriesAction,
  ReorderCategoriesAction,
} from '../../../../shared/store/action/category.action';

@Component({
  selector: 'app-tree-node',
  imports: [RouterModule, HasPermissionDirective, DeleteModal],
  templateUrl: './tree-node.html',
  styleUrl: './tree-node.scss',
})
export class TreeNode {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly node = input<ICategory>(undefined);
  readonly siblings = input<ICategory[]>([]);
  readonly reorderDisabled = input(false);
  readonly recursionKey = input<string>(undefined);
  readonly displayKey = input<string>(undefined);
  readonly categoryType = input<string | null>('product');

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  public showChildrenNode: boolean = true;
  public id: string;
  public dragOver = false;
  public savingOrder = false;

  private field(key: string): unknown {
    return (this.node() as unknown as Record<string, unknown>)[key];
  }

  get children(): ICategory[] {
    const children = this.field(this.recursionKey());
    return Array.isArray(children) ? (children as ICategory[]) : [];
  }

  get label(): string {
    return String(this.field(this.displayKey()) || this.node()?.name || '');
  }

  ngOnInit() {
    this.route.params.subscribe((params) => (this.id = params['id']));
  }

  // The delete modal hands back the category it was opened with.
  delete(actionType: string, row: unknown) {
    const data = row as ICategory;
    this.store
      .dispatch(new DeleteCategoryAction(data.id!, data.type))
      .subscribe({
        complete: () => {
          this.store.dispatch(new GetCategoriesAction({ type: 'product' }));
          if (this.id) void this.router.navigateByUrl('/category');
        },
      });
  }

  startDrag(event: DragEvent) {
    if (!event.dataTransfer || this.savingOrder || this.reorderDisabled())
      return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/category-id', String(this.node().id));
  }

  allowDrop(event: DragEvent) {
    if (
      this.reorderDisabled() ||
      !event.dataTransfer?.types.includes('text/category-id')
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    this.dragOver = true;
  }

  leaveDrop() {
    this.dragOver = false;
  }

  dropBefore(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    const sourceId = event.dataTransfer?.getData('text/category-id');
    const siblings = this.siblings();
    const from = siblings.findIndex((item) => String(item.id) === sourceId);
    const to = siblings.findIndex((item) => item.id === this.node().id);
    if (
      from < 0 ||
      to < 0 ||
      from === to ||
      this.savingOrder ||
      this.reorderDisabled()
    )
      return;

    const [moved] = siblings.splice(from, 1);
    siblings.splice(to, 0, moved);
    siblings.forEach((item, index) => (item.sort_order = index));
    this.savingOrder = true;
    this.store
      .dispatch(
        new ReorderCategoriesAction(
          siblings.map((item) => ({
            id: String(item.id),
            sort_order: item.sort_order,
          })),
        ),
      )
      .subscribe({
        complete: () => {
          this.savingOrder = false;
          this.store.dispatch(
            new GetCategoriesAction({ type: this.categoryType() }),
          );
        },
        error: () => {
          this.savingOrder = false;
          this.store.dispatch(
            new GetCategoriesAction({ type: this.categoryType() }),
          );
        },
      });
  }
}
