import { Component, input } from '@angular/core';

@Component({
  selector: 'app-no-data',
  standalone: true,
  imports: [],
  templateUrl: './no-data.html',
  styleUrl: './no-data.scss',
})
export class NoData {
  class = input<string>('no-data-added');
  image = input<string>();
  text = input<string>();
  description = input<string>();
}
