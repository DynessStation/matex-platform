import { Component, input } from '@angular/core';

@Component({
  selector: 'app-home-newsletter',
  imports: [],
  templateUrl: './home-newsletter.html',
  styleUrl: './home-newsletter.scss',
})
export class HomeNewsletter {
  type = input<string>('default');
}
