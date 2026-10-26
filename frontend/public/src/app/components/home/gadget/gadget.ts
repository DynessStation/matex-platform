import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Store } from '@ngxs/store';
import { catchError, forkJoin, map, of, shareReplay, switchMap, tap } from 'rxjs';

import { Attachment } from '../../../shared/interface/attachment.interface';
import { IBlog } from '../../../shared/interface/blog.interface';
import { Category } from '../../../shared/interface/category.interface';
import { Product } from '../../../shared/interface/product.interface';
import { GadgetTheme } from '../../../shared/interface/theme.interface';
import { BlogService } from '../../../shared/services/blog.service';
import { CategoryService } from '../../../shared/services/category.service';
import { ProductService } from '../../../shared/services/product.service';
import { PublicNavigationContextService } from '../../../shared/services/public-navigation-context.service';
import { ThemeOptionService } from '../../../shared/services/theme-option.service';
import { SettingState } from '../../../shared/store/state/setting.state';
import { HomeBanner } from '../widgets/home-banner/home-banner';
import { HomeNewsletter } from '../widgets/home-newsletter/home-newsletter';

interface HomeContent {
  categories: Category[];
  products: Product[];
  articles: IBlog[];
}

interface LatexFeatureItem {
  title: string;
  description: string;
}

interface LatexFeatureContent {
  eyebrow: string;
  title: string;
  description: string;
  items: LatexFeatureItem[];
}

@Component({
  selector: 'app-gadget',
  imports: [AsyncPipe, DatePipe, HomeBanner, HomeNewsletter, RouterLink],
  templateUrl: './gadget.html',
  styleUrl: './gadget.scss',
})
export class Gadget {
  private categoryService = inject(CategoryService);
  private productService = inject(ProductService);
  private blogService = inject(BlogService);
  private navigation = inject(PublicNavigationContextService);
  private themeOptionService = inject(ThemeOptionService);
  private selectedCurrency = inject(Store).selectSignal(SettingState.selectedCurrency);
  private router = inject(Router);

  data = input<GadgetTheme>();
  slug = input<string>();
  readonly activeLatexFeature = signal(0);
  readonly latexContent = computed(() => this.resolveLatexContent());

  readonly content$ = this.navigation.locale$.pipe(
    switchMap((locale) =>
      forkJoin({
        categories: this.categoryService
          .getCategories({ status: 1 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
        products: this.productService
          .getProducts({ status: 1 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
        articles: this.blogService
          .getBlogs(locale, { page: 1, paginate: 3 })
          .pipe(catchError(() => of({ data: [], total: 0 }))),
      }),
    ),
    map(({ categories, products, articles }): HomeContent => ({
      categories: [...categories.data]
        .sort(
          (a, b) =>
            Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
            Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        )
        .slice(0, 6),
      products: [...products.data]
        .sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
        .slice(0, 8),
      articles: [...articles.data]
        .sort(
          (a, b) =>
            Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) ||
            Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''),
        )
        .slice(0, 3),
    })),
    tap(() => this.themeOptionService.preloader.set(false)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  get locale(): string {
    return this.navigation.locale();
  }

  /** The path of a tag link (the API gives "/search?q=..." or "/kategori/slug"). */
  tagPath(url: string): string {
    return url.split('?')[0];
  }

  tagQuery(url: string): Record<string, string> | null {
    const query = url.split('?')[1];
    return query ? Object.fromEntries(new URLSearchParams(query)) : null;
  }

  get isEnglish(): boolean {
    return this.locale === 'en-US';
  }

  get catalogPath(): string {
    return this.isEnglish ? '/en/catalog' : '/katalog';
  }

  get articlesPath(): string {
    return this.isEnglish ? '/en/articles' : '/artikel';
  }

  categoryPath(slug: string): string {
    return this.isEnglish ? `/en/category/${slug}` : `/kategori/${slug}`;
  }

  productPath(slug: string): string {
    return this.isEnglish ? `/en/product/${slug}` : `/produk/${slug}`;
  }

  articlePath(slug: string): string {
    return this.isEnglish ? `/en/article/${slug}` : `/artikel/${slug}`;
  }

  imageUrl(attachment: Attachment | null | undefined, fallback: string): string {
    return attachment?.asset_url || attachment?.original_url || fallback;
  }

  displayPrice(product: Product): string | null {
    if (product.price_visibility !== 'displayed' || !product.sale_price) return null;
    const requestedCode = String(
      this.router.parseUrl(this.router.url).queryParams['currency'] ?? '',
    ).toUpperCase();
    const selectedCode =
      (requestedCode === 'IDR' || requestedCode === 'USD' ? requestedCode : null) ??
      this.selectedCurrency()?.code?.toUpperCase() ??
      product.currency ??
      'IDR';
    const prices = (product.prices ?? []).filter((price) => price.type === 'end_user');
    const selectedPrice =
      prices.find((price) => price.currency.toUpperCase() === selectedCode) ??
      prices.find((price) => price.currency.toUpperCase() === 'IDR') ??
      prices[0];
    const code = selectedPrice?.currency || product.currency || selectedCode;

    return new Intl.NumberFormat(this.isEnglish ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'IDR' ? 0 : 2,
    }).format(selectedPrice?.amount ?? product.sale_price);
  }

  selectLatexFeature(index: number): void {
    this.activeLatexFeature.set(index);
  }

  private resolveLatexContent(): LatexFeatureContent {
    const source = this.data()?.latex_features;
    const defaults = this.defaultLatexContent();
    const items = Array.isArray(source?.items)
      ? source.items
          .filter(
            (item): item is LatexFeatureItem =>
              Boolean(item?.title?.trim()) && Boolean(item?.description?.trim()),
          )
          .slice(0, 8)
      : [];

    return {
      eyebrow: source?.eyebrow?.trim() || defaults.eyebrow,
      title: source?.title?.trim() || defaults.title,
      description: source?.description?.trim() || defaults.description,
      items: items.length ? items : defaults.items,
    };
  }

  private defaultLatexContent(): LatexFeatureContent {
    return this.isEnglish
      ? {
          eyebrow: 'MATEX EXCELLENCE',
          title: 'Why Choose 100% Natural Latex?',
          description:
            'The ultimate high-standard universal material solution, engineered to deliver exceptional flexibility, safety, and comfort for diverse industrial, property, and lifestyle needs.',
          items: [
            [
              'High Elasticity & Responsiveness',
              'Natural latex features a molecular structure that is exceptionally springy and instantly responsive to pressure, offering optimal bounce-back resilience without sagging even under intensive daily use.',
            ],
            [
              'Damping & Load Support',
              'Superior weight distribution makes this material exceptional at absorbing vibrations and stabilizing load support—ideal for furniture, automotive cushioning, and custom pads.',
            ],
            [
              'Hypoallergenic & Hygienic',
              'Naturally resistant to mold, bacteria, mildew, and dust mites. Keeps products fresh, clean, and safe for babies, pets, and sensitive skin.',
            ],
            [
              'Harmful Chemical Free',
              'Crafted purely from select natural sap without hazardous synthetic mixtures or toxic gas emissions, guaranteeing total health safety for indoor environments.',
            ],
            [
              'Airflow & Pinhole Structure',
              'Equipped with an open-cell structure and specialized pinhole molds that maximize natural airflow, actively preventing heat buildup and maintaining a cool surface.',
            ],
            [
              'Versatile Applications',
              'From flexible sheet materials for industrial raw goods, creative crafts, ergonomic pillows, to pet accessories and room furnishings, MATEX latex easily adapts.',
            ],
            [
              'Long-Lasting Durability',
              'Renowned for high structural density and exceptional wear resistance. MATEX latex products maintain structural integrity and comfort over years of use.',
            ],
            [
              'Eco-Friendly & Sustainable',
              'Sourced from renewable natural rubber trees and biodegradable by nature, contributing meaningfully to plastic waste reduction and environmental preservation.',
            ],
          ].map(([title, description]) => ({ title, description })),
        }
      : {
          eyebrow: 'KEUNGGULAN MATEX',
          title: 'Kenapa Harus 100% Natural Latex?',
          description:
            'Solusi material universal berstandar tinggi yang dirancang untuk memberikan fleksibilitas, keamanan, dan kenyamanan terbaik bagi berbagai kebutuhan industri, properti, hingga gaya hidup.',
          items: [
            [
              'Elastisitas & Respon Tinggi',
              'Lateks alami memiliki struktur molekul yang sangat kenyal dan responsif secara instan terhadap tekanan, memberikan daya pantul optimal yang kembali ke bentuk semula tanpa mudah amblas meskipun digunakan secara intensif setiap hari.',
            ],
            [
              'Peredam & Penopang Beban',
              'Kemampuan mendistribusikan bobot secara merata menjadikan material ini unggul dalam meredam getaran serta menopang berat secara stabil—sangat ideal diaplikasikan pada furnitur, jok otomotif, hingga alas produk kesayangan Anda.',
            ],
            [
              'Hipoalergenik & Higienis',
              'Secara alami bersifat resisten terhadap pertumbuhan jamur, bakteri, lumut, dan tungau debu. Menjaga produk tetap bersih, higienis, serta aman digunakan bahkan untuk bayi, hewan peliharaan, dan pemilik kulit sensitif.',
            ],
            [
              'Bebas Bahan Kimia Berbahaya',
              'Diproduksi murni dari getah pilihan tanpa campuran bahan sintetis berbahaya atau emisi gas beracun. Menjamin keamanan total bagi kesehatan keluarga sekaligus ramah untuk berbagai fungsi penggunaan di dalam ruangan.',
            ],
            [
              'Sirkulasi Udara & Pinhole',
              'Dilengkapi struktur sel terbuka serta pori-pori cetakan (pinhole) yang memaksimalkan sirkulasi udara alami. Fitur ini secara efektif mencegah penumpukan kelembapan dan panas, sehingga material tetap sejuk saat disentuh.',
            ],
            [
              'Fleksibel Berbagai Aplikasi',
              'Mulai dari bentuk lembaran fleksibel untuk bahan baku industri, kerajinan kreatif, bantal ergonomis, hingga aksesori peliharaan dan properti ruangan, lateks MATEX mudah dibentuk dan disesuaikan dengan berbagai kebutuhan manufaktur.',
            ],
            [
              'Daya Tahan Jangka Panjang',
              'Dikenal memiliki durabilitas tingkat tinggi yang tahan terhadap keausan struktural. Produk berbahan lateks MATEX mampu mempertahankan performa, keempukan, dan bentuk aslinya hingga bertahun-tahun pemakaian.',
            ],
            [
              'Ramah Lingkungan (Eco-Friendly)',
              'Bersumber dari getah pohon karet alami yang dapat diperbarui (renewable resource) dan bersifat biodegradable. Pemilihan material ini ikut berkontribusi nyata dalam menekan limbah sintetis demi kelestarian bumi.',
            ],
          ].map(([title, description]) => ({ title, description })),
        };
  }
}
