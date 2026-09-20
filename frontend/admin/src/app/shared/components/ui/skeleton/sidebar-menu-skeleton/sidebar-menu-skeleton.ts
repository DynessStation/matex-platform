import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';

import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';

import { IValues } from '../../../../interface/setting.interface';
import { SettingState } from '../../../../store/state/setting.state';

@Component({
  selector: 'app-sidebar-menu-skeleton',
  imports: [CommonModule],
  templateUrl: './sidebar-menu-skeleton.html',
  styleUrl: './sidebar-menu-skeleton.scss',
})
export class SidebarMenuSkeleton {
  readonly loading = input<boolean>(false);

  setting$: Observable<IValues> = inject(Store).select(SettingState.setting) as Observable<IValues>;

  public skeletonItems = Array.from({ length: 20 }, (_, index) => index);
}
