import "dotenv/config";

import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import fs from "fs";
import helmet from "helmet";
import { Server } from "http";
import path from "path";

import { validateRuntimeConfig } from "./config/runtime.config";
import storageConfig from "./config/storage.config";
import { requestContextMiddleware } from "./middleware/request-context.middleware";
import { pool } from "./db";

validateRuntimeConfig();

const app = express();
const isProduction = process.env.NODE_ENV === "production";

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const isLoopbackAddress = (address: string | undefined): boolean =>
  address === "127.0.0.1" ||
  address === "::1" ||
  address === "::ffff:127.0.0.1";

app.disable("x-powered-by");
app.set(
  "trust proxy",
  process.env.TRUST_PROXY || (isProduction ? "loopback" : false),
);

app.use(
  helmet({
    strictTransportSecurity: isProduction ? undefined : false,
  }),
);
app.use(compression());

app.use(
  cors({
    origin: (
      process.env.CORS_ORIGINS ||
      "http://localhost:4200,http://localhost:4201,http://127.0.0.1:4200,http://127.0.0.1:4201"
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    credentials: true,
    exposedHeaders: ["X-Request-ID", "X-Correlation-ID"],
  }),
);

if (storageConfig.serveLocal && storageConfig.disk === "local") {
  app.use(
    "/files",
    (_req, res, next) => {
      // Files are intentionally shared with the admin app on
      // internal.matexindo.com. Helmet defaults this header to same-origin,
      // which makes browsers reject otherwise valid image responses there.
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(storageConfig.root, {
      // Let missing files reach the shared 404 response instead of turning
      // serve-static's ENOENT error into a generic 500 response.
      fallthrough: true,
      index: false,
      maxAge: "1y",
      immutable: true,
    }),
  );

  console.log(`[Storage] Local files served from: ${storageConfig.root}`);
  console.log(`[Storage] Public file URL: ${storageConfig.baseUrl}`);
}

app.use(requestContextMiddleware);

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    if (!isProduction && res.statusCode < 400) {
      return;
    }

    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "info",
        event: "http.request.completed",
        request_id: res.getHeader("X-Request-ID"),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - startedAt,
      }),
    );
  });

  next();
});

app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));

app.get("/health/live", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "matex-api",
    uptime_seconds: Math.floor(process.uptime()),
  });
});

app.get("/health/ready", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ready", service: "matex-api" });
  } catch (error) {
    console.error("[Health] Database readiness check failed", error);
    res.status(503).json({ status: "not_ready", service: "matex-api" });
  }
});

const loginRateLimiter = rateLimit({
  windowMs: positiveInteger(
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  limit: positiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    code: "AUTH_RATE_LIMITED",
    message: "Too many login attempts. Please try again later.",
  },
});

const apiRateLimiter = rateLimit({
  windowMs: positiveInteger(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  limit: positiveInteger(process.env.API_RATE_LIMIT_MAX, 600),
  // Public/admin SSR reach the API over its loopback-only listener. Counting
  // those server-side requests under one IP can throttle search-engine crawls
  // even though the originating page requests come from different clients.
  skip: (req) => isLoopbackAddress(req.ip),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    code: "API_RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api/v1/admin-acct/login", loginRateLimiter);
app.use("/api", apiRateLimiter);

const loadRoutes = (folder: string, namespace: "admin" | "public"): void => {
  if (!fs.existsSync(folder)) {
    throw new Error(`Required route folder was not found: ${folder}`);
  }

  const files = fs
    .readdirSync(folder)
    .filter((file) => /\.(?:ts|js)$/.test(file) && !file.endsWith(".d.ts"))
    .sort();

  for (const file of files) {
    const routeName = path.parse(file).name;
    const routePath = `./ctrl/${namespace}/${routeName}`;
    const routeModule = require(routePath);
    const router = routeModule.default || routeModule;

    if (typeof router !== "function") {
      throw new TypeError(
        `Route module ${namespace}/${file} does not export Express middleware`,
      );
    }

    app.use(router);
    console.log(`[Auto-Load] Loaded route: ${namespace}/${file}`);
  }
};

loadRoutes(path.join(__dirname, "ctrl", "admin"), "admin");
loadRoutes(path.join(__dirname, "ctrl", "public"), "public");

app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: "Route not found",
    path: req.path,
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API] Unhandled request error", error);

  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
});

const port = positiveInteger(process.env.PORT, 3000);
let server: Server | null = null;
let shuttingDown = false;

export const startServer = async (): Promise<Server> => {
  await pool.query("SELECT 1");

  return await new Promise<Server>((resolve, reject) => {
    const currentServer = app.listen(port, "127.0.0.1", () => {
      server = currentServer;
      console.log(`MATEX API listening on http://127.0.0.1:${port}`);
      resolve(currentServer);
    });

    currentServer.once("error", reject);
  });
};

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[Shutdown] ${signal} received`);

  const forceExitTimer = setTimeout(() => {
    console.error("[Shutdown] Timed out while closing resources");
    process.exit(1);
  }, 10_000);

  forceExitTimer.unref();

  if (server) {
    await new Promise<void>((resolve) => {
      server!.close((error) => {
        if (error) {
          console.error("[Shutdown] HTTP server close failed", error);
        }

        resolve();
      });
    });
  }

  await pool.end();
  clearTimeout(forceExitTimer);
  process.exit(0);
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[Startup] MATEX API failed to start", error);
    process.exit(1);
  });

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

export default app;
