import { Component, inject, viewChild, input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Store } from '@ngxs/store';

import { DeleteModal } from '../../../../shared/components/ui/modal/delete-modal/delete-modal';
import { HasPermissionDirective } from '../../../../shared/directive/has-permission.directive';
import { ICategory } from '../../../../shared/interface/category.interface';
import { DeleteCategoryAction } from '../../../../shared/store/action/category.action';

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

  readonly node = input<any>(undefined);
  readonly recursionKey = input<string>(undefined);
  readonly displayKey = input<string>(undefined);
  readonly categoryType = input<string | null>('product');

  readonly DeleteModal = viewChild<DeleteModal>('deleteModal');

  public showChildrenNode: boolean = true;
  public id: number;

  ngOnInit() {
    this.route.params.subscribe(params => (this.id = params['id']));
  }

  delete(actionType: string, data: ICategory) {
    this.store.dispatch(new DeleteCategoryAction(data.id!, data.type)).subscribe({
      complete: () => {
        if (data.type == 'post') void this.router.navigateByUrl('/blog/category');
        else void this.router.navigateByUrl('/category');
      },
    });
  }
}
