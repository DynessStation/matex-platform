import express = require('express');

import readRoutes from './website-page/read';
import updateRoutes from './website-page/update';

// Fixed website pages (home, about, contact, faq, terms, career), under /api/v1/website-page.
//
// The route modules live in ./website-page, which the auto-loader in app.ts does not scan,
// so this file registers them. Contract: ops/e2e/write/website-page-api.spec.ts.
const app = express();

app.use(readRoutes);
app.use(updateRoutes);

export default app;
