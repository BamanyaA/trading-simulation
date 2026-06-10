import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let adminApp: admin.app.App | undefined = undefined;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log("Firebase Admin initialized successfully under project ID:", firebaseConfig.projectId);
  } else {
    console.warn("firebase-applet-config.json not found. Firebase Admin might not be pre-initialized.");
  }
} catch (err) {
  console.error("Firebase Admin initialization error:", err);
}

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

  // Firebase Admin endpoints for secure administrative user purges
  app.post("/api/admin/delete-user", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }
      const token = authHeader.split("Bearer ").pop();
      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Invalid token format" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken.email !== "habeshatilaye@gmail.com") {
        return res.status(403).json({ error: "Forbidden: Admin access only" });
      }

      const { uid } = req.body;
      if (!uid) {
        return res.status(400).json({ error: "Missing required uid parameter" });
      }

      await admin.auth().deleteUser(uid);
      console.log(`Successfully deleted auth user: ${uid}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error in delete-user:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  app.post("/api/admin/purge-non-admins", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }
      const token = authHeader.split("Bearer ").pop();
      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Invalid token format" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken.email !== "habeshatilaye@gmail.com") {
        return res.status(403).json({ error: "Forbidden: Admin access only" });
      }

      // List all users in Firebase Auth
      let usersToDelete: string[] = [];
      let nextPageToken: string | undefined = undefined;

      try {
        do {
          const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
          listUsersResult.users.forEach((userRecord) => {
            if (userRecord.email && userRecord.email.toLowerCase() !== "habeshatilaye@gmail.com") {
              usersToDelete.push(userRecord.uid);
            }
          });
          nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
      } catch (authError) {
        console.warn("Auth listUsers failed during purge-non-admins:", authError);
        return res.json({
          success: true,
          deletedCount: 0,
          apiRestricted: true,
          message: "The server-side Identity Toolkit API is disabled or restricted in this environment. Database profiles are managed locally on the client."
        });
      }

      if (usersToDelete.length > 0) {
        const deleteUsersResult = await admin.auth().deleteUsers(usersToDelete);
        console.log(`Successfully deleted ${deleteUsersResult.successCount} users from Firebase Auth.`);
        res.json({ 
          success: true, 
          deletedCount: deleteUsersResult.successCount, 
          failedCount: deleteUsersResult.failureCount 
        });
      } else {
        res.json({ success: true, deletedCount: 0, message: "No non-admin accounts found in Firebase Authentication." });
      }
    } catch (error) {
      console.error("Error in purge-non-admins:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  app.post("/api/admin/reconcile-users", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized: Missing token" });
      }
      const token = authHeader.split("Bearer ").pop();
      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Invalid token format" });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken.email !== "habeshatilaye@gmail.com") {
        return res.status(403).json({ error: "Forbidden: Admin access only" });
      }

      // Initialize Firestore on Admin SDK
      let dbInstance: any;
      try {
        const configPath = path.join(process.cwd(), "firebase-applet-config.json");
        if (fs.existsSync(configPath)) {
          const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (firebaseConfig.firestoreDatabaseId) {
            dbInstance = getFirestore(adminApp || undefined, firebaseConfig.firestoreDatabaseId);
          } else {
            dbInstance = getFirestore(adminApp || undefined);
          }
        } else {
          dbInstance = getFirestore(adminApp || undefined);
        }
      } catch (err) {
        console.error("Failed to get custom firestore instance, falling back to default:", err);
        dbInstance = getFirestore(adminApp || undefined);
      }

      // Fetch all users from Firebase Auth
      let authUsers: admin.auth.UserRecord[] = [];
      let nextPageToken: string | undefined = undefined;

      try {
        do {
          const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
          authUsers.push(...listUsersResult.users);
          nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);
      } catch (authError) {
        console.warn("Auth listUsers failed, returning auto-repair mode status:", authError);
        return res.json({
          success: true,
          createdCount: 0,
          apiRestricted: true,
          message: "The server-side Identity Toolkit API is disabled in this environment. Dual Client-Side On-Demand Auto-Repair is active and synchronizes your operators' database profiles automatically on login."
        });
      }

      let createdCount = 0;
      const details: string[] = [];

      // Reconcile each Auth user with Firestore users collection
      for (const authUser of authUsers) {
        const userDocRef = dbInstance.collection("users").doc(authUser.uid);
        const docSnap = await userDocRef.get();

        if (!docSnap.exists) {
          const isAdminEmail = authUser.email === "habeshatilaye@gmail.com";
          await userDocRef.set({
            email: authUser.email || "",
            fullName: authUser.displayName || "",
            address: "",
            phoneNumber: authUser.phoneNumber || "",
            verificationDoc: null,
            balance: 0,
            role: isAdminEmail ? "admin" : "user",
            createdAt: FieldValue.serverTimestamp(),
            verificationStatus: "unsubmitted",
            isVerified: false,
            tradeAction: false
          });
          createdCount++;
          details.push(`Recovered Firestore profile for: ${authUser.email || authUser.uid}`);
        }
      }

      res.json({ success: true, createdCount, details });
    } catch (error) {
      console.error("Error in reconcile-users:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
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
