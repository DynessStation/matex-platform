import express = require('express');

import importRoutes from './costing/import';
import itemRoutes from './costing/items';
import materialRoutes from './costing/materials';
import productRoutes from './costing/products';

// HPP, the price ladder, sales channels, and the calculator, under /api/v1/costing. Internal only:
// no public route reads these tables. The route modules live in ./costing, which the auto-loader
// in app.ts does not scan, so this file registers them.
// Contract: ops/e2e/write/costing-api.spec.ts.
const router = express.Router();

router.use(importRoutes);
router.use(materialRoutes);
router.use(productRoutes);
router.use(itemRoutes);

export default router;
