/* eslint-disable import/order */
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  Renderer2,
  DOCUMENT,
  viewChild,
} from '@angular/core';
import { Params, Router, RouterModule } from '@angular/router';

import { NgbModule, NgbRatingConfig } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngxs/store';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexResponsive,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { Select2Data, Select2Module, Select2UpdateEvent } from 'ng-select2-component';
import { Observable } from 'rxjs';

import { PageWrapper } from '../../shared/components/page-wrapper/page-wrapper';
import { Table } from '../../shared/components/ui/table/table';
import { HasPermissionDirective } from '../../shared/directive/has-permission.directive';
import { IAccountUser } from '../../shared/interface/account.interface';
import { IBlogModel } from '../../shared/interface/blog.interface';
import { IRevenueChart, IStatisticsCount } from '../../shared/interface/dashboard.interface';
import { INotice } from '../../shared/interface/notice.interface';
import { IOrder, IOrderModel } from '../../shared/interface/order.interface';
import { IProduct, IProductModel } from '../../shared/interface/product.interface';
import { IReviewModel } from '../../shared/interface/review.interface';
import { IStoresModel } from '../../shared/interface/store.interface';
import { ITableClickedAction, ITableConfig } from '../../shared/interface/table.interface';
import { CurrencySymbolPipe } from '../../shared/pipe/currency-symbol.pipe';
import { GetBlogsAction } from '../../shared/store/action/blog.action';
import { GetCategoriesAction } from '../../shared/store/action/category.action';
import {
  GetRevenueChartAction,
  GetStatisticsCountAction,
} from '../../shared/store/action/dashboard.action';
import {
  MarkAsReadNoticeAction,
  ResentNoticeAction,
} from '../../shared/store/action/notice.action';
import { GetOrdersAction } from '../../shared/store/action/order.action';
import { GetProductsAction } from '../../shared/store/action/product.action';
import { GetReviewsAction } from '../../shared/store/action/review.action';
import { GetStoresAction } from '../../shared/store/action/store.action';
import { AccountState } from '../../shared/store/state/account.state';
import { BlogState } from '../../shared/store/state/blog.state';
import { CategoryState } from '../../shared/store/state/category.state';
import { DashboardState } from '../../shared/store/state/dashboard.state';
import { NoticeState } from '../../shared/store/state/notice.state';
import { OrderState } from '../../shared/store/state/order.state';
import { ProductState } from '../../shared/store/state/product.state';
import { ReviewState } from '../../shared/store/state/review.state';
import { StoreState } from '../../shared/store/state/store.state';

import SwiperCore from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';


SwiperCore.use([Pagination, Navigation]);


export interface ChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  grid: ApexGrid;
  markers: ApexMarkers;
  legend: ApexLegend;
  responsive: ApexResponsive[];
}



export interface Charts {
  series: ApexAxisChartSeries;
  colors: string[];
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  fill: ApexFill;
}

export interface RevenueCharts {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  fill: ApexFill;
  title: ApexTitleSubtitle;
  grid: ApexGrid;
  markers: ApexMarkers;
  legend: ApexLegend;
  responsive: ApexResponsive[];
}

export interface OptionSelect {
  value: string;
  label: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    Select2Module,
    CurrencySymbolPipe,
    PageWrapper,
    Table,
    NgbModule,
    HasPermissionDirective,
  ],
  providers: [CurrencySymbolPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private renderer = inject(Renderer2);
  private document = inject<Document>(DOCUMENT);
  private store = inject(Store);
  private router = inject(Router);
  private platformId = inject<Object>(PLATFORM_ID);
  public open: boolean = false;
  public open2: boolean = false;
  public open3: boolean = false;
  public open4: boolean = false;

  statistics$: Observable<IStatisticsCount | null> = inject(Store).select(
    DashboardState.statistics,
  );
  revenueChart$: Observable<IRevenueChart | null> = inject(Store).select(
    DashboardState.revenueChart,
  );
  order$: Observable<IOrderModel | null> = inject(Store).select(OrderState.order);
  product$: Observable<IProductModel> = inject(Store).select(ProductState.product);
  topProduct$: Observable<IProduct[]> = inject(Store).select(ProductState.topSellingProducts);
  review$: Observable<IReviewModel> = inject(Store).select(ReviewState.review);
  blog$: Observable<IBlogModel> = inject(Store).select(BlogState.blog);
  category$: Observable<Select2Data> = inject(Store).select(CategoryState.categories);
  store$: Observable<IStoresModel> = inject(Store).select(StoreState.store);
  user$: Observable<IAccountUser> = inject(Store).select(AccountState.user);
  notice$: Observable<INotice> = inject(Store).select(
    NoticeState.recentNotice,
  ) as Observable<INotice>;

  readonly chart = viewChild.required<ElementRef>('chart');
  readonly swiperContainer = viewChild<ElementRef>('swiperContainer');

  //  swiper slider
  public swiperConfig: SwiperOptions = {
    slidesPerView: 2,
    spaceBetween: 20,
    slidesPerGroup: 2,
    loop: true,
    breakpoints: {
      0: {
        slidesPerView: 1,
        slidesPerGroup: 1,
      },
      1499: {
        slidesPerView: 2,
        slidesPerGroup: 2,
      },
    },
    // from 1299px
    // 1399: {
    //   slidesPerView: 2,
    //   slidesPerGroup: 2,
    // },

    // from 1499px (large screens)

    // pagination: {
    //   show: false,
    //   el: ".swiper-pagination",
    //   clickable: true,
    // },
    // navigation: {
    //   nextEl: ".swiper-button-next",
    //   prevEl: ".swiper-button-prev",
    // },

  };


  public today = new Date();

  public chartOptions!: Partial<ChartOptions>;
  public charts: Partial<Charts>;
  public revenueCharts: Partial<RevenueCharts>;
  public isBrowser: boolean;

  public topProductLoader: boolean = false;
  public productStockLoader: boolean = false;
  public topSellerLoader: boolean = false;
  public notice: INotice;
  public filterType: string;
  public filter: OptionSelect[] = [
    {
      value: 'today',
      label: 'Today',
    },
    {
      value: 'last_week',
      label: 'Last Week',
    },
    {
      value: 'last_month',
      label: 'Last Month',
    },
    {
      value: 'this_year',
      label: 'This Year',
    },
    {
      value: 'all_time',
      label: 'All Time',
    },
  ];

  public sellerTableConfig: ITableConfig = {
    columns: [
      { title: 'store_name', dataField: 'store_name' },
      { title: 'orders', dataField: 'orders_count' },
      { title: 'earning', dataField: 'order_amount' },
    ],
    data: [],
    total: 0,
  };

  public orderTableConfig: ITableConfig = {
    columns: [
      { title: 'number', dataField: 'order_id' },
      { title: 'date', dataField: 'created_at', type: 'date', date_format: 'dd MMM yyyy' },
      { title: 'name', dataField: 'consumer_name' },
      { title: 'amount', dataField: 'total', type: 'price' },
      { title: 'payment', dataField: 'order_payment_status' },
    ],
    rowActions: [
      { label: 'View', actionToPerform: 'view', icon: 'ri-eye-line', permission: 'order.edit' },
    ],
    data: [],
    total: 0,
  };

  public productStockTableConfig: ITableConfig = {
    columns: [
      {
        title: 'image',
        dataField: 'product_thumbnail',
        class: 'tbl-image',
        type: 'image',
        placeholder: 'assets/images/product.png',
      },
      { title: 'name', dataField: 'name' },
      { title: 'quantity', dataField: 'quantity' },
      { title: 'stock', dataField: 'stock' },
    ],
    rowActions: [
      {
        label: 'Edit',
        actionToPerform: 'edit',
        icon: 'ri-pencil-line',
        permission: 'product.edit',
      },
    ],
    data: [] as IProduct[],
    total: 0,
  };

  constructor() {
    const config = inject(NgbRatingConfig);
    const platformId = this.platformId;

    this.isBrowser = isPlatformBrowser(platformId);

    if (this.store.selectSnapshot(state => state.account && state.account.roleName) !== 'admin') {
      this.store.dispatch(new ResentNoticeAction('recent'));
    }
    this.notice$.subscribe(data => (this.notice = data));
    config.max = 5;
    config.readonly = true;

    this.charts = {
      series: [
        {
          name: 'Net Profit',
          data: [44, 55, 57, 56, 61],
        },
      ],
      colors: ['#ec8951'],
      chart: {
        type: 'bar',
        height: 410,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '40%',
          // endingShape: 'rounded',
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: ['Feb', 'Mar', 'Apr', 'May', 'Jun'],
      },
      yaxis: {
        title: {
          text: '$ (thousands)',
        },
      },
      fill: {
        opacity: 1,
      },
    };

    this.chartOptions = {
      series: [
        {
          name: 'Revenue',
          data: [],
          color: '#0da487',
        },
        {
          name: 'Comission',
          data: [],
          color: '#FFA53B',
        },
      ],
      chart: {
        height: 350,
        type: 'line',
        dropShadow: {
          enabled: true,
          top: 10,
          left: 0,
          blur: 3,
          color: '#720f1e',
          opacity: 0.1,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      markers: {
        strokeWidth: 4,
        strokeColors: '#ffffff',
        hover: {
          size: 9,
        },
      },
      stroke: {
        curve: 'smooth',
        lineCap: 'butt',
        width: 4,
      },
      grid: {
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      legend: {
        show: false,
      },
      responsive: [
        {
          breakpoint: 1200,
          options: {
            grid: {
              padding: {
                right: -95,
              },
            },
          },
        },
        {
          breakpoint: 992,
          options: {
            grid: {
              padding: {
                right: -69,
              },
            },
          },
        },
        {
          breakpoint: 767,
          options: {
            chart: {
              height: 200,
            },
          },
        },
        {
          breakpoint: 576,
          options: {
            yaxis: {
              labels: {
                show: false,
              },
            },
          },
        },
      ],
      xaxis: {
        categories: [],
        range: undefined,
        axisBorder: {
          offsetX: 0,
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
    };

    // Revenue & Commision Chart
    this.revenueChart$.subscribe(revenue => {
      if (revenue) {
        this.chartOptions = {
          series: [
            {
              name: 'Revenue',
              data: revenue.revenues,
              color: '#7AA2F7',
            },
            {
              name: 'Commission',
              data: revenue.commissions,
              color: '#6ED3C6',
            },
          ],

          chart: {
            type: 'area',
            height: 340,
            toolbar: { show: false },
            zoom: { enabled: false },
          },
          stroke: {
            curve: 'smooth',
            width: 2,
          },


          fill: {
            type: 'gradient',
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.90,
              opacityTo: 0.05,
              stops: [0, 100],
            },
          },

          dataLabels: {
            enabled: false,
          },

          markers: {
            size: 0,
            hover: {
              size: 6,
            },
          },

          grid: {
            borderColor: '#eef1f5',
            strokeDashArray: 4,
          },

          xaxis: {
            categories: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
            axisBorder: { show: false },
            axisTicks: { show: false },
          },

          yaxis: {
            labels: {
              formatter: (val) => val.toFixed(0),
            },
          },

          tooltip: {
            shared: true,
            intersect: false,
          },

          legend: {
            position: 'bottom',
            markers: {
              // radius: 12,
            },
          },


        };
      }
    });


    // this.revenueChart$.subscribe(revenue => {
    //   if (revenue) {
    //     this.revenueCharts = {
    //       series: [
    //         {
    //           name: 'Revenues',
    //           data: revenue.revenues,
    //           color: '#ec8951',
    //         },
    //         {
    //           name: 'Commission',
    //           data: revenue.commissions,
    //           color: '#86909C',
    //         },
    //       ],
    //       chart: {
    //         type: 'line',
    //         height: 350,
    //       },
    //       stroke: {
    //         curve: 'stepline',
    //       },
    //       dataLabels: {
    //         enabled: false,
    //       },
    //       title: {
    //         text: 'Stepline Chart',
    //         align: 'left',
    //       },
    //       markers: {
    //         hover: {
    //           sizeOffset: 4,
    //         },
    //       },
    //     };
    //   }
    // });

    // For Order
    this.order$.subscribe(order => {
      this.orderTableConfig.data = order ? order?.data.slice(0, 4) : [];
      this.orderTableConfig.total = order ? order?.total : 0;
    });

    this.order$.subscribe(order => {
      let orders = order?.data?.filter((element: IOrder) => {
        element.order_id = `<span class="fw-bolder">#${element.order_number}</span>`;
        element.order_payment_status = element.payment_status
          ? `<div class="status-${element.payment_status.toLowerCase()}"><span>${element.payment_status.replace(/_/g, ' ')}</span></div>`
          : '-';
        element.consumer_name = `<span class="text-capitalize">${element?.consumer?.name}</span>`;
        return element;
      });
      this.orderTableConfig.data = order ? orders.slice(0, 4) : [];
      this.orderTableConfig.total = order ? order?.total : 0;
    });

    // For Product
    this.product$.subscribe(product => {
      let products = product?.data?.filter((element: IProduct) => {
        element.stock = element.stock_status
          ? `<div class="status-${element.stock_status}"><span>${element.stock_status.replace(/_/g, ' ')}</span></div>`
          : '-';
        return element;
      });
      this.productStockTableConfig.data = product ? products.slice(0, 2) : [];
      this.productStockTableConfig.total = product ? product?.total : 0;
    });

    // For Store
    this.store$.subscribe(store => {
      this.sellerTableConfig.data = store ? store?.data.slice(0, 5) : [];
      this.sellerTableConfig.total = store ? store?.total : 0;
    });
  }

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const ApexCharts = (await import('apexcharts')).default;
      const element = this.chart().nativeElement;
      var chart = new ApexCharts(element, this.chartOptions);
      void chart.render();

      const swiperContainer = this.swiperContainer?.();
      if (swiperContainer) {
        new SwiperCore(swiperContainer.nativeElement, this.swiperConfig);
      }
    }
  }

  ngOnInit() {
    this.store.dispatch(new GetStatisticsCountAction());
    this.store.dispatch(new GetRevenueChartAction());
    this.store.dispatch(
      new GetProductsAction({ status: 1, top_selling: 1, filter_by: 'this_year', paginate: 5 }),
    );
    this.store.dispatch(new GetReviewsAction({ paginate: 5 }));
    this.store.dispatch(new GetBlogsAction({ status: 1, paginate: 2 }));
    this.store.dispatch(new GetCategoriesAction({ type: 'product', status: 1 }));
  }

  markAsRead(id: number) {
    this.store.dispatch(new MarkAsReadNoticeAction(id));
  }

  filterTopProduct(data: Select2UpdateEvent) {
    this.topProductLoader = true;
    this.renderer.addClass(this.document.body, 'loader-none');
    let params: Params = { status: 1, top_selling: 1, filter_by: 'this_year', paginate: 5 };
    if (data.value) {
      params['filter_by'] = data.value;
    }
    this.store.dispatch(new GetProductsAction(params)).subscribe({
      complete: () => {
        this.topProductLoader = false;
      },
    });
  }

  // For Order

  onOrderTableChange(data?: Params) {
    if (data) {
      data['paginate'] = 7;
    }
    this.store.dispatch(new GetOrdersAction(data!));
  }

  onOrderActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'view') this.orderView(action.data);
  }

  orderView(data: IOrder) {
    void this.router.navigateByUrl(`/order/details/${data.order_number}`);
  }

  // For Products

  onProductTableChange(data?: Params) {
    if (data) {
      data['paginate'] = 8;
      data['field'] = 'quantity';
      data['sort'] = 'asc';
    }
    this.store.dispatch(new GetProductsAction(data)).subscribe({
      complete: () => {
        this.productStockLoader = false;
      },
    });
  }

  filterProduct(data: Select2UpdateEvent) {
    this.renderer.addClass(this.document.body, 'loader-none');
    let params: Params = {
      paginate: 8,
      field: 'quantity',
      sort: 'asc',
    };
    if (data.value) {
      params['category_ids'] = data.value;
    }
    this.productStockLoader = true;
    this.onProductTableChange(params);
  }

  onProductActionClicked(action: ITableClickedAction) {
    if (action.actionToPerform == 'edit') this.productEdit(action.data);
  }

  productEdit(data: IProduct) {
    void this.router.navigateByUrl(`/product/edit/${data.id}`);
  }

  // For Seller

  onSellerTableChange(data?: Params) {
    if (data && !data['filter_by']) {
      data['paginate'] = 6;
      data['top_vendor'] = 1;
      data['filter_by'] = 'this_year';
    }
    this.store.dispatch(new GetStoresAction(data)).subscribe({
      complete: () => {
        this.topSellerLoader = false;
      },
    });
  }

  filterSeller(data: Select2UpdateEvent) {
    this.renderer.addClass(this.document.body, 'loader-none');
    let params: Params = {
      paginate: 6,
      top_vendor: 1,
      filter_by: 'this_year',
    };
    if (data.value) {
      params['filter_by'] = data.value;
    }
    this.topSellerLoader = true;
    this.onSellerTableChange(params);
  }

  filterOrder(data: Select2UpdateEvent) {
    this.filter.map((item: any) => {
      if (item.value == data.value) this.filterType = item.label;
    });
    this.renderer.addClass(this.document.body, 'loader-none');
    this.store.dispatch(new GetStatisticsCountAction({ filter_by: String(data.value) }));
  }

  redirectToProduct(id: number) {
    void this.router.navigate(['/product/edit', id]);
  }

  openToggle() {
    this.open = !this.open
  }

  openToggle2() {
    this.open2 = !this.open2
  }

  openToggle3() {
    this.open3 = !this.open3
  }

  openToggle4() {
    this.open4 = !this.open4
  }
  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'loader-none');
  }
}
