import express = require('express');

import sessionRoutes from './admin-account/session';
import selectRoutes from './admin-account/select';
import readRoutes from './admin-account/read';
import createRoutes from './admin-account/create';
import updateRoutes from './admin-account/update';
import deleteRoutes from './admin-account/delete';

// Admin session (login, logout, /me) and admin-account management, under /api/v1/admin-acct.
//
// The route modules live in ./admin-account, which the auto-loader in app.ts does not scan,
// so this file registers them. Order matters: session and select register /me and /select/*,
// which must come before /:id in read, because Express matches routes in registration order.
// Contract: ops/e2e/write/admin-account-api.spec.ts.
const router = express.Router();

router.use(sessionRoutes);
router.use(selectRoutes);
router.use(readRoutes);
router.use(createRoutes);
router.use(updateRoutes);
router.use(deleteRoutes);

export default router;
