import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RowDataPacket } from "mysql2";

import { pool } from "../src/db";
import { writeAuditLog } from "../src/helper/audit-log.helper";

type TranslationSeed = {
  slug: string;
  name: string;
  short_description?: string | null;
  description?: string | null;
  specifications?: unknown;
  meta_title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
};

type CategorySeed = {
  key: string;
  source_name: string;
  sort_order: number;
  translations: Record<"id-ID" | "en-US", Pick<TranslationSeed, "slug" | "name">>;
};

type ProductSeed = {
  source_row: number;
  source_number: number;
  category_key: string;
  key: string;
  sku: string;
  product_type: "physical";
  product_kind: string | null;
  unit: string | null;
  barcode: string | null;
  manufacturer_code: string | null;
  country_origin: string | null;
  origin_province: string | null;
  origin_city: string | null;
  hs_code: string | null;
  weight_grams: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  min_order_qty: number;
  lead_time_days: number | null;
  stock_status: "in_stock" | "preorder";
  is_featured: boolean;
  sort_order: number;
  status: "draft";
  translations: Record<"id-ID" | "en-US", TranslationSeed>;
  prices: Array<{
    type: string;
    label: string;
    currency: "IDR" | "USD";
    amount: number;
    is_public: boolean;
  }>;
};

type CatalogSeed = {
  schema_version: number;
  source: string;
  company_id: number;
  actor_admin_id: number;
  import_mode: "replace";
  publication_status: "draft";
  categories: CategorySeed[];
  products: ProductSeed[];
};

const SEED_PATH = resolve(
  process.cwd(),
  "database/seeds/data/20261010_product_catalog.json",
);

const requireReplaceFlag = () => {
  if (!process.argv.includes("--replace")) {
    throw new Error("Refusing to replace catalog without the --replace flag");
  }
};

const verifySeed = (seed: CatalogSeed) => {
  if (seed.schema_version !== 1 || seed.import_mode !== "replace") {
    throw new Error("Unsupported product seed contract");
  }
  if (seed.publication_status !== "draft") {
    throw new Error("This importer only accepts draft product seeds");
  }
  if (seed.categories.length !== 4 || seed.products.length !== 53) {
    throw new Error("Expected exactly 4 categories and 53 products");
  }
  const keys = new Set(seed.products.map((item) => item.key));
  const skus = new Set(seed.products.map((item) => item.sku.toLowerCase()));
  if (keys.size !== seed.products.length || skus.size !== seed.products.length) {
    throw new Error("Product keys and SKUs must be unique");
  }
  for (const product of seed.products) {
    if (product.status !== "draft") throw new Error(`${product.sku} is not draft`);
    if (!seed.categories.some((category) => category.key === product.category_key)) {
      throw new Error(`${product.sku} references an unknown category`);
    }
    if (product.prices.length !== 4 || product.prices.some((price) => price.amount == null)) {
      throw new Error(`${product.sku} does not have the four required prices`);
    }
  }
};

const main = async () => {
  requireReplaceFlag();
  const seed = JSON.parse(readFileSync(SEED_PATH, "utf8")) as CatalogSeed;
  verifySeed(seed);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [adminRows] = await connection.query<RowDataPacket[]>(
      `SELECT aa.id_admin_acct, aa.id_master_comp, aa.alias, aa.name,
              aa.admin_acct_status, aa.is_all_access, ac.access_name
       FROM admin_acct aa
       INNER JOIN admin_access ac ON ac.id_admin_access = aa.id_access
       WHERE aa.id_admin_acct = ? AND aa.id_master_comp = ?
       LIMIT 1 FOR UPDATE`,
      [seed.actor_admin_id, seed.company_id],
    );
    const actor = adminRows[0];
    if (
      !actor ||
      Number(actor.admin_acct_status) !== 1 ||
      Number(actor.is_all_access) !== 1 ||
      String(actor.access_name).toLowerCase() !== "super admin"
    ) {
      throw new Error("Configured import actor is not an active Super Admin");
    }

    await connection.query(
      `DELETE FROM product_catalog WHERE id_master_comp = ?`,
      [seed.company_id],
    );
    await connection.query(
      `UPDATE product_category SET id_parent_product_category = NULL WHERE id_master_comp = ?`,
      [seed.company_id],
    );
    await connection.query(
      `DELETE FROM product_category WHERE id_master_comp = ?`,
      [seed.company_id],
    );

    const categoryIds = new Map<string, number>();
    for (const category of seed.categories) {
      const [result] = await connection.query<any>(
        `INSERT INTO product_category
          (id_master_comp, product_category_key, product_category_status,
           product_category_is_featured, product_category_sort_order,
           id_created_by, id_updated_by)
         VALUES (?, ?, 'draft', 0, ?, ?, ?)`,
        [
          seed.company_id,
          category.key,
          category.sort_order,
          seed.actor_admin_id,
          seed.actor_admin_id,
        ],
      );
      categoryIds.set(category.key, Number(result.insertId));
      for (const locale of ["id-ID", "en-US"] as const) {
        const translation = category.translations[locale];
        await connection.query(
          `INSERT INTO product_category_i18n
            (id_product_category, id_master_comp, product_category_locale,
             product_category_slug, product_category_name,
             product_category_i18n_status)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [
            result.insertId,
            seed.company_id,
            locale,
            translation.slug,
            translation.name,
          ],
        );
      }
    }

    for (const product of seed.products) {
      const [result] = await connection.query<any>(
        `INSERT INTO product_catalog
          (id_master_comp, product_key, product_sku, product_type, product_kind,
           product_status, product_unit, product_barcode,
           product_manufacturer_code, product_country_origin,
           product_origin_province, product_origin_city, product_hs_code,
           product_weight_grams, product_length_mm, product_width_mm,
           product_height_mm, product_min_order_qty, product_lead_time_days,
           product_manage_stock, product_stock_quantity, product_stock_status,
           product_price_visibility, product_internal_commerce_enabled,
           product_is_featured, product_sort_order, id_created_by, id_updated_by)
         VALUES
          (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           0, NULL, ?, 'displayed', 0, ?, ?, ?, ?)`,
        [
          seed.company_id,
          product.key,
          product.sku,
          product.product_type,
          product.product_kind,
          product.unit,
          product.barcode,
          product.manufacturer_code,
          product.country_origin,
          product.origin_province,
          product.origin_city,
          product.hs_code,
          product.weight_grams,
          product.length_mm,
          product.width_mm,
          product.height_mm,
          product.min_order_qty,
          product.lead_time_days,
          product.stock_status,
          product.is_featured ? 1 : 0,
          product.sort_order,
          seed.actor_admin_id,
          seed.actor_admin_id,
        ],
      );
      const productId = Number(result.insertId);
      const categoryId = categoryIds.get(product.category_key);
      if (!categoryId) throw new Error(`Category missing for ${product.sku}`);

      await connection.query(
        `INSERT INTO product_catalog_category
          (id_product, id_product_category, id_master_comp, is_primary, sort_order)
         VALUES (?, ?, ?, 1, 0)`,
        [productId, categoryId, seed.company_id],
      );

      for (const locale of ["id-ID", "en-US"] as const) {
        const translation = product.translations[locale];
        await connection.query(
          `INSERT INTO product_catalog_i18n
            (id_product, id_master_comp, product_locale, product_slug,
             product_name, product_short_description, product_description,
             product_specifications_json, product_meta_title,
             product_meta_description, product_og_title,
             product_og_description, product_i18n_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            productId,
            seed.company_id,
            locale,
            translation.slug,
            translation.name,
            translation.short_description ?? null,
            translation.description ?? null,
            translation.specifications == null
              ? null
              : JSON.stringify(translation.specifications),
            translation.meta_title ?? null,
            translation.meta_description ?? null,
            translation.og_title ?? null,
            translation.og_description ?? null,
          ],
        );
      }

      for (const [sortOrder, price] of product.prices.entries()) {
        await connection.query(
          `INSERT INTO product_catalog_price
            (id_product, id_master_comp, product_price_type,
             product_price_label, product_price_currency, product_price_amount,
             product_price_is_public, product_price_is_active,
             product_price_sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            productId,
            seed.company_id,
            price.type,
            price.label,
            price.currency,
            price.amount,
            price.is_public ? 1 : 0,
            sortOrder,
          ],
        );
      }
    }

    const [[counts]] = await connection.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM product_category WHERE id_master_comp = ?) categories,
         (SELECT COUNT(*) FROM product_category_i18n WHERE id_master_comp = ?) category_i18n,
         (SELECT COUNT(*) FROM product_catalog WHERE id_master_comp = ?) products,
         (SELECT COUNT(*) FROM product_catalog_i18n WHERE id_master_comp = ?) product_i18n,
         (SELECT COUNT(*) FROM product_catalog_category WHERE id_master_comp = ?) relations,
         (SELECT COUNT(*) FROM product_catalog_price WHERE id_master_comp = ?) prices`,
      Array(6).fill(seed.company_id),
    );
    const expected = {
      categories: 4,
      category_i18n: 8,
      products: 53,
      product_i18n: 106,
      relations: 53,
      prices: 212,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (Number(counts[key]) !== value) {
        throw new Error(`Import count mismatch for ${key}: ${counts[key]} != ${value}`);
      }
    }

    await writeAuditLog({
      connection,
      writeMode: "strict",
      idMasterComp: seed.company_id,
      eventCode: "product_catalog.workbook_imported",
      category: "integration",
      module: "product",
      action: "replace_import",
      actorType: "admin",
      actorId: seed.actor_admin_id,
      actorLabel: actor.alias || actor.name,
      entityType: "product_catalog_import",
      entityId: "20261010",
      entityLabel: seed.source,
      source: "integration",
      after: counts,
      metadata: {
        source_file: seed.source,
        publication_status: seed.publication_status,
        replaced_existing_catalog: true,
      },
    });

    await connection.commit();
    console.log(
      `Imported ${counts.products} draft products, ${counts.categories} categories, and ${counts.prices} prices as ${actor.alias || actor.name} (admin ${seed.actor_admin_id}).`,
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
