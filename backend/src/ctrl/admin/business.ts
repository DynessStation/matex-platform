import express = require('express');

import entityRoutes from './business/entities';
import ruleRoutes from './business/rules';
import storeRoutes from './business/stores';

// Bisnis: the parties of the business (entities), their stores on each sales channel, and the
// revenue share rules between them, under /api/v1/business. Internal only. The route modules
// live in ./business, which the auto-loader in app.ts does not scan, so this file registers them.
// Contract: ops/e2e/write/business-api.spec.ts.
const router = express.Router();

router.use(entityRoutes);
router.use(storeRoutes);
router.use(ruleRoutes);

export default router;
