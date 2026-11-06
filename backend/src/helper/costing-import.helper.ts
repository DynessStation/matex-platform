import ExcelJS from 'exceljs';

import { recipeHpp } from './pricing.helper';

// Reads the workbook of production and marketing (KATEGORI PRODUCT MATEX): the price sheet, the
// cost sheets it points at, and the SKUs of its product sheet. Nothing is written here; the
// routes in ctrl/admin/costing/import.ts show the report first and save on request.
// Every item's lines add up to the HPP of the price sheet: what cannot be read from its columns
// becomes a line of its own, and the report says so.

export interface ParsedLine {
  label: string;
  kind: string;
  unit: string;
  qty: number;
  /** The material's price in the workbook. */
  price: number;
  /** Set when qty x price is not what the workbook charges for this line. */
  unitPrice: number | null;
}

export interface ParsedItem {
  row: number;
  key: string;
  sku: string | null;
  name: string;
  group: string;
  width: number | null;
  length: number | null;
  height: number | null;
  gpm: number;
  affiliate: number;
  app: number;
  hpp: number;
  net: number;
  affiliatePrice: number;
  commerce: number;
  lines: ParsedLine[];
}

export interface ImportIssue {
  kind: string;
  row: number | null;
  item: string | null;
  detail: string;
}

export interface ParsedWorkbook {
  items: ParsedItem[];
  issues: ImportIssue[];
}

export class WorkbookError extends Error {}

const PRICE_SHEET = 'KATEGORI DAN PRODUK';
const COST_SHEET = 'DETAIL HITUNGAN';
const PART_SHEET = 'MOCO';
const PRODUCT_SHEET = 'PRODUCT';

type Sheet = ExcelJS.Worksheet;

/** A cell's value: the stored result for a formula, the text of rich text. */
const valueOf = (sheet: Sheet, address: string): unknown => {
  const value = sheet.getCell(address).value;
  if (value && typeof value === 'object') {
    if ('result' in value) return value.result;
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return value.text;
    if ('formula' in value || 'sharedFormula' in value) return null;
  }
  return value;
};
const num = (sheet: Sheet, address: string): number | null => {
  const value = valueOf(sheet, address);
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const text = (sheet: Sheet, address: string): string => {
  const value = valueOf(sheet, address);
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};
const formulaOf = (sheet: Sheet, address: string): string => {
  const value = sheet.getCell(address).value;
  return value && typeof value === 'object' && 'formula' in value ? String(value.formula) : '';
};
const close = (a: number, b: number, tolerance = 1) => Math.abs(a - b) <= tolerance;

/** A cell's own formula, or the formula of the cell it shares one with. */
const sharedFormulaOf = (sheet: Sheet, address: string): string => {
  const value = sheet.getCell(address).value;
  if (!value || typeof value !== 'object') return '';
  if ('formula' in value && value.formula) return String(value.formula);
  if ('sharedFormula' in value) return formulaOf(sheet, String(value.sharedFormula));
  return '';
};

/** Some rows of the cost sheet show an inner cover that their total leaves out. */
const innerCounts = (sheet: Sheet, row: number): boolean => {
  const total = sharedFormulaOf(sheet, `AP${row}`);
  if (/AC\d/.test(total)) return true;
  const subtotal = sharedFormulaOf(sheet, `AL${row}`);
  return !subtotal || /AC\d/.test(subtotal);
};

/** The row of the given sheet this formula reads, in the shape 'SHEET'!COL123. */
const reference = (formula: string, sheetName: string): { col: string; row: number } | null => {
  const match = formula.match(new RegExp(`'?${sheetName}'?!\\$?([A-Z]+)\\$?(\\d+)`));
  return match ? { col: match[1], row: Number(match[2]) } : null;
};

const kindOf = (label: string): string => {
  const name = label.toLowerCase();
  if (/ongkir/.test(name)) return 'shipping';
  if (/jasa|jahit/.test(name)) return 'service';
  if (/kemasan|pack|plastik|kardus|label/.test(name)) return 'packaging';
  return 'material';
};

const line = (
  label: string,
  unit: string,
  qty: number,
  price: number,
  total: number,
): ParsedLine => ({
  label,
  kind: kindOf(label),
  unit,
  qty,
  price,
  unitPrice: close(qty * price, total) ? null : total / (qty || 1),
});
const flat = (label: string, amount: number): ParsedLine => line(label, 'pcs', 1, amount, amount);

//==================================================
//==== COST SHEET
//==================================================

/** The header row above an item, which says how this section uses its columns. */
const sectionColumnX = (sheet: Sheet, row: number): string => {
  for (let at = row; at > 0; at -= 1) {
    // The header spans two rows: its first row names the column.
    if (text(sheet, `A${at}`) === 'NO' && text(sheet, `A${at - 1}`) !== 'NO') {
      return text(sheet, `X${at}`);
    }
  }
  return '';
};

const costLines = (
  sheet: Sheet,
  row: number,
  onLeftOut: (amount: number) => void,
): ParsedLine[] => {
  const n = (col: string) => num(sheet, `${col}${row}`) ?? 0;
  const lines: ParsedLine[] = [];
  const section = sectionColumnX(sheet, row);
  const custom = section === 'JASA' || section === 'FIBRE';

  if (n('L') > 0) {
    const label = custom ? 'Jok original' : 'Rebondid';
    lines.push(line(label, custom ? 'pcs' : 'kg', n('J') || 1, n('K') || n('L'), n('L')));
  }
  if (n('T') > 0) {
    const gress = n('S') < 1_000_000;
    const unit = gress ? 'kg' : 'm3';
    lines.push(line(gress ? 'Gress' : 'Topper latex', unit, n('R') || 1, n('S') || n('T'), n('T')));
  }
  if (section === 'JASA') {
    if (n('X') > 0) lines.push(flat('Jasa papas dan pasang latex', n('X')));
    if (n('AE') > 0) lines.push(flat('Kemasan plastik', n('AE')));
    if (n('AG') > 0) lines.push(flat('Ongkir', n('AG')));
    return lines;
  }
  if (section === 'FIBRE') {
    if (n('X') > 0) lines.push(flat('Fibre', n('X')));
    if (n('Y') > 0) lines.push(flat('Kulit jok', n('Y')));
    if (n('AA') > 0) lines.push(flat('Jasa pasang', n('AA')));
    if (n('AC') > 0) lines.push(flat('Label', n('AC')));
    if (n('AE') > 0) lines.push(flat('Kemasan plastik', n('AE')));
    if (n('AG') > 0) lines.push(flat('Ongkir', n('AG')));
    return lines;
  }
  if (innerCounts(sheet, row)) {
    if (n('AA') > 0) {
      const name = text(sheet, `X${row}`) || 'Inner';
      lines.push(line(`Kain inner ${name}`, 'm', n('Y') || 1, n('Z') || n('AA'), n('AA')));
    }
    if (n('AB') > 0) lines.push(flat('Jasa jahit inner', n('AB')));
  } else if (n('AC') > 0) {
    onLeftOut(n('AC'));
  }
  if (n('AH') > 0) {
    const name = text(sheet, `AE${row}`) || 'Outer';
    // Insoles are charged by area: the quantity is in cm2, the price per m2.
    const byArea = close((n('AG') * n('AF')) / 10000, n('AH'));
    const qty = byArea ? n('AF') / 10000 : n('AF') || 1;
    lines.push(line(`Kain outer ${name}`, byArea ? 'm2' : 'm', qty, n('AG') || n('AH'), n('AH')));
  }
  if (n('AI') > 0) lines.push(flat('Jasa jahit outer', n('AI')));
  if (n('AN') > 0) lines.push(flat('Kemasan dan pengiriman', n('AN')));
  return lines;
};

//==================================================
//==== PART SHEET
//==================================================

const partBlock = (sheet: Sheet, totalRow: number) => {
  const lines: ParsedLine[] = [];
  let at = totalRow - 1;
  for (; at > 0 && text(sheet, `A${at}`) !== 'NO'; at -= 1) {
    const total = num(sheet, `I${at}`);
    if (num(sheet, `A${at}`) == null || total == null) continue;
    const part = text(sheet, `B${at}`);
    const detail = text(sheet, `C${at}`);
    const label = detail ? `${part} ${detail}` : part;
    const unit = /KAIN|COVER/.test(part) ? 'm' : /REBONDID/.test(part) ? 'kg' : 'pcs';
    const price = num(sheet, `H${at}`) ?? total;
    const volume = num(sheet, `F${at}`);
    const byVolume = volume != null && close(price * volume, total);
    lines.unshift(
      line(
        label,
        byVolume ? 'm3' : unit,
        byVolume ? volume : (num(sheet, `G${at}`) ?? 1),
        price,
        total,
      ),
    );
  }
  const head = at - 1;
  return {
    lines,
    width: num(sheet, `D${head}`),
    length: num(sheet, `E${head}`),
    height: num(sheet, `F${head}`),
  };
};

//==================================================
//==== WORKBOOK
//==================================================

const sameSizes = (a: (number | null)[], b: (number | null)[]) => {
  const sort = (values: (number | null)[]) => values.map(Number).sort((x, y) => x - y);
  const [left, right] = [sort(a), sort(b)];
  return left.every((value, index) => close(value, right[index], 0.01));
};

const productsByRow = (sheet: Sheet | undefined) => {
  const found = new Map<number, { sku: string; sizes: (number | null)[] }>();
  if (!sheet) return found;
  sheet.eachRow((_row, rowNumber) => {
    const sku = text(sheet, `V${rowNumber}`);
    const target = reference(formulaOf(sheet, `AM${rowNumber}`), PRICE_SHEET);
    if (!sku || !target) return;
    const mm = ['AG', 'AF', 'AH'].map((col) => num(sheet, `${col}${rowNumber}`));
    found.set(target.row, { sku, sizes: mm.map((value) => (value == null ? null : value / 10)) });
  });
  return found;
};

export const parseCostingWorkbook = async (file: Buffer): Promise<ParsedWorkbook> => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(file as unknown as ArrayBuffer);
  } catch {
    throw new WorkbookError('The file is not a readable Excel workbook');
  }
  const prices = workbook.getWorksheet(PRICE_SHEET);
  const costs = workbook.getWorksheet(COST_SHEET);
  if (!prices || !costs) {
    throw new WorkbookError(`The sheets ${PRICE_SHEET} and ${COST_SHEET} are required`);
  }
  const parts = workbook.getWorksheet(PART_SHEET);
  const products = productsByRow(workbook.getWorksheet(PRODUCT_SHEET));

  const items: ParsedItem[] = [];
  const issues: ImportIssue[] = [];
  let main = '';
  let sub = '';

  for (let row = 1; row <= prices.rowCount; row += 1) {
    const b = valueOf(prices, `B${row}`);
    const c = text(prices, `C${row}`);
    const hpp = num(prices, `I${row}`);
    if (num(prices, `A${row}`) != null && typeof b === 'string') {
      main = text(prices, `B${row}`);
      sub = '';
      continue;
    }
    if (typeof b === 'string' && /^[A-Z]$/.test(b.trim()) && c && hpp == null) {
      sub = c;
      continue;
    }
    if (typeof b !== 'number' || !c || hpp == null) continue;

    const group = sub ? `${main} / ${sub}` : main;
    const issue = (kind: string, detail: string) => issues.push({ kind, row, item: c, detail });
    const formula = formulaOf(prices, `I${row}`);
    const costRef = reference(formula, COST_SHEET);
    const partRef = parts ? reference(formula, PART_SHEET) : null;

    let width = num(prices, `E${row}`);
    let length = num(prices, `F${row}`);
    let height = num(prices, `G${row}`);
    if (/SHOES/.test(main)) {
      width = null;
      length = null;
      height = null;
    }

    let lines: ParsedLine[] = [];
    if (costRef) {
      lines = costLines(costs, costRef.row, (amount) =>
        issue('inner_left_out', `Inner ${amount} tertulis di rincian, tetapi tidak ikut HPP Excel`),
      );
      const detail = ['C', 'D', 'E'].map((col) => num(costs, `${col}${costRef.row}`));
      if (
        width != null &&
        detail.every((value) => value != null) &&
        !sameSizes([width, length, height], detail)
      ) {
        issue('size_cost_sheet', `${width}x${length}x${height} lawan ${detail.join('x')}`);
      }
    } else if (partRef && parts) {
      const block = partBlock(parts, partRef.row);
      lines = block.lines;
      if (width == null) {
        width = block.width;
        length = block.length;
        height = block.height;
      }
    }
    if (!lines.length) issue('no_recipe', 'Rincian HPP tidak terbaca');
    for (const parsed of lines) {
      if (parsed.unitPrice != null) {
        issue(
          'line_price',
          `${parsed.label}: ${parsed.qty} x ${parsed.price} tidak sama dengan yang dihitung Excel`,
        );
      }
    }
    const sum = recipeHpp(
      lines.map((item) => ({ qty: item.qty, unitPrice: item.unitPrice ?? item.price })),
    );
    if (!close(sum, hpp)) {
      lines.push(flat('Selisih Excel', hpp - sum));
      issue('difference', `Rincian ${sum.toFixed(2)}, HPP Excel ${hpp.toFixed(2)}`);
    }

    const product = products.get(row);
    if (product && width != null && !sameSizes([width, length, height], product.sizes)) {
      issue(
        'size_product_sheet',
        `${width}x${length}x${height} cm lawan ${product.sizes.join('x')} cm di sheet PRODUCT`,
      );
    }
    if (width == null && !/SHOES/.test(main)) issue('no_size', 'Ukuran belum ada');

    const gpm = num(prices, `J${row}`) ?? 0;
    if (gpm >= 0.4) issue('high_gpm', `GPM ${Math.round(gpm * 100)}%`);
    const size = [width, length, height].map((value) => value ?? '').join('x');
    items.push({
      row,
      key: (product?.sku ?? `${group}|${c}|${size}`).slice(0, 190),
      sku: product?.sku ?? null,
      name: c,
      group,
      width,
      length,
      height,
      gpm,
      affiliate: num(prices, `M${row}`) ?? 0,
      app: num(prices, `P${row}`) ?? 0,
      hpp,
      net: num(prices, `K${row}`) ?? 0,
      affiliatePrice: num(prices, `N${row}`) ?? 0,
      commerce: num(prices, `Q${row}`) ?? 0,
      lines,
    });
  }

  if (!items.length) throw new WorkbookError('No priced items were found in the workbook');
  return { items, issues };
};
