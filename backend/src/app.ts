//==================================================
//==== LOAD ENV
//==================================================

import "dotenv/config";

//==================================================
//==== IMPORT
//==================================================

import express = require("express");
import cors = require("cors");

import cookieParser from "cookie-parser";

import fs from "fs";
import path from "path";

import storageConfig from "./config/storage.config";
import publicCmsPage from "./ctrl/public/cms-page";

import { requestContextMiddleware } from "./ctrl/middleware/request-context.middleware";

//==================================================
//==== APP
//==================================================

const app = express();

//==================================================
//==== CORS
//==================================================

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:4200,http://localhost:4201").split(",").map(value => value.trim()),

    credentials: true,

    exposedHeaders: ["X-Request-ID", "X-Correlation-ID"],
  }),
);

//==================================================
//==== LOCAL FILE SERVER
//==================================================

if (storageConfig.serveLocal && storageConfig.disk === "local") {
  app.use(
    "/files",

    express.static(storageConfig.root, {
      fallthrough: false,

      index: false,

      maxAge: "1h",
    }),
  );

  console.log(`[Storage] Local files served from: ${storageConfig.root}`);

  console.log(`[Storage] Public file URL: ${storageConfig.baseUrl}`);
}

//==================================================
//==== API REQUEST CONTEXT
//==================================================

app.use(requestContextMiddleware);

//==================================================
//==== API MIDDLEWARE
//==================================================

app.use(cookieParser());

app.use(express.json());
app.use(publicCmsPage);

//==================================================
//==== AUTO LOAD ADMIN ROUTES
//==================================================

const adminFolder = path.join(__dirname, "ctrl", "admin");

if (fs.existsSync(adminFolder)) {
  const files = fs.readdirSync(adminFolder);

  files.forEach((file) => {
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      const routeName = path.parse(file).name;

      const routePath = `./ctrl/admin/${routeName}`;

      try {
        const routeModule = require(routePath);

        const router = routeModule.default || routeModule;

        if (typeof router === "function") {
          app.use(router);

          console.log(`[Auto-Load] Berhasil memuat rute: admin/${file}`);
        } else {
          console.warn(
            `[Auto-Load] Lewati ${file}: Bukan fungsi middleware Express.`,
          );
        }
      } catch (error) {
        console.error(`[Auto-Load] Gagal memuat rute dari ${file}:`, error);
      }
    }
  });
} else {
  console.warn(`[Folder tidak ditemukan]: ${adminFolder}`);
}

//==================================================
//==== START SERVER
//==================================================

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server API berjalan di http://localhost:${port}`);
});
