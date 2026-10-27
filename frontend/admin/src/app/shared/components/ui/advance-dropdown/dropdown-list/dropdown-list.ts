import { Component, output, input } from '@angular/core';

import {
  DropdownOption,
  DropdownOptionId,
  optionChildren,
  optionLabel,
} from '../advance-dropdown.model';

@Component({
  selector: 'app-dropdown-list',
  imports: [],
  templateUrl: './dropdown-list.html',
  styleUrl: './dropdown-list.scss',
})
export class DropdownList {
  readonly data = input<DropdownOption>(undefined);
  readonly selectedPillIds = input<DropdownOptionId[]>(undefined);
  readonly parentId = input<DropdownOptionId[]>(undefined);
  readonly key = input<string>(undefined);
  readonly subArrayKey = input<string>(undefined);
  readonly showImage = input<boolean>(undefined);

  readonly selected = output<DropdownOption>();
  readonly subItemClicked = output<DropdownOption>();

  get label(): string {
    return optionLabel(this.data(), this.key());
  }

  get hasChildren(): boolean {
    return optionChildren(this.data(), this.subArrayKey()).length > 0;
  }

  select(data: DropdownOption) {
    data.selected = !data.selected;
    this.selected.emit(data);
  }

  onArrowClick(event: Event, data: DropdownOption) {
    event.stopPropagation();
    this.subItemClicked.emit(data);
  }
}
