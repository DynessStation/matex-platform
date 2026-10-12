import { Component, inject } from '@angular/core';

import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

import { AdminThemeModeService } from '../../../../services/admin-theme-mode.service';

@Component({
  selector: 'app-mode',
  imports: [NgbTooltip],
  templateUrl: './mode.html',
  styleUrl: './mode.scss',
})
export class Mode {
  private adminThemeMode = inject(AdminThemeModeService);
  readonly isDark = this.adminThemeMode.isDark;

  customizeLayoutDark() {
    this.adminThemeMode.toggle();
  }
}
