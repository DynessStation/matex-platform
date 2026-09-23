import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-logo',
  imports: [RouterModule],
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
})
export class Logo {
  readonly logo = input<string | null>();
}
