import express = require("express");
import db = require("../../db");

import sessionRoutes from "./admin-account/session";
import selectRoutes from "./admin-account/select";
import readRoutes from "./admin-account/read";
import createRoutes from "./admin-account/create";
import updateRoutes from "./admin-account/update";
import deleteRoutes from "./admin-account/delete";

// Admin session and admin-account management, all under /api/v1/admin-acct.
//
// The route modules live in ./admin-account, a folder the route auto-loader in app.ts does
// not scan, so this file alone decides their order. Keep /me and /select/* before /:id:
// Express matches routes in registration order, and GET /:id would otherwise answer
// GET /me and GET /select/... with "invalid id" (covered by ops/e2e/write/admin-account-api.spec.ts).
const app = express();

const { pool } = db;

pool.on("error" as any, (err) => {
  console.error(err);
});

app.use(sessionRoutes);
app.use(selectRoutes);
app.use(readRoutes);
app.use(createRoutes);
app.use(updateRoutes);
app.use(deleteRoutes);

export default app;
