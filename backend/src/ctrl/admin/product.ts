import express = require("express");
import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import db = require("../../db");
import keyhsid from "../../hsid";
import {
  PUBLIC_CONTENT_LOCALES,
  isPublicContentLocale,
  normalizePublicContentKey,
} from "../../config/public-content.config";
import { getAdminScope } from "../../helper/admin-scope.helper";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { writeAuditLog } from "../../helper/audit-log.helper";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";

const app = express();
const { pool } = db;
const statuses = new Set(["draft", "published", "archived"]);
const types = new Set(["physical", "service", "digital"]);
const stocks = new Set(["in_stock", "out_of_stock", "preorder", "made_to_order"]);
const priceVisibilities = new Set(["displayed", "contact", "hidden"]);
const roles = new Set(["thumbnail", "gallery", "og", "size_chart", "document"]);
const decode = (value: unknown, codec: any) => {
  const id = Number(codec.decode(String(value ?? ""))[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const numberOrNull = (value: unknown) =>
  value === "" || value == null || !Number.isFinite(Number(value)) ? null : Number(value);

const parsePayload = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const sku = clean(body?.sku, 120);
  const status = String(body?.status ?? "draft");
  const productType = String(body?.product_type ?? "physical");
  const stockStatus = String(body?.stock_status ?? "in_stock");
  const priceVisibility = String(body?.price_visibility ?? "contact");
  if (!key || !sku || !statuses.has(status) || !types.has(productType) ||
      !stocks.has(stockStatus) || !priceVisibilities.has(priceVisibility) ||
      !Array.isArray(body?.translations)) return null;

  const translations: any[] = [];
  const locales = new Set<string>();
  for (const item of body.translations) {
    const locale = String(item?.locale ?? "");
    const slug = normalizePublicContentKey(item?.slug).slice(0, 255);
    const name = clean(item?.name, 255);
    if (!isPublicContentLocale(locale) || locales.has(locale) || !slug || !name) return null;
    locales.add(locale);
    translations.push({
      locale, slug, name,
      shortDescription: clean(item?.short_description, 4000) || null,
      description: String(item?.description ?? "").trim().slice(0, 100000) || null,
      specifications: item?.specifications ?? null,
      metaTitle: clean(item?.meta_title, 255) || null,
      metaDescription: clean(item?.meta_description, 500) || null,
      canonicalUrl: clean(item?.canonical_url, 1000) || null,
      ogTitle: clean(item?.og_title, 255) || null,
      ogDescription: clean(item?.og_description, 500) || null,
      status: Number(item?.status) === 0 ? 0 : 1,
    });
  }
  if (!PUBLIC_CONTENT_LOCALES.every((locale) => locales.has(locale))) return null;

  const categoryIds = [...new Set((Array.isArray(body?.category_ids) ? body.category_ids : [])
    .map((id: unknown) => decode(id, keyhsid.idProductCategory)).filter(Boolean))] as number[];
  const media = (Array.isArray(body?.media) ? body.media : []).map((item: any, index: number) => ({
    id: decode(item?.id, keyhsid.idAttachment), role: String(item?.role ?? "gallery"),
    sortOrder: Math.max(0, Number(item?.sort_order) || index),
  }));
  if (media.some((item: any) => !item.id || !roles.has(item.role))) return null;
  const prices = (Array.isArray(body?.prices) ? body.prices : []).map((item: any, index: number) => ({
    type: clean(item?.type, 40), label: clean(item?.label, 120) || null,
    currency: clean(item?.currency || "IDR", 3).toUpperCase(), amount: numberOrNull(item?.amount),
    compareAt: numberOrNull(item?.compare_at), minQty: numberOrNull(item?.min_qty), maxQty: numberOrNull(item?.max_qty),
    startsAt: item?.starts_at || null, endsAt: item?.ends_at || null,
    isPublic: item?.is_public ? 1 : 0, isActive: item?.is_active === false ? 0 : 1,
    sortOrder: Math.max(0, Number(item?.sort_order) || index),
  }));
  if (prices.some((item: any) => !item.type || item.amount == null || item.amount < 0 || item.currency.length !== 3)) return null;
  const marketplaces = (Array.isArray(body?.marketplaces) ? body.marketplaces : []).map((item: any, index: number) => ({
    provider: clean(item?.provider, 50), label: clean(item?.label, 120) || null,
    url: clean(item?.url, 1000), sku: clean(item?.sku, 120) || null,
    price: numberOrNull(item?.price), currency: clean(item?.currency || "IDR", 3).toUpperCase(),
    isPrimary: item?.is_primary ? 1 : 0, isActive: item?.is_active === false ? 0 : 1,
    sortOrder: Math.max(0, Number(item?.sort_order) || index),
  }));
  if (marketplaces.some((item: any) => !item.provider || !/^https?:\/\//i.test(item.url))) return null;

  return {
    key, sku, status, productType, stockStatus, priceVisibility, categoryIds, media, prices, marketplaces, translations,
    unit: clean(body?.unit, 40) || null, barcode: clean(body?.barcode, 120) || null,
    manufacturerCode: clean(body?.manufacturer_code, 120) || null,
    countryOrigin: clean(body?.country_origin, 100) || null, hsCode: clean(body?.hs_code, 50) || null,
    weight: numberOrNull(body?.weight_grams), length: numberOrNull(body?.length_mm),
    width: numberOrNull(body?.width_mm), height: numberOrNull(body?.height_mm),
    minOrderQty: numberOrNull(body?.min_order_qty) ?? 1, leadTimeDays: numberOrNull(body?.lead_time_days),
    manageStock: body?.manage_stock ? 1 : 0, stockQuantity: numberOrNull(body?.stock_quantity),
    internalCommerce: body?.internal_commerce_enabled ? 1 : 0,
    isFeatured: body?.is_featured ? 1 : 0, sortOrder: Math.max(0, Number(body?.sort_order) || 0),
  };
};

const mediaDto = (row: any) => ({
  id_attachment: keyhsid.idAttachment.encode(Number(row.id_attachment)),
  asset_url: buildAttachmentUrl(row.storage_path), original_url: buildAttachmentUrl(row.storage_path),
  name: row.name ?? "", width: row.width == null ? null : Number(row.width),
  height: row.height == null ? null : Number(row.height), mime_type: row.mime_type ?? "",
  role: row.product_attachment_role, sort_order: Number(row.product_attachment_sort_order),
});

const hydrate = async (rows: RowDataPacket[], company: number, locale: string) => {
  if (!rows.length) return [];
  const ids = rows.map((row) => Number(row.id_product));
  const marks = ids.map(() => "?").join(",");
  const [categories] = await pool.query<RowDataPacket[]>(
    `SELECT pc.id_product,c.id_product_category,i.product_category_name,i.product_category_slug
     FROM product_catalog_category pc JOIN product_category c ON c.id_product_category=pc.id_product_category AND c.id_master_comp=pc.id_master_comp
     LEFT JOIN product_category_i18n i ON i.id_product_category=c.id_product_category AND i.product_category_locale=?
     WHERE pc.id_product IN (${marks}) AND pc.id_master_comp=? ORDER BY pc.sort_order`, [locale, ...ids, company]);
  const [media] = await pool.query<RowDataPacket[]>(
    `SELECT pa.id_product,pa.product_attachment_role,pa.product_attachment_sort_order,a.*
     FROM product_catalog_attachment pa JOIN attachment a ON a.id_attachment=pa.id_attachment
     WHERE pa.id_product IN (${marks}) AND pa.id_master_comp=? ORDER BY pa.product_attachment_sort_order`, [...ids, company]);
  const [prices] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM product_catalog_price WHERE id_product IN (${marks}) AND id_master_comp=? ORDER BY product_price_sort_order`, [...ids, company]);
  const [marketplaces] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM product_catalog_marketplace WHERE id_product IN (${marks}) AND id_master_comp=? ORDER BY product_marketplace_sort_order`, [...ids, company]);
  return rows.map((row) => {
    const id = Number(row.id_product);
    const productMedia = media.filter((item) => Number(item.id_product) === id).map(mediaDto);
    const productPrices = prices.filter((item) => Number(item.id_product) === id).map((item) => ({
      id: Number(item.id_product_price), type: item.product_price_type, label: item.product_price_label,
      currency: item.product_price_currency, amount: Number(item.product_price_amount),
      compare_at: item.product_price_compare_at == null ? null : Number(item.product_price_compare_at),
      min_qty: item.product_price_min_qty == null ? null : Number(item.product_price_min_qty),
      max_qty: item.product_price_max_qty == null ? null : Number(item.product_price_max_qty),
      starts_at: item.product_price_starts_at, ends_at: item.product_price_ends_at,
      is_public: Boolean(item.product_price_is_public), is_active: Boolean(item.product_price_is_active),
      sort_order: Number(item.product_price_sort_order),
    }));
    const publicPrice = productPrices.find((item) => item.is_public) ?? productPrices[0];
    return {
      ...row, id: keyhsid.idProduct.encode(id), key: row.product_key, sku: row.product_sku,
      name: row.product_name ?? row.product_key, slug: row.product_slug ?? "",
      short_description: row.product_short_description ?? "", description: row.product_description ?? "",
      product_type: row.product_type, status: row.product_status, stock_status: row.product_stock_status,
      quantity: row.product_stock_quantity == null ? 0 : Number(row.product_stock_quantity),
      price_visibility: row.product_price_visibility, price: publicPrice?.amount ?? 0,
      sale_price: publicPrice?.amount ?? 0, is_featured: Boolean(row.product_is_featured),
      sort_order: Number(row.product_sort_order), product_thumbnail: productMedia.find((item) => item.role === "thumbnail") ?? null,
      product_galleries: productMedia.filter((item) => item.role === "gallery"), media: productMedia,
      categories: categories.filter((item) => Number(item.id_product) === id).map((item) => ({
        id: keyhsid.idProductCategory.encode(Number(item.id_product_category)),
        name: item.product_category_name, slug: item.product_category_slug,
      })), prices: productPrices,
      marketplaces: marketplaces.filter((item) => Number(item.id_product) === id).map((item) => ({
        id: Number(item.id_product_marketplace), provider: item.product_marketplace_provider,
        label: item.product_marketplace_label, url: item.product_marketplace_url, sku: item.product_marketplace_sku,
        price: item.product_marketplace_price == null ? null : Number(item.product_marketplace_price),
        currency: item.product_marketplace_currency, is_primary: Boolean(item.product_marketplace_is_primary),
        is_active: Boolean(item.product_marketplace_is_active), sort_order: Number(item.product_marketplace_sort_order),
      })),
    };
  });
};

const baseSelect = `SELECT p.*,i.product_slug,i.product_name,i.product_short_description,i.product_description,
 i.product_specifications_json,i.product_meta_title,i.product_meta_description,i.product_canonical_url,
 i.product_og_title,i.product_og_description FROM product_catalog p
 LEFT JOIN product_catalog_i18n i ON i.id_product=p.id_product AND i.product_locale=?`;

app.get("/api/v1/products", verifyToken, requirePermission("product.view"), async (req: AuthRequest, res: Response) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const locale = isPublicContentLocale(req.query.locale) ? String(req.query.locale) : "id-ID";
  const search = clean(req.query.search, 200), like = `%${search}%`;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`${baseSelect} WHERE p.id_master_comp=? AND p.product_deleted_at IS NULL
      AND (?='' OR p.product_key LIKE ? OR p.product_sku LIKE ? OR i.product_name LIKE ?)
      ORDER BY p.product_sort_order,i.product_name`, [locale, scope.idMasterComp, search, like, like, like]);
    const data = await hydrate(rows, scope.idMasterComp, locale);
    return sendSuccess(res, 200, "PRODUCTS_LISTED", "Products loaded", { data, total: data.length });
  } catch (error) { console.error("[Product] list failed", error); return sendError(res, 500, "PRODUCT_LIST_FAILED", "Unable to load products"); }
});

app.get("/api/v1/products/:id", verifyToken, requirePermission("product.view"), async (req: AuthRequest, res: Response) => {
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const id = decode(req.params.id, keyhsid.idProduct);
  if (!id) return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found");
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM product_catalog WHERE id_product=? AND id_master_comp=? AND product_deleted_at IS NULL`, [id, scope.idMasterComp]);
    if (!rows.length) return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found");
    const [translations] = await pool.query<RowDataPacket[]>(`SELECT product_locale locale,product_slug slug,product_name name,
      product_short_description short_description,product_description description,product_specifications_json specifications,
      product_meta_title meta_title,product_meta_description meta_description,product_canonical_url canonical_url,
      product_og_title og_title,product_og_description og_description,product_i18n_status status
      FROM product_catalog_i18n WHERE id_product=? AND id_master_comp=? ORDER BY product_locale`, [id, scope.idMasterComp]);
    const [product] = await hydrate(rows, scope.idMasterComp, "id-ID");
    return sendSuccess(res, 200, "PRODUCT_FOUND", "Product loaded", { ...product, translations });
  } catch (error) { console.error("[Product] detail failed", error); return sendError(res, 500, "PRODUCT_LOAD_FAILED", "Unable to load product"); }
});

const save = async (req: AuthRequest, res: Response, id: number | null) => {
  const updating = Boolean(id);
  const scope = await getAdminScope(req, pool);
  if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const payload = parsePayload(req.body);
  if (!payload) return sendError(res, 400, "PRODUCT_PAYLOAD_INVALID", "Product data is incomplete or invalid");
  const cx = await pool.getConnection();
  try {
    await cx.beginTransaction();
    if (id) {
      const [exists] = await cx.query<RowDataPacket[]>(`SELECT id_product FROM product_catalog WHERE id_product=? AND id_master_comp=? AND product_deleted_at IS NULL FOR UPDATE`, [id, scope.idMasterComp]);
      if (!exists.length) { await cx.rollback(); return sendError(res, 404, "PRODUCT_NOT_FOUND", "Product not found"); }
      await cx.query(`UPDATE product_catalog SET product_key=?,product_sku=?,product_type=?,product_status=?,product_unit=?,product_barcode=?,product_manufacturer_code=?,product_country_origin=?,product_hs_code=?,product_weight_grams=?,product_length_mm=?,product_width_mm=?,product_height_mm=?,product_min_order_qty=?,product_lead_time_days=?,product_manage_stock=?,product_stock_quantity=?,product_stock_status=?,product_price_visibility=?,product_internal_commerce_enabled=?,product_is_featured=?,product_sort_order=?,id_updated_by=? WHERE id_product=? AND id_master_comp=?`, [payload.key,payload.sku,payload.productType,payload.status,payload.unit,payload.barcode,payload.manufacturerCode,payload.countryOrigin,payload.hsCode,payload.weight,payload.length,payload.width,payload.height,payload.minOrderQty,payload.leadTimeDays,payload.manageStock,payload.stockQuantity,payload.stockStatus,payload.priceVisibility,payload.internalCommerce,payload.isFeatured,payload.sortOrder,scope.idAdminAcct,id,scope.idMasterComp]);
    } else {
      const [result] = await cx.query<ResultSetHeader>(`INSERT INTO product_catalog(id_master_comp,product_key,product_sku,product_type,product_status,product_unit,product_barcode,product_manufacturer_code,product_country_origin,product_hs_code,product_weight_grams,product_length_mm,product_width_mm,product_height_mm,product_min_order_qty,product_lead_time_days,product_manage_stock,product_stock_quantity,product_stock_status,product_price_visibility,product_internal_commerce_enabled,product_is_featured,product_sort_order,id_created_by,id_updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [scope.idMasterComp,payload.key,payload.sku,payload.productType,payload.status,payload.unit,payload.barcode,payload.manufacturerCode,payload.countryOrigin,payload.hsCode,payload.weight,payload.length,payload.width,payload.height,payload.minOrderQty,payload.leadTimeDays,payload.manageStock,payload.stockQuantity,payload.stockStatus,payload.priceVisibility,payload.internalCommerce,payload.isFeatured,payload.sortOrder,scope.idAdminAcct,scope.idAdminAcct]);
      id = result.insertId;
    }
    await cx.query(`DELETE FROM product_catalog_i18n WHERE id_product=? AND id_master_comp=?`, [id, scope.idMasterComp]);
    for (const item of payload.translations) await cx.query(`INSERT INTO product_catalog_i18n(id_product,id_master_comp,product_locale,product_slug,product_name,product_short_description,product_description,product_specifications_json,product_meta_title,product_meta_description,product_canonical_url,product_og_title,product_og_description,product_i18n_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [id,scope.idMasterComp,item.locale,item.slug,item.name,item.shortDescription,item.description,item.specifications==null?null:JSON.stringify(item.specifications),item.metaTitle,item.metaDescription,item.canonicalUrl,item.ogTitle,item.ogDescription,item.status]);
    await cx.query(`DELETE FROM product_catalog_category WHERE id_product=? AND id_master_comp=?`, [id, scope.idMasterComp]);
    for (let index=0; index<payload.categoryIds.length; index++) {
      const categoryId=payload.categoryIds[index];
      const [valid]=await cx.query<RowDataPacket[]>(`SELECT id_product_category FROM product_category WHERE id_product_category=? AND id_master_comp=? AND product_category_deleted_at IS NULL`,[categoryId,scope.idMasterComp]);
      if(!valid.length){await cx.rollback();return sendError(res,400,"PRODUCT_CATEGORY_INVALID","Selected category is unavailable");}
      await cx.query(`INSERT INTO product_catalog_category(id_product,id_product_category,id_master_comp,is_primary,sort_order) VALUES(?,?,?,?,?)`,[id,categoryId,scope.idMasterComp,index===0?1:0,index]);
    }
    await cx.query(`DELETE FROM product_catalog_attachment WHERE id_product=? AND id_master_comp=?`, [id, scope.idMasterComp]);
    for(const item of payload.media){const [valid]=await cx.query<RowDataPacket[]>(`SELECT id_attachment FROM attachment WHERE id_attachment=? AND id_master_comp=? AND attachment_status=1 AND deleted_at IS NULL`,[item.id,scope.idMasterComp]);if(!valid.length){await cx.rollback();return sendError(res,400,"PRODUCT_MEDIA_INVALID","Selected media is unavailable");}await cx.query(`INSERT INTO product_catalog_attachment(id_product,id_master_comp,id_attachment,product_attachment_role,product_attachment_sort_order) VALUES(?,?,?,?,?)`,[id,scope.idMasterComp,item.id,item.role,item.sortOrder]);}
    await cx.query(`DELETE FROM product_catalog_price WHERE id_product=? AND id_master_comp=?`, [id, scope.idMasterComp]);
    for(const item of payload.prices)await cx.query(`INSERT INTO product_catalog_price(id_product,id_master_comp,product_price_type,product_price_label,product_price_currency,product_price_amount,product_price_compare_at,product_price_min_qty,product_price_max_qty,product_price_starts_at,product_price_ends_at,product_price_is_public,product_price_is_active,product_price_sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,scope.idMasterComp,item.type,item.label,item.currency,item.amount,item.compareAt,item.minQty,item.maxQty,item.startsAt,item.endsAt,item.isPublic,item.isActive,item.sortOrder]);
    await cx.query(`DELETE FROM product_catalog_marketplace WHERE id_product=? AND id_master_comp=?`, [id, scope.idMasterComp]);
    for(const item of payload.marketplaces)await cx.query(`INSERT INTO product_catalog_marketplace(id_product,id_master_comp,product_marketplace_provider,product_marketplace_label,product_marketplace_url,product_marketplace_sku,product_marketplace_price,product_marketplace_currency,product_marketplace_is_primary,product_marketplace_is_active,product_marketplace_sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,[id,scope.idMasterComp,item.provider,item.label,item.url,item.sku,item.price,item.currency,item.isPrimary,item.isActive,item.sortOrder]);
    await writeAuditLog({
      req, connection: cx, writeMode: "strict", idMasterComp: scope.idMasterComp,
      eventCode: updating ? "product.updated" : "product.created", category: "data_change",
      module: "product", action: updating ? "update" : "create", actorType: "admin",
      actorId: scope.idAdminAcct, actorLabel: req.user?.alias ?? null,
      entityType: "product", entityId: id!, entityLabel: payload.sku,
    });
    await cx.commit();
    return sendSuccess(res, updating ? 200 : 201, updating ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", updating ? "Product updated" : "Product created", { id: keyhsid.idProduct.encode(id!) });
  } catch(error:any) {
    await cx.rollback(); console.error("[Product] save failed",error);
    if(error?.code==="ER_DUP_ENTRY")return sendError(res,409,"PRODUCT_DUPLICATE","Product key, SKU, or localized slug already exists");
    return sendError(res,500,"PRODUCT_SAVE_FAILED","Unable to save product");
  } finally { cx.release(); }
};

app.post("/api/v1/products",verifyToken,requirePermission("product.create"),(req:AuthRequest,res:Response)=>save(req,res,null));
app.put("/api/v1/products/:id",verifyToken,requirePermission("product.update"),(req:AuthRequest,res:Response)=>{const id=decode(req.params.id,keyhsid.idProduct);return id?save(req,res,id):sendError(res,404,"PRODUCT_NOT_FOUND","Product not found");});
app.patch("/api/v1/products/:id/status",verifyToken,requirePermission("product.update"),async(req:AuthRequest,res:Response)=>{const scope=await getAdminScope(req,pool);if(!scope.success)return sendError(res,scope.status,scope.code,scope.message);const id=decode(req.params.id,keyhsid.idProduct),status=String(req.body?.status??"");if(!id||!statuses.has(status))return sendError(res,400,"PRODUCT_STATUS_INVALID","Invalid product status");const [result]=await pool.query<ResultSetHeader>(`UPDATE product_catalog SET product_status=?,id_updated_by=? WHERE id_product=? AND id_master_comp=? AND product_deleted_at IS NULL`,[status,scope.idAdminAcct,id,scope.idMasterComp]);return result.affectedRows?sendSuccess(res,200,"PRODUCT_STATUS_UPDATED","Product status updated",null):sendError(res,404,"PRODUCT_NOT_FOUND","Product not found");});
app.delete("/api/v1/products/:id",verifyToken,requirePermission("product.delete"),async(req:AuthRequest,res:Response)=>{const scope=await getAdminScope(req,pool);if(!scope.success)return sendError(res,scope.status,scope.code,scope.message);const id=decode(req.params.id,keyhsid.idProduct);if(!id)return sendError(res,404,"PRODUCT_NOT_FOUND","Product not found");const [result]=await pool.query<ResultSetHeader>(`UPDATE product_catalog SET product_status='archived',product_deleted_at=NOW(),id_updated_by=? WHERE id_product=? AND id_master_comp=? AND product_deleted_at IS NULL`,[scope.idAdminAcct,id,scope.idMasterComp]);return result.affectedRows?sendSuccess(res,200,"PRODUCT_DELETED","Product archived",null):sendError(res,404,"PRODUCT_NOT_FOUND","Product not found");});

export default app;
