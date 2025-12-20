// Vercel serverless function entry point
import { createServer } from "http";
import express from "express";
import { registerRoutes } from "../server/routes";
import { sessionMiddleware } from "../server/session";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware);

// Serve uploaded assets from serverless function (note: this won't persist between deployments)
app.use("/uploads", express.static("uploads"));

// Register all API routes
async function setupApp() {
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  return app;
}

let appInstance: express.Express | null = null;

export default async function handler(req: any, res: any) {
  if (!appInstance) {
    appInstance = await setupApp();
  }
  
  return appInstance(req, res);
}