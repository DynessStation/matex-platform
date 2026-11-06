// Whether a slug is free, for the title and address input of the admin forms (G-3).
// Saving still checks it. Contract: ops/e2e/write/slug-redirect-api.spec.ts.
import express = require('express');
import { NextFunction, Response } from 'express';

import db = require('../../db');
import keyhsid from '../../hsid';
import { isPublicContentLocale } from '../../config/public-content.config';
import { getAdminScope } from '../../helper/admin-scope.helper';
import { sendError, sendSuccess } from '../../helper/api-response.helper';
import { decodeId } from '../../helper/id.helper';
import { contentSlug } from '../../helper/input.helper';
import { SlugEntity, isSlugTaken } from '../../helper/slug-redirect.helper';
import { AuthRequest, verifyToken } from '../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../middleware/auth-permission.middleware';
import { onFailure } from '../../middleware/error-handler.middleware';

const router = express.Router();
const { pool } = db;

type CheckedEntity = Exclude<SlugEntity, 'article_tag'>;

const ENTITIES: Record<
  CheckedEntity,
  { permission: string; hsid: Parameters<typeof decodeId>[1] }
> = {
  article: { permission: 'article.view', hsid: keyhsid.idArticle },
  product: { permission: 'product.view', hsid: keyhsid.idProduct },
  product_category: { permission: 'product_category.view', hsid: keyhsid.idProductCategory },
};

const entityOf = (value: unknown): CheckedEntity | null =>
  typeof value === 'string' && Object.keys(ENTITIES).includes(value)
    ? (value as CheckedEntity)
    : null;

/** Whoever can read the record type can ask about its slugs. */
const requireEntityView = (req: AuthRequest, res: Response, next: NextFunction) => {
  const entity = entityOf(req.query.entity);
  if (!entity) return sendError(res, 400, 'SLUG_CHECK_INVALID', 'Unknown record type');
  return requirePermission(ENTITIES[entity].permission)(req, res, next);
};

router.get(
  '/api/v1/slug-check',
  verifyToken,
  requireEntityView,
  onFailure('SLUG_CHECK_FAILED', 'Unable to check the address'),
  async (req: AuthRequest, res: Response) => {
    const scope = await getAdminScope(req, pool);
    if (!scope.success) return sendError(res, scope.status, scope.code, scope.message);
    const entity = entityOf(req.query.entity) as CheckedEntity;
    const locale = String(req.query.locale ?? '');
    const slug = contentSlug(req.query.slug);
    const sentId = req.query.id ? String(req.query.id) : '';
    const id = sentId ? decodeId(sentId, ENTITIES[entity].hsid) : null;
    if (!isPublicContentLocale(locale) || !slug || (sentId && !id)) {
      return sendError(res, 400, 'SLUG_CHECK_INVALID', 'Language or address is invalid');
    }
    const taken = await isSlugTaken(pool, entity, id, scope.idMasterComp, locale, slug);
    return sendSuccess(res, 200, 'SLUG_CHECKED', 'Address checked', { slug, available: !taken });
  },
);

export default router;
