import express = require('express');

import importRoutes from './sales/imports';
import readRoutes from './sales/read';
import skuMapRoutes from './sales/sku-map';

// Penjualan: sales that reach the panel through Seller Center files (orders and payouts), the
// stores they belong to, and the map from a channel's SKU to a product of ours, under
// /api/v1/sales. The route modules live in ./sales, which the auto-loader in app.ts does not
// scan, so this file registers them. Contract: ops/e2e/write/sales-api.spec.ts.
const router = express.Router();

router.use(importRoutes);
router.use(readRoutes);
router.use(skuMapRoutes);

export default router;
