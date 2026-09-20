import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NgbRating } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { Params } from '../../../../../../shared/interface/core.interface';

@Component({
  selector: 'app-store-rating',
  imports: [NgbRating, TranslateModule],
  templateUrl: './store-rating.html',
  styleUrl: './store-rating.scss',
})
export class StoreRating {
  filter = input<Params>();

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  public numbers: number[] = Array.from({ length: 5 }, (_, i) => i + 1);

  public selectedRatings: string[] = [];

  ngOnChanges() {
    const filter = this.filter();
    this.selectedRatings = filter!['rating'] ? filter!['rating'].split(',') : [];
  }

  applyFilter(event: Event) {
    const index = this.selectedRatings.indexOf((<HTMLInputElement>event?.target)?.value); // checked and unchecked value

    if ((<HTMLInputElement>event?.target)?.checked)
      this.selectedRatings.push((<HTMLInputElement>event?.target)?.value); // push in array cheked value
    else this.selectedRatings.splice(index, 1); // removed in array unchecked value

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        rating: this.selectedRatings.length ? this.selectedRatings?.join(',') : null,
        page: 1,
      },
      queryParamsHandling: 'merge', // preserve the existing query params in the route
      skipLocationChange: false, // do trigger navigation,
    });
  }

  // check if the item are selected
  checked(item: string) {
    if (this.selectedRatings?.indexOf(item) != -1) {
      return true;
    }
    return false;
  }
}
