import { Component, input } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { NgbModule, NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-collection-rating-filter',
  standalone: true,
  imports: [NgbModule, NgbRatingModule],
  templateUrl: './collection-rating-filter.html',
  styleUrl: './collection-rating-filter.scss',
})
export class CollectionRatingFilter {
  filter = input<Params>();

  public numbers: number[] = Array.from({ length: 5 }, (_, i) => i + 1);

  public selectedRatings: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnChanges() {
    this.selectedRatings = this.filter()!['rating'] ? this.filter()!['rating'].split(',') : [];
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
