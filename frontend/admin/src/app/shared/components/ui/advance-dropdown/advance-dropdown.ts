import { Component, ElementRef, viewChild, output, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import { ICategory } from 'src/app/shared/interface/category.interface';
import { IMenu } from 'src/app/shared/interface/menu.interface';

import { DropdownList } from './dropdown-list/dropdown-list';

@Component({
  selector: 'app-advance-dropdown',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, DropdownList],
  templateUrl: './advance-dropdown.html',
  styleUrl: './advance-dropdown.scss',
})
export class AdvanceDropdown {
  readonly dropdownContainer = viewChild<ElementRef>('dropdownContainer');
  readonly toggleButton = viewChild<ElementRef>('toggleButton');
  readonly items = viewChild<ElementRef>('items');

  readonly selectSingle = input<boolean>(false);
  readonly displayKey = input<string>('name');
  readonly subArrayKey = input<string>(undefined);
  readonly options = input<any[]>(undefined);
  readonly selectedOption = input<Number[]>(undefined);
  readonly position = input<string>('bottom');
  readonly text = input<string>('select_option');
  readonly showImage = input<boolean>(true);

  readonly selectedItem = output<any>();

  public isOpen = false;
  public optionsData: any[] = [];
  public selectedPills: any[] = [];
  public selectedIds: number[] = [];
  public breadCrumbValues: any[] = [];
  public term = new FormControl('');
  public parent: number[] = [];

  constructor() {
    this.term.valueChanges.subscribe((data: any) => {
      if (data) {
        this.optionsData = [];
        this.options().forEach(item => {
          this.hasValue(item) && this.optionsData.push(item);
        });
      } else {
        this.optionsData = this.options();
      }
    });
  }

  ngOnChanges() {
    this.optionsData = this.options();
    this.selectedPills = [];
    this.selectedIds = [];
    const selectedOption = this.selectedOption();
    if (selectedOption?.length) {
      this.getSelectedData(selectedOption);
    } else {
      this.selectedPills = [];
      this.selectedIds = [];
    }
    this.optionsData.map(categories => this.getParentIds(categories));
  }

  getParentIds(data: ICategory) {
    data.subcategories &&
      data.subcategories.map((sub_data: ICategory) => {
        let id = this.selectedIds.includes(sub_data.id) ? data.id : null;
        id && this.parent.push(id);
        this.getParentIds(sub_data);
      });
  }

  getSelectedData(value: any) {
    this.options().forEach(item => {
      this.recursiveSelected(
        item,
        value.map(function (x: any) {
          return parseInt(x);
        }),
      );
    });
  }

  recursiveSelected(item: IMenu, value: any) {
    if (item.id && value.includes(item.id)) {
      this.onSelect(item);
    }
    if (item[this.subArrayKey()]?.length) {
      item[this.subArrayKey()].forEach((child: IMenu) => {
        this.recursiveSelected(child, value);
      });
    }
  }

  hasValue(item: IMenu) {
    let valueToReturn = false;
    if (item[this.displayKey()].toLowerCase().includes(this.term?.value?.toLowerCase())) {
      valueToReturn = true;
    }
    item[this.subArrayKey()]?.length &&
      item[this.subArrayKey()].forEach((child: IMenu) => {
        if (this.hasValue(child)) {
          valueToReturn = true;
        }
      });
    return valueToReturn;
  }

  toggleDropdown(_event: Event) {
    this.isOpen = !this.isOpen;
    let selector = this.dropdownContainer().nativeElement.querySelector('.dropdown-open');
    if (this.position() == 'bottom') {
      selector.style.bottom = 'auto';
      selector.style.top = '100%';
    } else {
      selector.style.bottom = '100%';
      selector.style.top = 'auto';
    }
  }

  onSelect(data: any) {
    if (this.selectSingle()) {
      this.selectedPills = [];
      this.selectedIds = [];
      this.selectedPills.push(data);
      this.selectedIds.push(data.id);
    } else if (this.selectedPills.indexOf(data) < 0) {
      this.selectedPills.push(data);
      this.selectedIds.push(data.id);
    } else {
      if (!data.selected) {
        this.removeItem(data);
      }
    }

    this.selectedItem.emit(this.selectedIds);
  }

  removeItem(data: any) {
    this.selectedPills.splice(this.selectedPills.indexOf(data), 1);
    this.selectedIds.splice(this.selectedIds.indexOf(data.id), 1);
    this.selectedItem.emit(this.selectedIds);
  }

  subItemClicked(data: any) {
    this.isOpen = true;
    data[this.subArrayKey()]?.length && this.breadCrumbValues.push(data);
    data[this.subArrayKey()]?.length && (this.optionsData = data[this.subArrayKey()]);
  }

  changeTo(data: any) {
    const subArrayKey = this.subArrayKey();
    if (subArrayKey) {
      this.optionsData = data[subArrayKey];
      this.breadCrumbValues.splice(
        this.breadCrumbValues.indexOf(data) + 1,
        this.breadCrumbValues.length - this.breadCrumbValues.indexOf(data),
      );
    }
  }

  clearOptions() {
    this.optionsData = this.options();
    this.breadCrumbValues = [];
  }

  clickOutside(): void {
    this.isOpen = false;
  }
}
