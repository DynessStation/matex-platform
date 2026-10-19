import express = require("express");

import readRoutes from "./admin-access/read";
import createRoutes from "./admin-access/create";
import updateRoutes from "./admin-access/update";
import deleteRoutes from "./admin-access/delete";

// Access profiles and the permission matrix, all under /api/v1/admin-access.
//
// The route modules live in ./admin-access, a folder the route auto-loader in app.ts does not
// scan, so this file registers them. Keep read first: it registers /permission-matrix before
// /:id, and Express matches routes in registration order.
// Contract: ops/e2e/write/admin-access-api.spec.ts.
const app = express();

app.use(readRoutes);
app.use(createRoutes);
app.use(updateRoutes);
app.use(deleteRoutes);

export default app;
