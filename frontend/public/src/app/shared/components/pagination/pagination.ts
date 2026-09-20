import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';

import { PaginationService } from '../../../shared/services/pagination.service';
import { Paginate } from '../../interface/pagination.interface';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [NgClass],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class PaginationComponent {
  total = input.required<number>();
  currentPage = input.required<number>();
  pageSize = input.required<number>();

  setPage = output<number>();

  paginate!: Paginate;

  constructor(private paginationService: PaginationService) {}

  ngOnInit() {
    this.updatePager();
  }

  // Recalculate pager whenever inputs change
  ngDoCheck() {
    this.updatePager();
  }

  private updatePager() {
    this.paginate = this.paginationService.getPager(
      this.total(),
      this.currentPage(),
      this.pageSize(),
    );
  }

  pageSet(page: number) {
    this.setPage.emit(page);
  }
}
