import { createRequire } from 'node:module';
import path from 'node:path';

import { backendRoot } from './stack.mjs';

// Synthetic Seller Center files with the real headers of TikTok Shop (Seller Center ID, Nov
// 2026): the order export (CSV, English headers, one row per SKU, ids followed by a tab) and the
// income statement (xlsx, sheet "Detail pesanan", Indonesian headers). Buyers are invented.

export const ORDER_HEADERS = [
  'Order ID',
  'Order Status',
  'Order Substatus',
  'Cancelation/Return Type',
  'Normal or Pre-order',
  'SKU ID',
  'Seller SKU',
  'Product Name',
  'Variation',
  'Quantity',
  'Sku Quantity of return',
  'SKU Unit Original Price',
  'SKU Subtotal Before Discount',
  'SKU Platform Discount',
  'SKU Seller Discount',
  'SKU Subtotal After Discount',
  'Shipping Fee After Discount',
  'Original Shipping Fee',
  'Shipping Fee Seller Discount',
  'Shipping Fee Platform Discount',
  'Order Amount',
  'Created Time',
  'Paid Time',
  'Shipped Time',
  'Delivered Time',
  'Cancelled Time',
  'Tracking ID',
  'Delivery Option',
  'Shipping Provider Name',
  'Buyer Message',
  'Buyer Username',
  'Recipient',
  'Phone #',
  'Zipcode',
  'Country',
  'Province',
  'Regency and City',
  'Districts',
  'Villages',
  'Detail Address',
  'Payment Method',
  'Weight(kg)',
  'Product Category',
  'Package ID',
  'Purchase Channel',
  'Seller Note',
  'Order Channel',
];

export interface FixtureLine {
  order: string;
  status: string;
  sku: string;
  sellerSku: string;
  name: string;
  variation: string;
  qty: number;
  price: number;
  platformDiscount: number;
  sellerDiscount: number;
  amount: number;
  created: string;
  paid?: string;
  province?: string;
  city?: string;
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The order export as TikTok writes it: UTF-8 BOM, ids and times followed by a tab. */
export const ordersCsv = (lines: FixtureLine[]): Buffer => {
  const rows = lines.map((line) => {
    const subtotal = line.qty * line.price - line.platformDiscount - line.sellerDiscount;
    const row: Record<string, string | number> = {
      'Order ID': `${line.order}\t`,
      'Order Status': line.status,
      'Normal or Pre-order': 'Normal',
      'SKU ID': `${line.sku}\t`,
      'Seller SKU': line.sellerSku,
      'Product Name': line.name,
      Variation: line.variation,
      Quantity: line.qty,
      'Sku Quantity of return': 0,
      'SKU Unit Original Price': line.price,
      'SKU Subtotal Before Discount': line.qty * line.price,
      'SKU Platform Discount': line.platformDiscount,
      'SKU Seller Discount': line.sellerDiscount,
      'SKU Subtotal After Discount': subtotal,
      'Shipping Fee After Discount': 0,
      'Order Amount': line.amount,
      'Created Time': `${line.created}\t`,
      'Paid Time': line.paid ? `${line.paid}\t` : '\t',
      'Buyer Username': 'p********i',
      Recipient: 'Pembeli Uji',
      'Phone #': '(+62)8123456789',
      Country: 'Indonesia',
      Province: line.province ?? 'Jawa Barat',
      'Regency and City': line.city ?? 'Bandung',
      'Detail Address': 'Jl. Uji No. 1, "Blok A"',
      'Payment Method': 'Bayar di tempat',
      'Weight(kg)': 0.5,
      'Purchase Channel': 'Aplikasi TikTok',
      'Order Channel': 'Product cards',
    };
    return ORDER_HEADERS.map((header) => csvCell(row[header] ?? '')).join(',');
  });
  return Buffer.from(`﻿${ORDER_HEADERS.join(',')}\r\n${rows.join('\r\n')}\r\n`, 'utf8');
};

export const INCOME_HEADERS = [
  'ID Pesanan/Penyesuaian',
  'Jenis transaksi',
  'Waktu pemesanan',
  'Waktu pembayaran pesanan',
  'Mata uang',
  'Jumlah penyelesaian pembayaran',
  'Total Pendapatan',
  'Subtotal setelah diskon penjual',
  'Subtotal sebelum diskon',
  'Diskon penjual',
  'Total Biaya',
  'Biaya komisi platform',
  'Ongkir',
  'Biaya layanan Program Bebas Ongkir',
  'Biaya pemrosesan pesanan',
  'PPh Pasal 22 dipungut',
  'Jumlah penyesuaian',
  'ID pesanan terkait',
  'Pembayaran oleh pembeli',
  'Detail produk terjual',
  'Sumber pesanan',
];

export interface FixtureSettlement {
  ref: string;
  label: string;
  ordered: string;
  settled: string;
  amount: number;
  revenue: number;
  fees: number;
  commission?: number;
  shipping?: number;
  adjustment?: number;
  orderRef?: string;
  sku?: string;
  qty?: number;
}

/** The income statement workbook: a summary sheet first, then "Detail pesanan". */
export const incomeXlsx = async (rows: FixtureSettlement[]): Promise<Buffer> => {
  const backendRequire = createRequire(path.join(backendRoot, 'package.json'));
  const ExcelJS = backendRequire('exceljs');
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Laporan');
  summary.addRow(['Periode', '2026/10/01-2026/11/12']);
  summary.addRow(['Zona waktu', 'UTC+7']);
  const detail = workbook.addWorksheet('Detail pesanan');
  detail.addRow(INCOME_HEADERS);
  for (const row of rows) {
    const cells: Record<string, string | number> = {
      'ID Pesanan/Penyesuaian': row.ref,
      'Jenis transaksi': row.label,
      'Waktu pemesanan': row.ordered,
      'Waktu pembayaran pesanan': row.settled,
      'Mata uang': 'IDR',
      'Jumlah penyelesaian pembayaran': row.amount,
      'Total Pendapatan': row.revenue,
      'Subtotal setelah diskon penjual': row.revenue,
      'Subtotal sebelum diskon': row.revenue,
      'Diskon penjual': 0,
      'Total Biaya': row.fees,
      'Biaya komisi platform': row.commission ?? 0,
      Ongkir: row.shipping ?? 0,
      'Biaya layanan Program Bebas Ongkir': 0,
      'Biaya pemrosesan pesanan': 0,
      'PPh Pasal 22 dipungut': 0,
      'Jumlah penyesuaian': row.adjustment ?? 0,
      'ID pesanan terkait': row.orderRef ?? '/',
      'Pembayaran oleh pembeli': row.revenue,
      'Detail produk terjual': row.sku ? `${row.sku} * ${row.qty ?? 1};` : '/',
      'Sumber pesanan': 'TikTok Shop',
    };
    detail.addRow(INCOME_HEADERS.map((header) => cells[header] ?? ''));
  }
  workbook.addWorksheet('Riwayat penarikan').addRow(['Jenis transaksi', 'ID referensi']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

export const SPREADSHEET_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
