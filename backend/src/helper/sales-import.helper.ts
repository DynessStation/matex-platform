import ExcelJS from 'exceljs';

// Reads the two files a store's Seller Center gives: the order export (CSV or Excel, English
// headers, one row per SKU of an order) and the income statement (Excel, Indonesian headers,
// one row per order or adjustment). Both are turned into plain rows keyed by header name first,
// so a column the channel adds later is kept in `detail` instead of breaking the import.
// Nothing is written here; ctrl/admin/sales/imports.ts reports first and saves on request.
// Buyer identity columns (name, phone, address) are read past and never returned.

export class SalesFileError extends Error {}

export interface ParsedOrderLine {
  skuRef: string;
  sellerSku: string | null;
  productName: string | null;
  variation: string | null;
  qty: number;
  returnedQty: number;
  unitPrice: number;
  discountPlatform: number;
  discountSeller: number;
  subtotal: number;
}

export interface ParsedOrder {
  ref: string;
  status: string;
  orderedAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  province: string | null;
  city: string | null;
  source: string | null;
  amount: number;
  shippingFee: number;
  lines: ParsedOrderLine[];
}

export interface ParsedSettlement {
  ref: string;
  kind: 'order' | 'adjustment';
  label: string;
  orderRef: string | null;
  orderedAt: string | null;
  settledAt: string | null;
  amount: number;
  revenue: number;
  fees: number;
  source: string | null;
  /** Every other non-zero numeric column, by its header. */
  detail: Record<string, number>;
}

export interface SalesIssue {
  row: number;
  detail: string;
}

export type ParsedSalesFile =
  | { kind: 'orders'; orders: ParsedOrder[]; issues: SalesIssue[] }
  | { kind: 'settlement'; settlements: ParsedSettlement[]; issues: SalesIssue[] };

type Table = string[][];

/** A CSV file as rows of trimmed cells: quotes, embedded line breaks, BOM, and the stray tabs
 * the export puts after ids are all handled. */
export const parseCsv = (buffer: Buffer): Table => {
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: Table = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows
    .map((cells) => cells.map((value) => value.replace(/\s+/g, ' ').trim()))
    .filter((cells) => cells.some((value) => value !== ''));
};

const cellText = (value: ExcelJS.CellValue): string => {
  if (value == null) return '';
  if (value instanceof Date) {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
  }
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return String(value.text);
    return '';
  }
  return String(value);
};

/** Every sheet of a workbook as rows of trimmed cell text. */
const parseWorkbook = async (buffer: Buffer): Promise<Table[]> => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new SalesFileError('The file is not an Excel workbook');
  }
  const sheets: Table[] = [];
  workbook.eachSheet((sheet) => {
    const rows: Table = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        cells[column - 1] = cellText(cell.value).replace(/\s+/g, ' ').trim();
      });
      for (let i = 0; i < cells.length; i += 1) cells[i] = cells[i] ?? '';
      rows[rowNumber - 1] = cells;
    });
    sheets.push(rows.filter((cells) => cells && cells.some((value) => value !== '')));
  });
  return sheets;
};

const ORDER_KEYS = ['order id', 'sku id', 'quantity'];
const SETTLEMENT_KEYS = ['id pesanan/penyesuaian', 'jumlah penyelesaian pembayaran'];

const headerIndex = (table: Table, keys: string[]): number =>
  table.findIndex((row) => {
    const lower = row.map((cell) => cell.toLowerCase());
    return keys.every((key) => lower.includes(key));
  });

/** A number from '-111000', '1.250', '1,250.50', or ''. */
export const amountOf = (value: string | undefined): number => {
  if (!value) return 0;
  let text = value.replace(/[^\d,.-]/g, '');
  if (!text) return 0;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(/,/g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 'DD/MM/YYYY HH:MM:SS', 'YYYY/MM/DD', 'YYYY-MM-DD HH:MM' -> 'YYYY-MM-DD[ HH:MM:SS]'. */
export const dateOf = (value: string | undefined, withTime: boolean): string | null => {
  if (!value) return null;
  const text = value.trim();
  let match = text.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  let year: string;
  let month: string;
  let day: string;
  if (match) [, year, month, day] = match;
  else {
    match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) return null;
    [, day, month, year] = match;
  }
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (Number.isNaN(Date.parse(date))) return null;
  if (!withTime) return date;
  const [, , , , hour, minute, second] = match;
  return hour ? `${date} ${hour.padStart(2, '0')}:${minute}:${second ?? '00'}` : `${date} 00:00:00`;
};

const textOrNull = (value: string | undefined, max: number): string | null =>
  value ? value.slice(0, max) : null;

const rowReader = (header: string[]) => {
  const index = new Map<string, number>();
  header.forEach((name, i) => {
    if (name && !index.has(name.toLowerCase())) index.set(name.toLowerCase(), i);
  });
  return (row: string[]) => (name: string) => {
    const i = index.get(name.toLowerCase());
    return i === undefined ? undefined : row[i];
  };
};

const parseOrders = (table: Table, headerAt: number): ParsedSalesFile => {
  const read = rowReader(table[headerAt]);
  const orders = new Map<string, ParsedOrder>();
  const issues: SalesIssue[] = [];
  table.slice(headerAt + 1).forEach((row, offset) => {
    const col = read(row);
    const ref = (col('Order ID') ?? '').slice(0, 50);
    if (!ref) {
      issues.push({ row: headerAt + offset + 2, detail: 'Order ID kosong, baris dilewati' });
      return;
    }
    const qty = Math.round(amountOf(col('Quantity')));
    const line: ParsedOrderLine = {
      skuRef: (col('SKU ID') ?? '').slice(0, 50),
      sellerSku: textOrNull(col('Seller SKU'), 150),
      productName: textOrNull(col('Product Name'), 255),
      variation: textOrNull(col('Variation'), 150),
      qty,
      returnedQty: Math.round(amountOf(col('Sku Quantity of return'))),
      unitPrice: amountOf(col('SKU Unit Original Price')),
      discountPlatform: amountOf(col('SKU Platform Discount')),
      discountSeller: amountOf(col('SKU Seller Discount')),
      subtotal: amountOf(col('SKU Subtotal After Discount')),
    };
    const known = orders.get(ref);
    if (known) {
      known.lines.push(line);
      return;
    }
    orders.set(ref, {
      ref,
      status: (col('Order Status') ?? '').slice(0, 60),
      orderedAt: dateOf(col('Created Time'), true),
      paidAt: dateOf(col('Paid Time'), true),
      paymentMethod: textOrNull(col('Payment Method'), 60),
      province: textOrNull(col('Province'), 100),
      city: textOrNull(col('Regency and City'), 100),
      source: textOrNull(col('Purchase Channel') ?? col('Order Channel'), 60),
      amount: amountOf(col('Order Amount')),
      shippingFee: amountOf(col('Shipping Fee After Discount')),
      lines: [line],
    });
  });
  return { kind: 'orders', orders: [...orders.values()], issues };
};

const CORE_SETTLEMENT = new Set(
  [
    'ID Pesanan/Penyesuaian',
    'Jenis transaksi',
    'Waktu pemesanan',
    'Waktu pembayaran pesanan',
    'Mata uang',
    'Jumlah penyelesaian pembayaran',
    'Total Pendapatan',
    'Total Biaya',
    'ID pesanan terkait',
    'Detail produk terjual',
    'Sumber pesanan',
  ].map((name) => name.toLowerCase()),
);

const parseSettlements = (table: Table, headerAt: number): ParsedSalesFile => {
  const header = table[headerAt];
  const read = rowReader(header);
  const settlements: ParsedSettlement[] = [];
  const issues: SalesIssue[] = [];
  const seen = new Set<string>();
  table.slice(headerAt + 1).forEach((row, offset) => {
    const col = read(row);
    const ref = (col('ID Pesanan/Penyesuaian') ?? '').slice(0, 50);
    if (!ref) {
      issues.push({ row: headerAt + offset + 2, detail: 'ID pesanan kosong, baris dilewati' });
      return;
    }
    if (seen.has(ref)) {
      issues.push({
        row: headerAt + offset + 2,
        detail: `ID ${ref} muncul dua kali, yang pertama dipakai`,
      });
      return;
    }
    seen.add(ref);
    const label = (col('Jenis transaksi') ?? '').slice(0, 150);
    const relatedRaw = col('ID pesanan terkait') ?? '';
    const related = /^\d{6,}$/.test(relatedRaw) ? relatedRaw.slice(0, 50) : null;
    const detail: Record<string, number> = {};
    header.forEach((name, i) => {
      if (!name || CORE_SETTLEMENT.has(name.toLowerCase())) return;
      const raw = row[i];
      if (!raw || !/^-?[\d.,]+$/.test(raw)) return;
      const value = amountOf(raw);
      if (value !== 0) detail[name] = value;
    });
    settlements.push({
      ref,
      kind:
        label.toLowerCase() === 'pesanan' || (related != null && related === ref)
          ? 'order'
          : 'adjustment',
      label,
      orderRef: related ?? (label.toLowerCase() === 'pesanan' ? ref : null),
      orderedAt: dateOf(col('Waktu pemesanan'), false),
      settledAt: dateOf(col('Waktu pembayaran pesanan'), false),
      amount: amountOf(col('Jumlah penyelesaian pembayaran')),
      revenue: amountOf(col('Total Pendapatan')),
      fees: amountOf(col('Total Biaya')),
      source: textOrNull(col('Sumber pesanan'), 60),
      detail,
    });
  });
  return { kind: 'settlement', settlements, issues };
};

/** Which file this is, and its rows. Throws SalesFileError when neither header is found. */
export const parseSalesFile = async (
  buffer: Buffer,
  fileName: string,
): Promise<ParsedSalesFile> => {
  const tables = /\.xlsx?$/i.test(fileName) ? await parseWorkbook(buffer) : [parseCsv(buffer)];
  for (const table of tables) {
    const settlementAt = headerIndex(table, SETTLEMENT_KEYS);
    if (settlementAt >= 0) return parseSettlements(table, settlementAt);
  }
  for (const table of tables) {
    const ordersAt = headerIndex(table, ORDER_KEYS);
    if (ordersAt >= 0) return parseOrders(table, ordersAt);
  }
  throw new SalesFileError(
    'Not a Seller Center file: expected the order export (Order ID, SKU ID) or the income statement (ID Pesanan/Penyesuaian)',
  );
};
