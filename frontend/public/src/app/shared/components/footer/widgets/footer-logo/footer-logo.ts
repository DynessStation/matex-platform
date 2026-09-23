import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer-logo',
  imports: [RouterModule],
  templateUrl: './footer-logo.html',
  styleUrl: './footer-logo.scss',
})
export class FooterLogo {
  readonly logo = input<string>();
}
