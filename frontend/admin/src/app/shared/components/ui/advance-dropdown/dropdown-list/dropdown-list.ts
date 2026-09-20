import { Component, output, input } from '@angular/core';

@Component({
  selector: 'app-dropdown-list',
  imports: [],
  templateUrl: './dropdown-list.html',
  styleUrl: './dropdown-list.scss',
})
export class DropdownList {
  readonly data = input<any>(undefined);
  readonly selectedPillIds = input<number[]>(undefined);
  readonly parentId = input<number[]>(undefined);
  readonly key = input<string>(undefined);
  readonly subArrayKey = input<string>(undefined);
  readonly showImage = input<boolean>(undefined);

  readonly selected = output<any>();
  readonly subItemClicked = output<any>();

  select(data: any) {
    data.selected = !data.selected;
    this.selected.emit(data);
  }

  onArrowClick(event: Event, data: any) {
    event.stopPropagation();
    this.subItemClicked.emit(data);
  }
}
