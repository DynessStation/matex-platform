import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { Menu } from '../../../../../interface/menu.interface';

@Component({
  selector: 'app-link-box',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './link-box.html',
  styleUrl: './link-box.scss',
})
export class LinkBox {
  @Input() menu: Menu;

  constructor(private router: Router) {}

  redirect(path: string) {
    void this.router.navigateByUrl(path);
  }
}
