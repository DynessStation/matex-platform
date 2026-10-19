import express = require('express');

import readRoutes from './web-navigation/read';
import createRoutes from './web-navigation/create';
import updateRoutes from './web-navigation/update';
import deleteRoutes from './web-navigation/delete';
import itemsRoutes from './web-navigation/items';
import reorderRoutes from './web-navigation/reorder';

// Website navigation and its menu items, under /api/v1/web-navigation.
//
// The route modules live in ./web-navigation, which the auto-loader in app.ts does not scan,
// so this file registers them. Order does not matter: their paths do not overlap.
// Contract: ops/e2e/write/web-navigation-api.spec.ts.
const router = express.Router();

router.use(readRoutes);
router.use(createRoutes);
router.use(updateRoutes);
router.use(deleteRoutes);
router.use(itemsRoutes);
router.use(reorderRoutes);

export default router;
