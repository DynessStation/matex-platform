import express = require("express");
import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import db = require("../../db");
import keyhsid from "../../hsid";
import { PUBLIC_CONTENT_LOCALES, isPublicContentLocale, normalizePublicContentKey } from "../../config/public-content.config";
import { getAdminScope } from "../../helper/admin-scope.helper";
import { buildAttachmentUrl } from "../../helper/attachment.helper";
import { sendError, sendSuccess } from "../../helper/api-response.helper";
import { writeAuditLog } from "../../helper/audit-log.helper";
import { AuthRequest, verifyToken } from "../middleware/authJwt";
import { requirePermission } from "../middleware/authPermission";

const app = express();
const { pool } = db;
const statuses = new Set(["draft", "published", "scheduled", "archived"]);

const decode = (value: unknown, codec: any): number | null => {
  const id = Number(codec.decode(String(value ?? ""))[0]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
const slugify = (value: unknown) => normalizePublicContentKey(value).slice(0, 255);
const dateOrNull = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19).replace("T", " ");
};
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

const payloadOf = (body: any) => {
  const key = normalizePublicContentKey(body?.key);
  const status = String(body?.status ?? "draft");
  const publishedAt = dateOrNull(body?.published_at);
  const unpublishedAt = dateOrNull(body?.unpublished_at);
  const thumbnailId = body?.thumbnail_id ? decode(body.thumbnail_id, keyhsid.idAttachment) : null;
  const ogImageId = body?.og_image_id ? decode(body.og_image_id, keyhsid.idAttachment) : null;
  if (!key || key.length > 120 || !statuses.has(status) || (body?.thumbnail_id && !thumbnailId) || (body?.og_image_id && !ogImageId)) return null;
  if (status === "scheduled" && !publishedAt) return null;
  if (publishedAt && unpublishedAt && publishedAt >= unpublishedAt) return null;
  if (!Array.isArray(body?.translations)) return null;
  const translations: any[] = [];
  const seen = new Set<string>();
  for (const item of body.translations) {
    const locale = String(item?.locale ?? "");
    const slug = slugify(item?.slug);
    const title = text(item?.title, 500);
    const articleBody = String(item?.body ?? "").trim();
    if (!isPublicContentLocale(locale) || seen.has(locale) || !slug || !title || !articleBody || /<script\b/i.test(articleBody)) return null;
    seen.add(locale);
    const schema = item?.schema_json ? String(item.schema_json).trim() : null;
    if (schema) { try { JSON.parse(schema); } catch { return null; } }
    translations.push({ locale, slug, title, excerpt: text(item?.excerpt, 2000) || null, body: articleBody,
      metaTitle: text(item?.meta_title, 255) || null, metaDescription: text(item?.meta_description, 500) || null,
      canonicalUrl: text(item?.canonical_url, 1000) || null, ogTitle: text(item?.og_title, 255) || null,
      ogDescription: text(item?.og_description, 500) || null, schemaJson: schema, status: Number(item?.status) === 0 ? 0 : 1 });
  }
  if (!PUBLIC_CONTENT_LOCALES.every(locale => seen.has(locale))) return null;
  return { key, status, publishedAt, unpublishedAt, thumbnailId, ogImageId,
    isFeatured: body?.is_featured ? 1 : 0, isSticky: body?.is_sticky ? 1 : 0, translations };
};

const attachmentDto = (row: any, prefix: string) => row[`${prefix}_id`] ? ({
  id_attachment: keyhsid.idAttachment.encode(Number(row[`${prefix}_id`])),
  asset_url: buildAttachmentUrl(row[`${prefix}_path`]), original_url: buildAttachmentUrl(row[`${prefix}_path`]),
  name: row[`${prefix}_name`] ?? "", width: row[`${prefix}_width`] == null ? null : Number(row[`${prefix}_width`]),
  height: row[`${prefix}_height`] == null ? null : Number(row[`${prefix}_height`]), mime_type: row[`${prefix}_mime`] ?? "",
}) : null;

app.get("/api/v1/articles", verifyToken, requirePermission("article.view"), async (req: AuthRequest, res: Response) => {
  const scope = await getAdminScope(req, pool); if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit ?? req.query.paginate) || 15));
  const locale = isPublicContentLocale(req.query.locale) ? req.query.locale : "id-ID"; const search = text(req.query.search, 200); const like = `%${search}%`;
  try {
    const [counts] = await pool.query<RowDataPacket[]>(`SELECT COUNT(DISTINCT a.id_article) total FROM article a LEFT JOIN article_i18n i ON i.id_article=a.id_article WHERE a.id_master_comp=? AND a.article_deleted_at IS NULL AND (?='' OR a.article_key LIKE ? OR i.article_title LIKE ?)`, [scope.idMasterComp, search, like, like]);
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT a.*,i.article_slug,i.article_title,i.article_excerpt,i.article_i18n_status,
      th.id_attachment thumbnail_id,th.storage_path thumbnail_path,th.name thumbnail_name,th.width thumbnail_width,th.height thumbnail_height,th.mime_type thumbnail_mime
      FROM article a LEFT JOIN article_i18n i ON i.id_article=a.id_article AND i.article_locale=?
      LEFT JOIN article_attachment aa ON aa.id_article=a.id_article AND aa.article_attachment_role='thumbnail' AND aa.article_attachment_sort_order=0
      LEFT JOIN attachment th ON th.id_attachment=aa.id_attachment
      WHERE a.id_master_comp=? AND a.article_deleted_at IS NULL AND (?='' OR a.article_key LIKE ? OR i.article_title LIKE ?)
      ORDER BY a.article_is_sticky DESC,COALESCE(a.article_published_at,a.created) DESC LIMIT ? OFFSET ?`, [locale, scope.idMasterComp, search, like, like, limit, (page-1)*limit]);
    return sendSuccess(res, 200, "ARTICLES_LISTED", "Articles loaded", { data: rows.map(row => ({ id:keyhsid.idArticle.encode(Number(row.id_article)), key:row.article_key, title:row.article_title??"", slug:row.article_slug??"", description:row.article_excerpt??"", status:row.article_status, locale_status:Number(row.article_i18n_status??0), is_featured:Boolean(row.article_is_featured), is_sticky:Boolean(row.article_is_sticky), published_at:row.article_published_at, created_at:row.created, updated_at:row.updated, blog_thumbnail:attachmentDto(row,"thumbnail") })), total:Number(counts[0]?.total??0), current_page:page, per_page:limit });
  } catch (error) { console.error("[Article] list failed", error); return sendError(res,500,"ARTICLE_LIST_FAILED","Unable to load articles"); }
});

app.get("/api/v1/articles/:id", verifyToken, requirePermission("article.view"), async (req: AuthRequest,res:Response) => {
  const scope=await getAdminScope(req,pool); if(!scope.success)return sendError(res,scope.status,scope.code,scope.message); const id=decode(req.params.id,keyhsid.idArticle); if(!id)return sendError(res,404,"ARTICLE_NOT_FOUND","Article not found");
  const [rows]=await pool.query<RowDataPacket[]>(`SELECT * FROM article WHERE id_article=? AND id_master_comp=? AND article_deleted_at IS NULL`,[id,scope.idMasterComp]); if(!rows.length)return sendError(res,404,"ARTICLE_NOT_FOUND","Article not found");
  const [trs]=await pool.query<RowDataPacket[]>(`SELECT * FROM article_i18n WHERE id_article=? ORDER BY article_locale`,[id]);
  const [media]=await pool.query<RowDataPacket[]>(`SELECT aa.article_attachment_role,a.id_attachment,a.storage_path,a.name,a.width,a.height,a.mime_type FROM article_attachment aa JOIN attachment a ON a.id_attachment=aa.id_attachment WHERE aa.id_article=? AND aa.article_attachment_sort_order=0`,[id]);
  const byRole=new Map(media.map(m=>[m.article_attachment_role,m])); const row=rows[0];
  return sendSuccess(res,200,"ARTICLE_FOUND","Article loaded",{id:req.params.id,key:row.article_key,status:row.article_status,is_featured:Boolean(row.article_is_featured),is_sticky:Boolean(row.article_is_sticky),published_at:row.article_published_at,unpublished_at:row.article_unpublished_at,thumbnail:byRole.get("thumbnail")?attachmentDto({thumbnail_id:byRole.get("thumbnail")!.id_attachment,thumbnail_path:byRole.get("thumbnail")!.storage_path,thumbnail_name:byRole.get("thumbnail")!.name,thumbnail_width:byRole.get("thumbnail")!.width,thumbnail_height:byRole.get("thumbnail")!.height,thumbnail_mime:byRole.get("thumbnail")!.mime_type},"thumbnail"):null,og_image:byRole.get("og")?attachmentDto({og_id:byRole.get("og")!.id_attachment,og_path:byRole.get("og")!.storage_path,og_name:byRole.get("og")!.name,og_width:byRole.get("og")!.width,og_height:byRole.get("og")!.height,og_mime:byRole.get("og")!.mime_type},"og"):null,translations:trs.map(t=>({locale:t.article_locale,slug:t.article_slug,title:t.article_title,excerpt:t.article_excerpt??"",body:t.article_body,meta_title:t.article_meta_title??"",meta_description:t.article_meta_description??"",canonical_url:t.article_canonical_url??"",og_title:t.article_og_title??"",og_description:t.article_og_description??"",schema_json:t.article_schema_json??"",status:Number(t.article_i18n_status)}))});
});

const save = async (req:AuthRequest,res:Response,id:number|null) => {
  const scope=await getAdminScope(req,pool); if(!scope.success)return sendError(res,scope.status,scope.code,scope.message); const payload=payloadOf(req.body); if(!payload)return sendError(res,400,"ARTICLE_PAYLOAD_INVALID","Complete valid Indonesian and English article content");
  const cx=await pool.getConnection(); try { await cx.beginTransaction(); let articleId=id;
    if(id){ const [exists]=await cx.query<RowDataPacket[]>(`SELECT id_article FROM article WHERE id_article=? AND id_master_comp=? AND article_deleted_at IS NULL FOR UPDATE`,[id,scope.idMasterComp]); if(!exists.length){await cx.rollback();return sendError(res,404,"ARTICLE_NOT_FOUND","Article not found");} await cx.query(`UPDATE article SET article_key=?,article_status=?,article_is_featured=?,article_is_sticky=?,article_published_at=?,article_unpublished_at=?,id_updated_by=? WHERE id_article=?`,[payload.key,payload.status,payload.isFeatured,payload.isSticky,payload.publishedAt,payload.unpublishedAt,scope.idAdminAcct,id]); }
    else { const [insert]=await cx.query<ResultSetHeader>(`INSERT INTO article(id_master_comp,article_key,article_status,article_is_featured,article_is_sticky,article_published_at,article_unpublished_at,id_author,id_created_by,id_updated_by) VALUES(?,?,?,?,?,?,?,?,?,?)`,[scope.idMasterComp,payload.key,payload.status,payload.isFeatured,payload.isSticky,payload.publishedAt,payload.unpublishedAt,scope.idAdminAcct,scope.idAdminAcct,scope.idAdminAcct]); articleId=insert.insertId; }
    for(const t of payload.translations) await cx.query(`INSERT INTO article_i18n(id_article,id_master_comp,article_locale,article_slug,article_title,article_excerpt,article_body,article_meta_title,article_meta_description,article_canonical_url,article_og_title,article_og_description,article_schema_json,article_i18n_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE article_slug=VALUES(article_slug),article_title=VALUES(article_title),article_excerpt=VALUES(article_excerpt),article_body=VALUES(article_body),article_meta_title=VALUES(article_meta_title),article_meta_description=VALUES(article_meta_description),article_canonical_url=VALUES(article_canonical_url),article_og_title=VALUES(article_og_title),article_og_description=VALUES(article_og_description),article_schema_json=VALUES(article_schema_json),article_i18n_status=VALUES(article_i18n_status)`,[articleId,scope.idMasterComp,t.locale,t.slug,t.title,t.excerpt,t.body,t.metaTitle,t.metaDescription,t.canonicalUrl,t.ogTitle,t.ogDescription,t.schemaJson,t.status]);
    await cx.query(`DELETE FROM article_attachment WHERE id_article=? AND article_attachment_role IN ('thumbnail','og')`,[articleId]);
    for(const [role,mediaId] of [["thumbnail",payload.thumbnailId],["og",payload.ogImageId]] as const) if(mediaId){ const [valid]=await cx.query<RowDataPacket[]>(`SELECT id_attachment FROM attachment WHERE id_attachment=? AND id_master_comp=? AND attachment_status=1 AND deleted_at IS NULL`,[mediaId,scope.idMasterComp]); if(!valid.length){await cx.rollback();return sendError(res,400,"ARTICLE_MEDIA_INVALID","Selected media is unavailable");} await cx.query(`INSERT INTO article_attachment(id_article,id_master_comp,id_attachment,article_attachment_role) VALUES(?,?,?,?)`,[articleId,scope.idMasterComp,mediaId,role]); }
    await writeAuditLog({req,connection:cx,writeMode:"strict",idMasterComp:scope.idMasterComp,eventCode:id?"article.updated":"article.created",category:"data_change",module:"article",action:id?"update":"create",actorType:"admin",actorId:scope.idAdminAcct,actorLabel:req.user?.alias??null,entityType:"article",entityId:articleId!,entityLabel:payload.key,after:payload,httpStatus:id?200:201}); await cx.commit(); return sendSuccess(res,id?200:201,id?"ARTICLE_UPDATED":"ARTICLE_CREATED",id?"Article updated":"Article created",{id:keyhsid.idArticle.encode(articleId!)});
  } catch(error:any){await cx.rollback(); if(error?.code==="ER_DUP_ENTRY")return sendError(res,409,"ARTICLE_CONFLICT","Article key or localized slug already exists"); console.error("[Article] save failed",error); return sendError(res,500,"ARTICLE_SAVE_FAILED","Unable to save article");} finally{cx.release();}
};
app.post("/api/v1/articles",verifyToken,requirePermission("article.create"),(req,res)=>save(req,res,null));
app.put("/api/v1/articles/:id",verifyToken,requirePermission("article.update"),(req,res)=>{const id=decode(req.params.id,keyhsid.idArticle);return id?save(req,res,id):sendError(res,404,"ARTICLE_NOT_FOUND","Article not found")});
app.patch("/api/v1/articles/:id/status",verifyToken,requirePermission("article.update"),async(req:AuthRequest,res:Response)=>{const scope=await getAdminScope(req,pool);if(!scope.success)return sendError(res,scope.status,scope.code,scope.message);const id=decode(req.params.id,keyhsid.idArticle),status=String(req.body?.status??"");if(!id||!statuses.has(status))return sendError(res,400,"ARTICLE_STATUS_INVALID","Invalid article status");await pool.query(`UPDATE article SET article_status=?,article_published_at=CASE WHEN ?='published' AND article_published_at IS NULL THEN NOW() ELSE article_published_at END,id_updated_by=? WHERE id_article=? AND id_master_comp=? AND article_deleted_at IS NULL`,[status,status,scope.idAdminAcct,id,scope.idMasterComp]);return sendSuccess(res,200,"ARTICLE_STATUS_UPDATED","Article status updated",null)});
app.delete("/api/v1/articles/:id",verifyToken,requirePermission("article.delete"),async(req:AuthRequest,res:Response)=>{const scope=await getAdminScope(req,pool);if(!scope.success)return sendError(res,scope.status,scope.code,scope.message);const id=decode(req.params.id,keyhsid.idArticle);if(!id)return sendError(res,404,"ARTICLE_NOT_FOUND","Article not found");await pool.query(`UPDATE article SET article_deleted_at=NOW(),id_updated_by=? WHERE id_article=? AND id_master_comp=?`,[scope.idAdminAcct,id,scope.idMasterComp]);return sendSuccess(res,200,"ARTICLE_DELETED","Article moved to trash",null)});

export default app;
