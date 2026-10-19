import express = require("express");

import readRoutes from "./office/read";
import createRoutes from "./office/create";
import updateRoutes from "./office/update";
import deleteRoutes from "./office/delete";

// Office management, under /api/v1/office.
//
// The route modules live in ./office, which the auto-loader in app.ts does not scan,
// so this file registers them. Order does not matter: their paths do not overlap.
// Contract: ops/e2e/write/office-api.spec.ts.
const app = express();

app.use(readRoutes);
app.use(createRoutes);
app.use(updateRoutes);
app.use(deleteRoutes);

export default app;
