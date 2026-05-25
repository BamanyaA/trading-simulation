import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser limits to support larger base64 file payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Create uploads folder if it doesn't exist
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Serve static files from the uploads directory
  app.use("/uploads", express.static(UPLOADS_DIR));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Base64 file upload endpoint to save files on the server and return relative URL
  app.post("/api/upload", (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!base64 || !filename) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let base64Data = base64;
      if (base64.includes(";base64,")) {
        base64Data = base64.split(";base64,").pop() || "";
      }

      if (!base64Data) {
        return res.status(400).json({ error: "Invalid base64 payload" });
      }

      const buffer = Buffer.from(base64Data, "base64");
      
      const cleanExt = path.extname(filename) || ".png";
      const cleanBase = path.basename(filename, cleanExt).replace(/[^a-zA-Z0-9_\-]/g, "");
      const uniqueFilename = `${cleanBase}_${Date.now()}${cleanExt}`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);

      fs.writeFileSync(filePath, buffer);

      res.json({ url: `/uploads/${uniqueFilename}` });
    } catch (error) {
      console.error("Upload handler error:", error);
      res.status(500).json({ error: "Internal server error during upload" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
