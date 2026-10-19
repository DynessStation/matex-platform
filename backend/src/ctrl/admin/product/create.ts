// Product create.
import express = require('express');
import { Response } from 'express';

import { AuthRequest, verifyToken } from '../../../middleware/auth-jwt.middleware';
import { requirePermission } from '../../../middleware/auth-permission.middleware';
import { onFailure } from '../../../middleware/error-handler.middleware';
import { PRODUCT_DUPLICATE } from './input';
import { saveProduct } from './records';

const router = express.Router();

router.post(
  '/api/v1/products',
  verifyToken,
  requirePermission('product.create'),
  onFailure('PRODUCT_SAVE_FAILED', 'Unable to save product', { duplicate: PRODUCT_DUPLICATE }),
  (req: AuthRequest, res: Response) => saveProduct(req, res, null),
);

export default router;
