import { Component, TemplateRef, inject, viewChild, input } from '@angular/core';

import { ModalDismissReasons, NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { NgxDropzoneChangeEvent, NgxDropzoneModule } from 'ngx-dropzone';

import { ImportAttributeAction } from '../../../../store/action/attribute.action';
import { ImportCategoryAction } from '../../../../store/action/category.action';
import { ImportProductAction } from '../../../../store/action/product.action';
import { ImportTagAction } from '../../../../store/action/tag.action';
import { ImportUserAction } from '../../../../store/action/user.action';
import { Button } from '../../button/button';

@Component({
  selector: 'app-import-csv-modal',
  imports: [TranslateModule, NgxDropzoneModule, NgbModule, Button],
  templateUrl: './import-csv-modal.html',
  styleUrl: './import-csv-modal.scss',
})
export class ImportCsvModal {
  private store = inject(Store);
  private modalService = inject(NgbModal);

  public active = 'upload';
  public closeResult: string;
  public modalOpen: boolean = false;

  public files: File[] = [];

  readonly module = input<string>(undefined);
  readonly note = input<string>(undefined);

  readonly CSVModal = viewChild<TemplateRef<string>>('csvModal');

  async openModal() {
    this.modalOpen = true;
    this.modalService
      .open(this.CSVModal(), {
        ariaLabelledBy: 'Media-Modal',
        centered: true,
        windowClass: 'theme-modal modal-xl media-modal',
      })
      .result.then(
        result => {
          `Result ${result}`;
          this.closeResult = `Closed with: ${result}`;
        },
        reason => {
          this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        },
      );
  }

  private getDismissReason(reason: ModalDismissReasons): string {
    this.active = 'upload';
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }

  onSelect(event: NgxDropzoneChangeEvent) {
    this.files.push(...event.addedFiles);
  }

  onRemove(event: File) {
    this.files.splice(this.files.indexOf(event), 1);
  }

  upload() {
    const module = this.module();
    if (this.files.length && module) {
      let action = new ImportUserAction(this.files);
      if (module == 'user') {
        action = new ImportUserAction(this.files);
      } else if (module == 'product') {
        action = new ImportProductAction(this.files);
      } else if (module == 'attribute') {
        action = new ImportAttributeAction(this.files);
      } else if (module == 'category') {
        action = new ImportCategoryAction(this.files);
      } else if (module == 'tag') {
        action = new ImportTagAction(this.files);
      }
      this.store.dispatch(action).subscribe({
        complete: () => {
          this.files = [];
          this.modalService.dismissAll();
        },
      });
    }
  }

  ngOnDestroy() {
    if (this.modalOpen) {
      this.modalService.dismissAll();
    }
  }
}
