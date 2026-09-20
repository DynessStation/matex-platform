import { isPlatformBrowser, AsyncPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  inject,
  PLATFORM_ID,
  viewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import { Observable, Subscription } from 'rxjs';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';

import { NoData } from '../../../shared/components/no-data/no-data';
import { Breadcrumb } from '../../../shared/components/widgets/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../shared/interface/breadcrumb.interface';
import { CartAddOrUpdate } from '../../../shared/interface/cart.interface';
import { Product } from '../../../shared/interface/product.interface';
import { CurrencySymbolPipe } from '../../../shared/pipe/currency.pipe';
import { CompareService } from '../../../shared/services/compare.service';
import { AddToCart } from '../../../shared/store/action/cart.action';
import { DeleteCompare, GetCompare } from '../../../shared/store/action/compare.action';
import { CompareState } from '../../../shared/store/state/compare.state';
import { HomeNewsletter } from '../../home/widgets/home-newsletter/home-newsletter';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [
    NgbModule,
    CurrencySymbolPipe,
    NoData,
    HomeNewsletter,
    Breadcrumb,
    AsyncPipe,
    TranslateModule,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.scss',
})
export class Compare implements AfterViewInit, OnDestroy {
  private store = inject(Store);
  public compareService = inject(CompareService);

  compareItems$: Observable<Product[]> = inject(Store).select(CompareState.compareItems);

  readonly swiperContainer = viewChild<ElementRef>('swiperContainer');

  private swiper?: Swiper;
  private compareSub?: Subscription;

  public option: SwiperOptions = {
    slidesPerView: 1,
    navigation: true,
    breakpoints: {},
  };

  public breadcrumb: breadcrumb = {
    title: 'Compare',
    items: [{ label: 'Compare', active: true }],
  };

  public skeletonItems = Array.from({ length: 3 }, (_, i) => i);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.store.dispatch(new GetCompare());
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.compareSub = this.compareItems$.subscribe((products) => {
      if (!products || products.length === 0) return;

      const count = products.length;

      this.option = {
        ...this.option,
        slidesPerView: Math.min(count, 4),
        breakpoints: {
          0: { slidesPerView: Math.min(count, 1) },
          576: { slidesPerView: Math.min(count, 2) },
          992: { slidesPerView: Math.min(count, 3) },
          1200: { slidesPerView: Math.min(count, 4) },
        },
      };

      setTimeout(() => {
        const container = this.swiperContainer()?.nativeElement;
        if (!container) return;

        if (this.swiper) {
          this.swiper.destroy(true, true);
        }

        this.swiper = new Swiper(container, this.option);
      });
    });
  }

  moveToCart(product: Product) {
    if (!product) return;

    const params: CartAddOrUpdate = {
      id: null,
      product_id: product.id,
      product,
      variation: null,
      variation_id: null,
      quantity: 1,
    };

    this.store.dispatch(new AddToCart(params)).subscribe({
      complete: () => this.removeCompare(product.id),
    });
  }

  removeCompare(id: number) {
    this.store.dispatch(new DeleteCompare(id));
  }

  ngOnDestroy(): void {
    this.compareSub?.unsubscribe();
    this.swiper?.destroy(true, true);
  }
}
