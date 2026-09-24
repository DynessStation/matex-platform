import { Router } from "express";
import { RowDataPacket } from "mysql2";
import { isPublicContentLocale } from "../../config/public-content.config";
import { pool } from "../../db";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";

const router = Router();
const scopeOf = (locale: unknown) => {
  const company = Number(process.env.PUBLIC_CMS_COMPANY_ID);
  return Number.isSafeInteger(company) && company > 0 && isPublicContentLocale(locale)
    ? { company, locale: String(locale) } : null;
};
const base = `SELECT p.*,i.product_slug,i.product_name,i.product_short_description,i.product_description,
 i.product_specifications_json,i.product_meta_title,i.product_meta_description,i.product_canonical_url,
 i.product_og_title,i.product_og_description FROM product_catalog p
 JOIN product_catalog_i18n i ON i.id_product=p.id_product AND i.id_master_comp=p.id_master_comp`;
const where = `p.id_master_comp=? AND i.product_locale=? AND p.product_status='published'
 AND i.product_i18n_status=1 AND p.product_deleted_at IS NULL`;
const image = (row: any) => ({
  asset_url: buildAttachmentUrl(row.storage_path), original_url: buildAttachmentUrl(row.storage_path),
  name: row.name ?? "", width: row.width == null ? null : Number(row.width),
  height: row.height == null ? null : Number(row.height), mime_type: row.mime_type ?? "",
});

const hydrate = async (rows: RowDataPacket[], company: number, locale: string) => {
  if (!rows.length) return [];
  const ids=rows.map((row)=>Number(row.id_product)), marks=ids.map(()=>"?").join(",");
  const [media]=await pool.query<RowDataPacket[]>(`SELECT pa.id_product,pa.product_attachment_role,pa.product_attachment_sort_order,a.* FROM product_catalog_attachment pa JOIN attachment a ON a.id_attachment=pa.id_attachment AND a.attachment_status=1 AND a.deleted_at IS NULL WHERE pa.id_product IN (${marks}) AND pa.id_master_comp=? AND pa.product_attachment_is_public=1 ORDER BY pa.product_attachment_sort_order`,[...ids,company]);
  const [categories]=await pool.query<RowDataPacket[]>(`SELECT pc.id_product,c.id_product_category,i.product_category_name,i.product_category_slug FROM product_catalog_category pc JOIN product_category c ON c.id_product_category=pc.id_product_category AND c.id_master_comp=pc.id_master_comp JOIN product_category_i18n i ON i.id_product_category=c.id_product_category AND i.product_category_locale=? WHERE pc.id_product IN (${marks}) AND pc.id_master_comp=? AND c.product_category_status='published' ORDER BY pc.sort_order`,[locale,...ids,company]);
  const [prices]=await pool.query<RowDataPacket[]>(`SELECT * FROM product_catalog_price WHERE id_product IN (${marks}) AND id_master_comp=? AND product_price_is_active=1 AND (product_price_starts_at IS NULL OR product_price_starts_at<=NOW()) AND (product_price_ends_at IS NULL OR product_price_ends_at>=NOW()) ORDER BY product_price_sort_order`,[...ids,company]);
  const [markets]=await pool.query<RowDataPacket[]>(`SELECT * FROM product_catalog_marketplace WHERE id_product IN (${marks}) AND id_master_comp=? AND product_marketplace_is_active=1 ORDER BY product_marketplace_is_primary DESC,product_marketplace_sort_order`,[...ids,company]);
  return rows.map((row)=>{const id=Number(row.id_product), productMedia=media.filter(x=>Number(x.id_product)===id), publicPrice=prices.find(x=>Number(x.id_product)===id&&x.product_price_is_public), primaryMarket=markets.find(x=>Number(x.id_product)===id);return {
    id,name:row.product_name,slug:row.product_slug,sku:row.product_sku,product_type:row.product_type,
    short_description:row.product_short_description??"",description:row.product_description??"",
    specifications:row.product_specifications_json??null,unit:row.product_unit??"",weight:row.product_weight_grams==null?null:Number(row.product_weight_grams),
    manufacturer_code:row.product_manufacturer_code??null,country_origin:row.product_country_origin??null,
    hs_code:row.product_hs_code??null,min_order_qty:Number(row.product_min_order_qty??1),
    lead_time_days:row.product_lead_time_days==null?null:Number(row.product_lead_time_days),
    dimensions:{length_mm:row.product_length_mm==null?null:Number(row.product_length_mm),width_mm:row.product_width_mm==null?null:Number(row.product_width_mm),height_mm:row.product_height_mm==null?null:Number(row.product_height_mm)},
    stock_status:row.product_stock_status,quantity:row.product_manage_stock?Number(row.product_stock_quantity??0):0,
    manage_stock:Boolean(row.product_manage_stock),price_visibility:row.product_price_visibility,
    price:row.product_price_visibility==="displayed"&&publicPrice?Number(publicPrice.product_price_compare_at??publicPrice.product_price_amount):0,
    sale_price:row.product_price_visibility==="displayed"&&publicPrice?Number(publicPrice.product_price_amount):0,
    currency:publicPrice?.product_price_currency??"IDR",
    discount:0,rating:0,rating_count:0,reviews_count:0,status:true,is_featured:Boolean(row.product_is_featured),
    internal_commerce_enabled:Boolean(row.product_internal_commerce_enabled),is_external:Boolean(primaryMarket),
    external_url:primaryMarket?.product_marketplace_url??"",
    external_button_text:locale==="id-ID"?"Lihat di marketplace":"View on marketplace",
    product_thumbnail:(()=>{const x=productMedia.find(m=>m.product_attachment_role==="thumbnail");return x?image(x):null;})(),
    product_galleries:productMedia.filter(m=>m.product_attachment_role==="gallery").map(image),
    product_meta_image:(()=>{const x=productMedia.find(m=>m.product_attachment_role==="og")??productMedia.find(m=>m.product_attachment_role==="thumbnail");return x?image(x):null;})(),
    categories:categories.filter(x=>Number(x.id_product)===id).map(x=>({id:Number(x.id_product_category),name:x.product_category_name,slug:x.product_category_slug})),
    marketplaces:markets.filter(x=>Number(x.id_product)===id).map(x=>({provider:x.product_marketplace_provider,label:x.product_marketplace_label,url:x.product_marketplace_url,sku:x.product_marketplace_sku,price:x.product_marketplace_price==null?null:Number(x.product_marketplace_price),currency:x.product_marketplace_currency,is_primary:Boolean(x.product_marketplace_is_primary)})),
    prices:prices.filter(x=>Number(x.id_product)===id&&x.product_price_is_public).map(x=>({type:x.product_price_type,label:x.product_price_label,currency:x.product_price_currency,amount:Number(x.product_price_amount),compare_at:x.product_price_compare_at==null?null:Number(x.product_price_compare_at),min_qty:x.product_price_min_qty==null?null:Number(x.product_price_min_qty),max_qty:x.product_price_max_qty==null?null:Number(x.product_price_max_qty)})),
    meta_title:row.product_meta_title??row.product_name,meta_description:row.product_meta_description??row.product_short_description??"",canonical_url:row.product_canonical_url??"",og_title:row.product_og_title??row.product_meta_title??row.product_name,og_description:row.product_og_description??row.product_meta_description??row.product_short_description??"",
    related_products:[],cross_sell_products:[],attributes:[],attributes_ids:[],attribute_values:[],variations:[],wholesales:[],is_sale_enable:false,is_wishlist:false,orders_count:0,
  };});
};

router.get("/api/public/products/:locale",async(req,res)=>{res.setHeader("Cache-Control","no-store");const scope=scopeOf(req.params.locale);if(!scope)return sendError(res,404,"PRODUCTS_NOT_FOUND","Products not found");const search=String(req.query.search??"").trim().slice(0,200),category=String(req.query.category??"").trim(),like=`%${search}%`;try{const categoryJoin=category?` JOIN product_catalog_category pc_filter ON pc_filter.id_product=p.id_product JOIN product_category_i18n ci_filter ON ci_filter.id_product_category=pc_filter.id_product_category AND ci_filter.product_category_locale=i.product_locale`:"";const categoryWhere=category?` AND ci_filter.product_category_slug=?`:"";const params:any[]=[scope.company,scope.locale,search,like,like];if(category)params.push(category);const [rows]=await pool.query<RowDataPacket[]>(`${base}${categoryJoin} WHERE ${where} AND (?='' OR i.product_name LIKE ? OR p.product_sku LIKE ?)${categoryWhere} ORDER BY p.product_sort_order,i.product_name`,params);const data=await hydrate(rows,scope.company,scope.locale);return sendSuccess(res,200,"PRODUCTS_FOUND","Products loaded",{data,total:data.length});}catch(error){console.error("[Public product] list failed",error);return sendError(res,500,"PRODUCTS_UNAVAILABLE","Unable to load products");}});
router.get("/api/public/products/:locale/:slug",async(req,res)=>{res.setHeader("Cache-Control","no-store");const scope=scopeOf(req.params.locale);if(!scope)return sendError(res,404,"PRODUCT_NOT_FOUND","Product not found");try{const [rows]=await pool.query<RowDataPacket[]>(`${base} WHERE ${where} AND i.product_slug=? LIMIT 1`,[scope.company,scope.locale,req.params.slug]);if(!rows.length)return sendError(res,404,"PRODUCT_NOT_FOUND","Product not found");const [product]=await hydrate(rows,scope.company,scope.locale);return sendSuccess(res,200,"PRODUCT_FOUND","Product loaded",product);}catch(error){console.error("[Public product] detail failed",error);return sendError(res,500,"PRODUCT_UNAVAILABLE","Unable to load product");}});
export default router;
