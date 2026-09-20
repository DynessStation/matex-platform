import { Routes } from '@angular/router';

export const themeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./theme').then(m => m.Theme),
  },
  {
    path: 'fashion_one',
    loadComponent: () => import('./fashion/fashion-1/fashion-1').then(m => m.Fashion1),
  },
  {
    path: 'fashion_two',
    loadComponent: () => import('./fashion/fashion-2/fashion-2').then(m => m.Fashion2),
  },
  {
    path: 'fashion_three',
    loadComponent: () => import('./fashion/fashion-3/fashion-3').then(m => m.Fashion3),
  },
  {
    path: 'fashion_four',
    loadComponent: () => import('./fashion/fashion-4/fashion-4').then(m => m.Fashion4),
  },
  {
    path: 'fashion_five',
    loadComponent: () => import('./fashion/fashion-5/fashion-5').then(m => m.Fashion5),
  },
  {
    path: 'fashion_six',
    loadComponent: () => import('./fashion/fashion-6/fashion-6').then(m => m.Fashion6),
  },
  {
    path: 'fashion_seven',
    loadComponent: () => import('./fashion/fashion-7/fashion-7').then(m => m.Fashion7),
  },
  {
    path: 'furniture_one',
    loadComponent: () => import('./furniture/furniture-1/furniture-1').then(m => m.Furniture1),
  },
  {
    path: 'furniture_two',
    loadComponent: () => import('./furniture/furniture-2/furniture-2').then(m => m.Furniture2),
  },
  {
    path: 'furniture_dark',
    loadComponent: () =>
      import('./furniture/furniture-dark/furniture-dark').then(m => m.FurnitureDark),
  },
  {
    path: 'electronics_one',
    loadComponent: () =>
      import('./electronics/electronics-1/electronics-1').then(m => m.Electronics1),
  },
  {
    path: 'electronics_two',
    loadComponent: () =>
      import('./electronics/electronics-2/electronics-2').then(m => m.Electronics2),
  },
  {
    path: 'electronics_three',
    loadComponent: () =>
      import('./electronics/electronics-3/electronics-3').then(m => m.Electronics3),
  },
  {
    path: 'marketplace_one',
    loadComponent: () =>
      import('./marketplace/marketplace-1/marketplace-1').then(m => m.Marketplace1),
  },
  {
    path: 'marketplace_two',
    loadComponent: () =>
      import('./marketplace/marketplace-2/marketplace-2').then(m => m.Marketplace2),
  },
  {
    path: 'marketplace_three',
    loadComponent: () =>
      import('./marketplace/marketplace-3/marketplace-3').then(m => m.Marketplace3),
  },
  {
    path: 'marketplace_four',
    loadComponent: () =>
      import('./marketplace/marketplace-4/marketplace-4').then(m => m.Marketplace4),
  },
  {
    path: 'vegetables_one',
    loadComponent: () => import('./vegetables/vegetables-1/vegetables-1').then(m => m.Vegetables1),
  },
  {
    path: 'vegetables_two',
    loadComponent: () => import('./vegetables/vegetables-2/vegetables-2').then(m => m.Vegetables2),
  },
  {
    path: 'vegetables_three',
    loadComponent: () => import('./vegetables/vegetables-3/vegetables-3').then(m => m.Vegetables3),
  },
  {
    path: 'vegetables_four',
    loadComponent: () => import('./vegetables/vegetables-4/vegetables-4').then(m => m.Vegetables4),
  },
  {
    path: 'jewellery_one',
    loadComponent: () => import('./jewellery/jewellery-1/jewellery-1').then(m => m.Jewellery1),
  },
  {
    path: 'jewellery_two',
    loadComponent: () => import('./jewellery/jewellery-2/jewellery-2').then(m => m.Jewellery2),
  },
  {
    path: 'jewellery_three',
    loadComponent: () => import('./jewellery/jewellery-3/jewellery-3').then(m => m.Jewellery3),
  },
  {
    path: 'bag',
    loadComponent: () => import('./bag/bag').then(m => m.Bag),
  },
  {
    path: 'watch',
    loadComponent: () => import('./watch/watch').then(m => m.Watch),
  },
  {
    path: 'medical',
    loadComponent: () => import('./medical/medical').then(m => m.Medical),
  },
  {
    path: 'perfume',
    loadComponent: () => import('./perfume/perfume').then(m => m.Perfume),
  },
  {
    path: 'yoga',
    loadComponent: () => import('./yoga/yoga').then(m => m.Yoga),
  },
  {
    path: 'christmas',
    loadComponent: () => import('./christmas/christmas').then(m => m.Christmas),
  },
  {
    path: 'bicycle',
    loadComponent: () => import('./bicycle/bicycle').then(m => m.Bicycle),
  },
  {
    path: 'marijuana',
    loadComponent: () => import('./marijuana/marijuana').then(m => m.Marijuana),
  },
  {
    path: 'gym',
    loadComponent: () => import('./gym/gym').then(m => m.Gym),
  },
  {
    path: 'tools',
    loadComponent: () => import('./tools/tools').then(m => m.Tools),
  },
  {
    path: 'shoes',
    loadComponent: () => import('./shoes/shoes').then(m => m.Shoes),
  },
  {
    path: 'books',
    loadComponent: () => import('./books/books').then(m => m.Books),
  },
  {
    path: 'kids',
    loadComponent: () => import('./kids/kids').then(m => m.Kids),
  },
  {
    path: 'game',
    loadComponent: () => import('./game/game').then(m => m.Game),
  },
  {
    path: 'beauty',
    loadComponent: () => import('./beauty/beauty').then(m => m.Beauty),
  },
  {
    path: 'surfboard',
    loadComponent: () => import('./surfboard/surfboard').then(m => m.Surfboard),
  },
  {
    path: 'video_slider',
    loadComponent: () => import('./video-slider/video-slider').then(m => m.VideoSlider),
  },
  {
    path: 'goggles',
    loadComponent: () => import('./goggles/goggles').then(m => m.Goggles),
  },
  {
    path: 'flower',
    loadComponent: () => import('./flower/flower').then(m => m.Flower),
  },
  {
    path: 'nursery',
    loadComponent: () => import('./nursery/nursery').then(m => m.Nursery),
  },
  {
    path: 'pets',
    loadComponent: () => import('./pets/pets').then(m => m.Pets),
  },
  {
    path: 'video',
    loadComponent: () => import('./video/video').then(m => m.Video),
  },
  {
    path: 'full_page',
    loadComponent: () => import('./full-page/full-page').then(m => m.FullPage),
  },
  {
    path: 'parallax',
    loadComponent: () => import('./parallax/parallax').then(m => m.Parallax),
  },
  {
    path: 'gradient',
    loadComponent: () => import('./gradient/gradient').then(m => m.Gradient),
  },
  {
    path: 'digital_download',
    loadComponent: () => import('./digital-download/digital-download').then(m => m.DigitalDownload),
  },
  {
    path: 'single_product',
    loadComponent: () => import('./single-product/single-product').then(m => m.SingleProduct),
  },
];
