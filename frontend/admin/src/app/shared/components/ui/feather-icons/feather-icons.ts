import { Component, Input } from '@angular/core';

import * as feather from 'feather-icons';

@Component({
  selector: 'app-feather-icons',
  standalone: true,
  imports: [],
  templateUrl: './feather-icons.html',
  styleUrl: './feather-icons.scss',
})
export class FeatherIcons {
  @Input('icon') public icon: string;

  constructor() {}

  ngAfterContentInit() {
    feather.replace();
  }
}
