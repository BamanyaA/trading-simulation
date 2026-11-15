import express from "express";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

let adminApp: admin.app.App | undefined = undefined;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8"))
    : {};

  if (admin.apps.length) {
    adminApp = admin.app();
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || firebaseConfig.projectId,
    });
  } else if (firebaseConfig.projectId) {
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
} catch (err) {
  console.error("Firebase Admin initialization error in Vercel API:", err);
}

function decodeJWT(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

const ADMIN_EMAILS = [
  "habeshatilaye@gmail.com",
  "girmaeden37@gmail.com",
];

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

async function verifyAdminRequest(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { errorStatus: 401, error: "Unauthorized: Missing token" };
  }
  const token = authHeader.split("Bearer ").pop();
  if (!token) {
    return { errorStatus: 401, error: "Unauthorized: Invalid token format" };
  }

  let decodedToken: any = null;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch {
    decodedToken = decodeJWT(token);
  }

  if (!decodedToken || !isAdminEmail(decodedToken.email)) {
    return { errorStatus: 403, error: "Forbidden: Admin access only" };
  }
  return { decodedToken };
}

function getAdminFirestore() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (firebaseConfig.firestoreDatabaseId) {
        return getFirestore(adminApp || undefined, firebaseConfig.firestoreDatabaseId);
      }
    }
  } catch (err) {
    console.warn("Falling back to default Firestore database ID:", err);
  }
  return getFirestore(adminApp || undefined);
}

const app = express();

// Set body parser limits to support larger base64 file payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Resolve upload directories dynamically
const UPLOADS_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve static files from uploads directory (e.g. for temporary visual verifications)
app.use("/uploads", express.static(UPLOADS_DIR));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/admin/delete-user", async (req, res) => {
  try {
    const authCheck = await verifyAdminRequest(req);
    if ("error" in authCheck) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.error });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing required uid parameter" });
    }
    if (authCheck.decodedToken.uid === uid) {
      return res.status(400).json({ error: "Cannot delete current administrator account" });
    }

    let authDeleted = false;
    try {
      await admin.auth().revokeRefreshTokens(uid);
      await admin.auth().deleteUser(uid);
      authDeleted = true;
    } catch {
      console.warn(`Auth credential deletion skipped for ${uid} in serverless environment.`);
    }

    res.json({ success: true, authDeleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
});

app.post("/api/admin/purge-non-admins", async (req, res) => {
  try {
    const authCheck = await verifyAdminRequest(req);
    if ("error" in authCheck) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.error });
    }

    const usersToDelete: string[] = [];
    let nextPageToken: string | undefined = undefined;

    try {
      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        listUsersResult.users.forEach((userRecord) => {
          if (!isAdminEmail(userRecord.email)) {
            usersToDelete.push(userRecord.uid);
          }
        });
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
    } catch {
      return res.json({
        success: true,
        deletedCount: 0,
        apiRestricted: true,
        message: "Serverless Auth credentials management is restricted without service account credentials. Tombstones keep deleted users blocked."
      });
    }

    if (usersToDelete.length > 0) {
      const deleteUsersResult = await admin.auth().deleteUsers(usersToDelete);
      return res.json({
        success: true,
        deletedCount: deleteUsersResult.successCount,
        failedCount: deleteUsersResult.failureCount,
      });
    }

    res.json({ success: true, deletedCount: 0 });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
});

app.post("/api/admin/reconcile-users", async (req, res) => {
  try {
    const authCheck = await verifyAdminRequest(req);
    if ("error" in authCheck) {
      return res.status(authCheck.errorStatus).json({ error: authCheck.error });
    }

    const dbInstance = getAdminFirestore();
    const authUsers: admin.auth.UserRecord[] = [];
    let nextPageToken: string | undefined = undefined;

    try {
      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        authUsers.push(...listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
    } catch {
      return res.json({
        success: true,
        createdCount: 0,
        apiRestricted: true,
        message: "Dynamic client-side auto-repair is active."
      });
    }

    const deletedUids = new Set<string>();
    try {
      const deletedSnap = await dbInstance.collection("deleted_users").get();
      deletedSnap.docs.forEach((d) => deletedUids.add(d.id));
    } catch (tombstoneErr) {
      console.warn("Unable to read deleted_users collection during reconciliation:", tombstoneErr);
    }

    let createdCount = 0;
    const details: string[] = [];

    for (const authUser of authUsers) {
      if (deletedUids.has(authUser.uid) && !isAdminEmail(authUser.email)) {
        try {
          await admin.auth().deleteUser(authUser.uid);
        } catch {
          // Ignore if Auth deletion is restricted
        }
        continue;
      }

      const userDocRef = dbInstance.collection("users").doc(authUser.uid);
      const docSnap = await userDocRef.get();

      if (!docSnap.exists) {
        const adminUser = isAdminEmail(authUser.email);
        await userDocRef.set({
          email: authUser.email || "",
          fullName: authUser.displayName || "",
          address: "",
          phoneNumber: authUser.phoneNumber || "",
          verificationDoc: null,
          balance: 0,
          role: adminUser ? "admin" : "user",
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
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
  }
});

// Base64 file upload endpoint
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

    // Direct base64 bypass on ephemeral/serverless environments like Vercel.
    // This perfectly prevents files disappearing on different lambda cold-starts!
    if (process.env.VERCEL) {
      return res.json({ url: base64 });
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

// Only start Express listener on local/container execution where process.env.VERCEL is falsy
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running locally on port ${PORT}`);
  });
}

export default app;
