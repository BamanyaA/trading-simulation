import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { OperationType, FirestoreErrorInfo } from "./types";

const app = initializeApp(firebaseConfig);

// Use initializeFirestore with settings to enable long polling for better reliability in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth();

export { OperationType };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection
async function testConnection() {
  try {
    // Attempt to get a document that shouldn't exist to test connectivity
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firestore connection test: SUCCESS");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("unavailable") || error.message.includes("the client is offline")) {
        console.error("CRITICAL: Could not reach Cloud Firestore backend. This apps functionality will be limited.");
        console.error("Please ensure your Firebase project is correctly configured and Firestore is enabled.");
      } else {
        console.warn("Firestore connection test encountered an error (this may be normal if path is restricted):", error.message);
      }
    }
  }
}
testConnection();
