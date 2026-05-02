import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin using Application Default Credentials
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get User Profile
  app.get("/api/get-user/:uid", async (req, res) => {
    try {
      const userDoc = await db.collection("users").doc(req.params.uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      res.json(userDoc.data());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Update Balance (Admin Only)
  app.post("/api/update-balance", async (req, res) => {
    const { uid, delta, adminUid } = req.body;
    try {
      const adminDoc = await db.collection("users").doc(adminUid).get();
      if (adminDoc.data()?.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

      const userRef = db.collection("users").doc(uid);
      await userRef.update({
        balance: admin.firestore.FieldValue.increment(delta)
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  // Set Deposit Addresses (Admin Only)
  app.post("/api/set-addresses", async (req, res) => {
    const { addresses, adminUid } = req.body;
    try {
      const adminDoc = await db.collection("users").doc(adminUid).get();
      if (adminDoc.data()?.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

      await db.collection("settings").doc("addresses").set(addresses);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  // Simulate Trade
  app.post("/api/trade", async (req, res) => {
    const { amount, duration, uid } = req.body;
    const isWin = Math.random() > 0.5;
    const delta = isWin ? amount : -amount;

    try {
      const userRef = db.collection("users").doc(uid);
      await userRef.update({
        balance: admin.firestore.FieldValue.increment(delta)
      });

      await db.collection("transactions").add({
        userId: uid,
        type: "trade",
        amount: amount,
        status: "completed",
        details: `${isWin ? "WIN" : "LOSS"} | ${duration}s Duration (via API)`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ result: isWin ? "win" : "loss", amount: delta });
    } catch (error) {
      res.status(500).json({ error: "Trade failed" });
    }
  });

  // Withdraw
  app.post("/api/withdraw", async (req, res) => {
    const { uid, amount, address } = req.body;
    try {
      const userRef = db.collection("users").doc(uid);
      const userDoc = await userRef.get();
      if (userDoc.data()?.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

      await userRef.update({
        balance: admin.firestore.FieldValue.increment(-amount)
      });

      await db.collection("transactions").add({
        userId: uid,
        type: "withdraw",
        amount: amount,
        status: "pending",
        details: `Wallet: ${address} (via API)`,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Withdraw failed" });
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
