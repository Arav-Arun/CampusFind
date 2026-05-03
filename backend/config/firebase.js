const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

/**
 * Initialize Firebase Admin SDK.
 * Strategy 1: FIREBASE_SERVICE_ACCOUNT_JSON env var (production/Vercel)
 * Strategy 2: File path from FIREBASE_CREDENTIALS_PATH (local dev)
 */
const initializeFirebase = () => {
  if (admin.apps.length > 0) return; // Already initialized

  let credential = null;

  // Strategy 1: JSON string from environment variable
  const firebaseJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (firebaseJson) {
    try {
      const keyData = JSON.parse(firebaseJson);
      credential = admin.credential.cert(keyData);
      console.log("Firebase: Loaded credentials from environment variable");
    } catch (err) {
      console.error("Firebase: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
    }
  }

  // Strategy 2: File path (local development)
  if (!credential) {
    let credPath = process.env.FIREBASE_CREDENTIALS_PATH || "serviceAccountKey.json";
    if (!path.isAbsolute(credPath)) {
      credPath = path.join(__dirname, "..", credPath);
    }
    if (fs.existsSync(credPath)) {
      try {
        credential = admin.credential.cert(require(credPath));
        console.log("Firebase: Loaded credentials from file:", credPath);
      } catch (err) {
        console.error("Firebase: Failed to load cert file:", err.message);
      }
    }
  }

  // Initialize
  try {
    const config = {
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    };
    if (credential) {
      config.credential = credential;
    }
    admin.initializeApp(config);
    console.log("Firebase Admin initialized successfully");
  } catch (err) {
    console.error("Firebase: Initialization failed:", err.message);
  }
};

initializeFirebase();

module.exports = admin;
