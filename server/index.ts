import express, { type Request, Response, NextFunction } from "express";
import { registerAllRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { sessionMiddleware } from "./session";
import passport from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session
app.use(sessionMiddleware);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware for API requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register all routes through our new structure
  const server = await registerAllRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Set up Vite or static serving
  // Important to setup after all other routes so the catch-all 
  // doesn't interfere with the API routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  // ALWAYS serve the app on port 5000
  // This serves both the API and the client
  // It is the only port that is not firewalled
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0", 
    reusePort: true,
  }, () => {
    log(`Server running on port ${port}`);
  });
})();
