import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FooterLogo } from './widgets/footer-logo/footer-logo';
import { PublicNavigationContextService } from '../../services/public-navigation-context.service';

@Component({
  selector: 'app-footer',
  imports: [FooterLogo, NgTemplateOutlet, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  readonly navigation = inject(PublicNavigationContextService);
  readonly year = new Date().getFullYear();
}
