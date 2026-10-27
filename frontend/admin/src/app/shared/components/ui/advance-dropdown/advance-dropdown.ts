import { Component, ElementRef, viewChild, output, input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

import {
  DropdownOption,
  DropdownOptionId,
  optionChildren,
  optionLabel,
} from './advance-dropdown.model';
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
  readonly options = input<DropdownOption[]>(undefined);
  readonly selectedOption = input<DropdownOptionId[]>(undefined);
  readonly position = input<string>('bottom');
  readonly text = input<string>('select_option');
  readonly showImage = input<boolean>(true);

  readonly selectedItem = output<DropdownOptionId[]>();

  public isOpen = false;
  public optionsData: DropdownOption[] = [];
  public selectedPills: DropdownOption[] = [];
  public selectedIds: DropdownOptionId[] = [];
  public breadCrumbValues: DropdownOption[] = [];
  public term = new FormControl('');
  public parent: DropdownOptionId[] = [];

  constructor() {
    this.term.valueChanges.subscribe((data) => {
      if (data) {
        this.optionsData = [];
        this.options().forEach((item) => {
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
    this.optionsData?.map((option) => this.getParentIds(option));
  }

  label(option: DropdownOption): string {
    return optionLabel(option, this.displayKey());
  }

  getParentIds(data: DropdownOption) {
    optionChildren(data, this.subArrayKey()).map((child) => {
      const id = this.selectedIds.includes(child.id) ? data.id : null;
      id && this.parent.push(id);
      this.getParentIds(child);
    });
  }

  getSelectedData(value: DropdownOptionId[]) {
    this.options().forEach((item) => {
      this.recursiveSelected(item, value);
    });
  }

  recursiveSelected(item: DropdownOption, value: DropdownOptionId[]) {
    if (item.id && value.includes(item.id)) {
      this.onSelect(item);
    }
    optionChildren(item, this.subArrayKey()).forEach((child) => {
      this.recursiveSelected(child, value);
    });
  }

  hasValue(item: DropdownOption) {
    let valueToReturn = false;
    if (
      this.label(item).toLowerCase().includes(this.term?.value?.toLowerCase())
    ) {
      valueToReturn = true;
    }
    optionChildren(item, this.subArrayKey()).forEach((child) => {
      if (this.hasValue(child)) {
        valueToReturn = true;
      }
    });
    return valueToReturn;
  }

  toggleDropdown(_event: Event) {
    this.isOpen = !this.isOpen;
    const selector =
      this.dropdownContainer().nativeElement.querySelector('.dropdown-open');
    if (this.position() == 'bottom') {
      selector.style.bottom = 'auto';
      selector.style.top = '100%';
    } else {
      selector.style.bottom = '100%';
      selector.style.top = 'auto';
    }
  }

  onSelect(data: DropdownOption) {
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

  removeItem(data: DropdownOption) {
    this.selectedPills.splice(this.selectedPills.indexOf(data), 1);
    this.selectedIds.splice(this.selectedIds.indexOf(data.id), 1);
    this.selectedItem.emit(this.selectedIds);
  }

  subItemClicked(data: DropdownOption) {
    this.isOpen = true;
    const children = optionChildren(data, this.subArrayKey());
    if (children.length) {
      this.breadCrumbValues.push(data);
      this.optionsData = children;
    }
  }

  changeTo(data: DropdownOption) {
    if (this.subArrayKey()) {
      this.optionsData = optionChildren(data, this.subArrayKey());
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
