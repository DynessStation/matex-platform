import { Pool, RowDataPacket } from 'mysql2/promise';

import keyhsid from '../hsid';
import { evaluateFormula, FeeRule, priceLadder, recipeHpp, roundTo } from './pricing.helper';

// Reading HPP and prices: materials at today's price, each item's last recipe, the price ladder,
// and the channel charges in force. Internal data: only ctrl/admin/costing uses this, behind its
// own permissions, and no public query touches these tables.

type Executor = Pick<Pool, 'query'>;

export interface PricingSetting {
  gpm: number;
  affiliate: number;
  app: number;
  wholesaleDiscount: number;
  usdRate: number;
  roundIdr: number;
}

export const DEFAULT_CHANNELS = [
  ['website', 'Website'],
  ['shopee', 'Shopee'],
  ['tokopedia', 'Tokopedia'],
  ['tiktok-shop', 'TikTok Shop'],
  ['lazada', 'Lazada'],
  ['blibli', 'Blibli'],
  ['reseller', 'Reseller'],
  ['affiliate', 'Affiliate'],
];

export const loadSetting = async (
  executor: Executor,
  idMasterComp: number,
): Promise<PricingSetting> => {
  await executor.query('INSERT IGNORE INTO pricing_setting (id_master_comp) VALUES (?)', [
    idMasterComp,
  ]);
  const [rows] = await executor.query<RowDataPacket[]>(
    'SELECT * FROM pricing_setting WHERE id_master_comp = ?',
    [idMasterComp],
  );
  const row = rows[0];
  return {
    gpm: Number(row.pricing_gpm),
    affiliate: Number(row.pricing_affiliate),
    app: Number(row.pricing_app),
    wholesaleDiscount: Number(row.pricing_wholesale_discount),
    usdRate: Number(row.pricing_usd_rate),
    roundIdr: Number(row.pricing_round_idr),
  };
};

export const ensureChannels = async (executor: Executor, idMasterComp: number): Promise<void> => {
  const [rows] = await executor.query<RowDataPacket[]>(
    'SELECT 1 FROM sales_channel WHERE id_master_comp = ? LIMIT 1',
    [idMasterComp],
  );
  if (rows.length) return;
  await executor.query(
    `INSERT IGNORE INTO sales_channel
       (id_master_comp, sales_channel_key, sales_channel_name, sales_channel_sort_order) VALUES ?`,
    [DEFAULT_CHANNELS.map(([key, name], index) => [idMasterComp, key, name, index])],
  );
};

/** The price in force per material: the latest whose date has come. */
export const materialPrices = async (
  executor: Executor,
  idMasterComp: number,
): Promise<Map<number, number>> => {
  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT id_cost_material, cost_material_price_amount
     FROM cost_material_price
     WHERE id_master_comp = ? AND cost_material_price_from <= CURDATE()
     ORDER BY id_cost_material, cost_material_price_from`,
    [idMasterComp],
  );
  return new Map(rows.map((row) => [row.id_cost_material, Number(row.cost_material_price_amount)]));
};

export interface CostLine {
  id: number;
  idMaterial: number | null;
  label: string;
  materialName: string | null;
  kind: string | null;
  unit: string | null;
  qty: number;
  formula: string | null;
  ownPrice: number | null;
  price: number;
  total: number;
}

export interface CostItem {
  id: number;
  key: string;
  name: string;
  group: string | null;
  idProduct: number | null;
  sku: string | null;
  productName: string | null;
  productStatus: string | null;
  idCategory: number | null;
  width: number | null;
  length: number | null;
  height: number | null;
  ownRates: { gpm: number | null; affiliate: number | null; app: number | null };
  rates: { gpm: number; affiliate: number; app: number };
  priceMode: 'follow' | 'manual';
  version: number;
  lines: CostLine[];
  hpp: number;
  net: number;
  affiliatePrice: number;
  commerce: number;
  wholesale: number;
  usd: number;
  usdWholesale: number;
  live: {
    idr: number | null;
    wholesale: number | null;
    usd: number | null;
    usdWholesale: number | null;
  };
}

const orNull = (value: unknown) => (value == null ? null : Number(value));

/** A line's quantity: its formula on the item's size when it has one that still works. */
const lineQty = (
  stored: number,
  formula: string | null,
  size: { L: number | null; P: number | null; T: number | null },
) => {
  if (!formula || size.L == null || size.P == null || size.T == null) return stored;
  try {
    return evaluateFormula(formula, { L: size.L, P: size.P, T: size.T });
  } catch {
    return stored;
  }
};

export const loadCostItems = async (
  executor: Executor,
  idMasterComp: number,
  only?: { idItem?: number; idProduct?: number },
): Promise<CostItem[]> => {
  const setting = await loadSetting(executor, idMasterComp);
  const prices = await materialPrices(executor, idMasterComp);
  const filters = ['i.id_master_comp = ?', 'i.cost_item_deleted_at IS NULL'];
  const params: unknown[] = [idMasterComp];
  if (only?.idItem) {
    filters.push('i.id_cost_item = ?');
    params.push(only.idItem);
  }
  if (only?.idProduct) {
    filters.push('i.id_product = ?');
    params.push(only.idProduct);
  }
  const [items] = await executor.query<RowDataPacket[]>(
    `SELECT i.*, p.product_sku, p.product_status, p.product_width_mm, p.product_length_mm,
       p.product_height_mm, n.product_name, c.id_product_category,
       (SELECT MAX(r.id_cost_recipe) FROM cost_recipe r WHERE r.id_cost_item = i.id_cost_item) AS id_recipe
     FROM cost_item i
     LEFT JOIN product_catalog p
       ON p.id_product = i.id_product AND p.product_deleted_at IS NULL
     LEFT JOIN product_catalog_i18n n
       ON n.id_product = p.id_product AND n.product_locale = 'id-ID'
     LEFT JOIN product_catalog_category c
       ON c.id_product = p.id_product AND c.is_primary = 1
     WHERE ${filters.join(' AND ')}
     ORDER BY i.cost_item_sort_order, i.id_cost_item`,
    params,
  );
  if (!items.length) return [];

  const recipeIds = items.map((row) => row.id_recipe).filter(Boolean);
  const [lines] = recipeIds.length
    ? await executor.query<RowDataPacket[]>(
        `SELECT l.*, r.cost_recipe_version, m.cost_material_name, m.cost_material_kind, m.cost_material_unit
         FROM cost_recipe_line l
         JOIN cost_recipe r ON r.id_cost_recipe = l.id_cost_recipe
         LEFT JOIN cost_material m ON m.id_cost_material = l.id_cost_material
         WHERE l.id_cost_recipe IN (?)
         ORDER BY l.cost_recipe_line_sort_order, l.id_cost_recipe_line`,
        [recipeIds],
      )
    : [[] as RowDataPacket[]];
  const byRecipe = new Map<number, RowDataPacket[]>();
  for (const row of lines) {
    const list = byRecipe.get(row.id_cost_recipe) ?? [];
    list.push(row);
    byRecipe.set(row.id_cost_recipe, list);
  }

  const productIds = items.map((row) => row.id_product).filter(Boolean);
  const [livePrices] = productIds.length
    ? await executor.query<RowDataPacket[]>(
        `SELECT id_product, product_price_type, product_price_currency, product_price_amount
         FROM product_catalog_price
         WHERE id_product IN (?) AND product_price_is_active = 1
         ORDER BY product_price_sort_order DESC`,
        [productIds],
      )
    : [[] as RowDataPacket[]];
  const liveOf = (idProduct: number, type: string, currency: string) => {
    const found = livePrices.find(
      (row) =>
        row.id_product === idProduct &&
        row.product_price_type === type &&
        row.product_price_currency === currency,
    );
    return found ? Number(found.product_price_amount) : null;
  };

  return items.map((row) => {
    // A product's own size counts; the item's is for those without a product yet.
    const fromProduct =
      row.product_width_mm != null &&
      row.product_length_mm != null &&
      row.product_height_mm != null;
    const size = fromProduct
      ? {
          L: Number(row.product_width_mm) / 10,
          P: Number(row.product_length_mm) / 10,
          T: Number(row.product_height_mm) / 10,
        }
      : {
          L: orNull(row.cost_item_width_cm),
          P: orNull(row.cost_item_length_cm),
          T: orNull(row.cost_item_height_cm),
        };
    const recipeLines = byRecipe.get(row.id_recipe) ?? [];
    const costLines: CostLine[] = recipeLines.map((line) => {
      const qty = lineQty(Number(line.cost_recipe_line_qty), line.cost_recipe_line_formula, size);
      const ownPrice = orNull(line.cost_recipe_line_unit_price);
      const price = ownPrice ?? prices.get(line.id_cost_material) ?? 0;
      return {
        id: line.id_cost_recipe_line,
        idMaterial: line.id_cost_material,
        label: line.cost_recipe_line_label,
        materialName: line.cost_material_name ?? null,
        kind: line.cost_material_kind ?? null,
        unit: line.cost_material_unit ?? null,
        qty,
        formula: line.cost_recipe_line_formula,
        ownPrice,
        price,
        total: qty * price,
      };
    });
    const hpp = recipeHpp(costLines.map((line) => ({ qty: line.qty, unitPrice: line.price })));
    const ownRates = {
      gpm: orNull(row.cost_item_gpm),
      affiliate: orNull(row.cost_item_affiliate),
      app: orNull(row.cost_item_app),
    };
    const rates = {
      gpm: ownRates.gpm ?? setting.gpm,
      affiliate: ownRates.affiliate ?? setting.affiliate,
      app: ownRates.app ?? setting.app,
    };
    const ladder = priceLadder(hpp, rates);
    const commerce = roundTo(ladder.commerce, setting.roundIdr);
    const wholesale = roundTo(ladder.commerce * (1 - setting.wholesaleDiscount), setting.roundIdr);
    const hasProduct = Boolean(row.product_sku);
    return {
      id: row.id_cost_item,
      key: row.cost_item_key,
      name: row.cost_item_name,
      group: row.cost_item_group,
      idProduct: hasProduct ? row.id_product : null,
      sku: row.product_sku ?? null,
      productName: row.product_name ?? null,
      productStatus: row.product_status ?? null,
      idCategory: row.id_product_category ?? null,
      width: size.L,
      length: size.P,
      height: size.T,
      ownRates,
      rates,
      priceMode: row.cost_item_price_mode === 'manual' ? 'manual' : 'follow',
      version: recipeLines[0]?.cost_recipe_version ?? 0,
      lines: costLines,
      hpp,
      net: ladder.net,
      affiliatePrice: ladder.affiliate,
      commerce,
      wholesale,
      usd: Math.round((ladder.commerce / setting.usdRate) * 100) / 100,
      usdWholesale:
        Math.round(((ladder.commerce * (1 - setting.wholesaleDiscount)) / setting.usdRate) * 100) /
        100,
      live: {
        idr: hasProduct ? liveOf(row.id_product, 'end_user', 'IDR') : null,
        wholesale: hasProduct ? liveOf(row.id_product, 'wholesale', 'IDR') : null,
        usd: hasProduct ? liveOf(row.id_product, 'end_user', 'USD') : null,
        usdWholesale: hasProduct ? liveOf(row.id_product, 'wholesale', 'USD') : null,
      },
    };
  });
};

/** Where an item's price stands, in one word for the lists and the form. */
export const priceStatus = (item: CostItem) => {
  if (!item.idProduct) return 'no_product';
  if (item.hpp <= 0) return 'no_hpp';
  if (item.priceMode === 'manual') return 'manual';
  return item.live.idr != null && Math.abs(item.live.idr - item.commerce) <= 1
    ? 'follow'
    : 'review';
};

/** HPP per kind of cost: materials, labor, overhead, packaging. */
const breakdown = (item: CostItem) => {
  const totals = new Map<string, number>();
  for (const line of item.lines) {
    const kind = line.kind ?? 'other';
    totals.set(kind, (totals.get(kind) ?? 0) + line.total);
  }
  return [...totals.entries()].map(([kind, total]) => ({ kind, total }));
};

/** The API's view of an item; `withLines` adds the recipe. */
export const costItemDto = (item: CostItem, withLines = false) => ({
  id: keyhsid.idCostItem.encode(item.id),
  name: item.name,
  group: item.group,
  sku: item.sku,
  product_id: item.idProduct ? keyhsid.idProduct.encode(item.idProduct) : null,
  product_name: item.productName,
  product_status: item.productStatus,
  width: item.width,
  length: item.length,
  height: item.height,
  rates: item.rates,
  own_rates: item.ownRates,
  price_mode: item.priceMode,
  status: priceStatus(item),
  breakdown: breakdown(item),
  version: item.version,
  hpp: item.hpp,
  net: item.net,
  affiliate_price: item.affiliatePrice,
  commerce: item.commerce,
  wholesale: item.wholesale,
  usd: item.usd,
  usd_wholesale: item.usdWholesale,
  live: {
    idr: item.live.idr,
    wholesale: item.live.wholesale,
    usd: item.live.usd,
    usd_wholesale: item.live.usdWholesale,
  },
  ...(withLines
    ? {
        lines: item.lines.map((line) => ({
          material_id: line.idMaterial ? keyhsid.idCostMaterial.encode(line.idMaterial) : null,
          label: line.label,
          material_name: line.materialName,
          kind: line.kind,
          unit: line.unit,
          qty: line.qty,
          formula: line.formula,
          own_price: line.ownPrice,
          price: line.price,
          total: line.total,
        })),
      }
    : {}),
});

/** The charges of each active channel today, narrowed to the item's category. */
export const channelRules = async (
  executor: Executor,
  idMasterComp: number,
  idCategory: number | null,
) => {
  await ensureChannels(executor, idMasterComp);
  const [channels] = await executor.query<RowDataPacket[]>(
    `SELECT id_sales_channel, sales_channel_name FROM sales_channel
     WHERE id_master_comp = ? AND sales_channel_status = 1 AND sales_channel_deleted_at IS NULL
     ORDER BY sales_channel_sort_order, id_sales_channel`,
    [idMasterComp],
  );
  const [fees] = await executor.query<RowDataPacket[]>(
    `SELECT * FROM sales_channel_fee
     WHERE id_master_comp = ? AND sales_channel_fee_from <= CURDATE()
       AND (sales_channel_fee_to IS NULL OR sales_channel_fee_to >= CURDATE())
       AND (id_product_category IS NULL OR id_product_category = ?)`,
    [idMasterComp, idCategory ?? 0],
  );
  return channels.map((channel) => {
    const own = fees.filter((fee) => fee.id_sales_channel === channel.id_sales_channel);
    const specific = new Set(
      own.filter((fee) => fee.id_product_category).map((fee) => fee.sales_channel_fee_name),
    );
    const rules: FeeRule[] = own
      // A charge set for this category replaces the general charge of the same name.
      .filter((fee) => fee.id_product_category || !specific.has(fee.sales_channel_fee_name))
      .map((fee) => ({
        name: fee.sales_channel_fee_name,
        type: fee.sales_channel_fee_type,
        value:
          fee.sales_channel_fee_type === 'percent'
            ? Number(fee.sales_channel_fee_value) / 100
            : Number(fee.sales_channel_fee_value),
        cap: orNull(fee.sales_channel_fee_cap),
        per: fee.sales_channel_fee_per,
      }));
    return { id: channel.id_sales_channel, name: channel.sales_channel_name, rules };
  });
};
