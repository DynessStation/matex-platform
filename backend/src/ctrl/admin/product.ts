import express = require('express');

import readRoutes from './product/read';
import createRoutes from './product/create';
import updateRoutes from './product/update';
import deleteRoutes from './product/delete';
import frontRoutes from './product/front';

// Products, under /api/v1/products. The public list and detail are ctrl/public/product.ts.
//
// The route modules live in ./product, which the auto-loader in app.ts does not scan, so this
// file registers them. The front routes go first: /front would otherwise match /:id.
// Contract: ops/e2e/write/product-api.spec.ts.
const router = express.Router();

router.use(frontRoutes);
router.use(readRoutes);
router.use(createRoutes);
router.use(updateRoutes);
router.use(deleteRoutes);

export default router;
