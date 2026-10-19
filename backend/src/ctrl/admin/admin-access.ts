import express = require("express");

import readRoutes from "./admin-access/read";
import createRoutes from "./admin-access/create";
import updateRoutes from "./admin-access/update";
import deleteRoutes from "./admin-access/delete";

// Access profiles and the permission matrix, under /api/v1/admin-access.
//
// The route modules live in ./admin-access, which the auto-loader in app.ts does not scan,
// so this file registers them. Order matters inside read: /permission-matrix must come before
// /:id, because Express matches routes in registration order.
// Contract: ops/e2e/write/admin-access-api.spec.ts.
const app = express();

app.use(readRoutes);
app.use(createRoutes);
app.use(updateRoutes);
app.use(deleteRoutes);

export default app;
