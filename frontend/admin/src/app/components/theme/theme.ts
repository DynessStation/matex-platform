import { CommonModule } from "@angular/common";
import { Component, inject, viewChild } from "@angular/core";
import { Router } from "@angular/router";

import { TranslateModule } from "@ngx-translate/core";
import { Store } from "@ngxs/store";
import { Observable } from "rxjs";

import { ITableClickedAction } from "src/app/shared/interface/table.interface";

import { environment } from "../../../environments/environment.development";
import { PageWrapper } from "../../shared/components/page-wrapper/page-wrapper";
import { ConfirmationModal } from "../../shared/components/ui/modal/confirmation-modal/confirmation-modal";
import { HasPermissionDirective } from "../../shared/directive/has-permission.directive";
import { IThemes, IThemesModel } from "../../shared/interface/theme.interface";
import {
  GetThemesAction,
  UpdateThemeAction,
} from "../../shared/store/action/theme.action";
import { ThemeState } from "../../shared/store/state/theme.state";

@Component({
  selector: "app-theme",
  imports: [
    CommonModule,
    TranslateModule,
    HasPermissionDirective,
    PageWrapper,
    ConfirmationModal,
  ],
  templateUrl: "./theme.html",
  styleUrl: "./theme.scss",
})
export class Theme {
  private store = inject(Store);
  private router = inject(Router);

  public themes: IThemes[];
  public selectedTheme: number | null;
  public storageURL = environment.URL;

  themes$: Observable<IThemesModel> = inject(Store).select(
    ThemeState.themes,
  ) as Observable<IThemesModel>;

  readonly ConfirmationModal =
    viewChild<ConfirmationModal>("confirmationModal");

  ngOnInit() {
    this.store.dispatch(new GetThemesAction());
    this.themes$.subscribe((item) => {
      item?.data?.map((data: IThemes) => {
        if (data.status === 1) this.selectedTheme = data.id;
      });
    });
  }

  themeRoute(route: string) {
    void this.router.navigateByUrl(`/theme/${route}`);
  }

  activeTheme(theme: ITableClickedAction) {
    this.selectedTheme = null;
    this.selectedTheme = theme.data.id!;
    this.store.dispatch(new UpdateThemeAction(theme.data.id, 1));
  }
}
