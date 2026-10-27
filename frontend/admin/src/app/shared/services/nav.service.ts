import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NavService {
  // Search Box
  public search: boolean = false;

  public collapseSidebar: boolean = false;
  public sidebarLoading: boolean = false;
  public fullScreen: boolean = false;
}
