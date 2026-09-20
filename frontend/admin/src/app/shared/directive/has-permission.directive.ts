import {
  DestroyRef,
  Directive,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
  inject,
  input,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Store } from '@ngxs/store';

import { combineLatest } from 'rxjs';

import { AuthState } from '../store/state/auth.state';

import { hasPermissionAccess, PermissionMode } from '../utils/permission.util';

//==================================================
//==== DIRECTIVE
//==================================================

@Directive({
  selector: '[hasPermission]',

  standalone: true,
})
export class HasPermissionDirective {
  //==================================================
  //==== INJECT
  //==================================================

  private templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  private viewContainerRef = inject(ViewContainerRef);

  private store = inject(Store);

  private destroyRef = inject(DestroyRef);

  //==================================================
  //==== INPUT
  //==================================================

  readonly permission = input<string | string[] | undefined>(undefined, {
    alias: 'hasPermission',
  });

  readonly permissionMode = input<PermissionMode>('all', {
    alias: 'hasPermissionMode',
  });

  //==================================================
  //==== STATE
  //==================================================

  private permissions: string[] = [];

  private isAllAccess = false;

  private isViewCreated = false;

  //==================================================
  //==== INIT
  //==================================================

  ngOnInit(): void {
    combineLatest([
      this.store.select(AuthState.permissions),

      this.store.select(AuthState.isAllAccess),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([permissions, isAllAccess]) => {
        this.permissions = permissions ?? [];

        this.isAllAccess = isAllAccess === true;

        this.checkPermissions();
      });
  }

  //==================================================
  //==== CHECK PERMISSION
  //==================================================

  private checkPermissions(): void {
    const allowed = hasPermissionAccess(
      this.permission(),

      this.permissions,

      this.isAllAccess,

      this.permissionMode(),
    );

    if (allowed) {
      this.createView();
    } else {
      this.clearView();
    }
  }

  //==================================================
  //==== CREATE VIEW
  //==================================================

  private createView(): void {
    if (this.isViewCreated) {
      return;
    }

    this.viewContainerRef.createEmbeddedView(this.templateRef);

    this.isViewCreated = true;
  }

  //==================================================
  //==== CLEAR VIEW
  //==================================================

  private clearView(): void {
    if (!this.isViewCreated) {
      return;
    }

    this.viewContainerRef.clear();

    this.isViewCreated = false;
  }

  //==================================================
  //==== INPUT CHANGE
  //==================================================

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['permission'] || changes['permissionMode']) &&
      !(
        changes['permission']?.firstChange &&
        changes['permissionMode']?.firstChange
      )
    ) {
      this.checkPermissions();
    }
  }
}
