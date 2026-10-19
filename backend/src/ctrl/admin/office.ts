import express = require("express");

import readRoutes from "./office/read";
import createRoutes from "./office/create";
import updateRoutes from "./office/update";
import deleteRoutes from "./office/delete";

// Office management, all under /api/v1/office.
//
// The route modules live in ./office, a folder the route auto-loader in app.ts does not scan,
// so this file registers them. Their paths do not overlap, so the order is not significant.
// Contract: ops/e2e/write/office-api.spec.ts.
const app = express();

app.use(readRoutes);
app.use(createRoutes);
app.use(updateRoutes);
app.use(deleteRoutes);

export default app;
