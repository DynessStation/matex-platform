import express = require('express');

import readRoutes from './office/read';
import createRoutes from './office/create';
import updateRoutes from './office/update';
import deleteRoutes from './office/delete';
import orderRoutes from './office/order';

// Office management, under /api/v1/office.
//
// The route modules live in ./office, which the auto-loader in app.ts does not scan,
// so this file registers them. The order routes go first: /public-order would otherwise match
// /:id. Contract: ops/e2e/write/office-api.spec.ts.
const router = express.Router();

router.use(orderRoutes);
router.use(readRoutes);
router.use(createRoutes);
router.use(updateRoutes);
router.use(deleteRoutes);

export default router;
