const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const init = () => {
  if (admin.apps.length) return;

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else {
    const file = path.resolve(__dirname, "..", process.env.FIREBASE_CREDENTIALS_PATH || "server/serviceAccountKey.json");
    if (fs.existsSync(file)) credential = admin.credential.cert(JSON.parse(fs.readFileSync(file, "utf8")));
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  admin.initializeApp(credential ? { credential } : { projectId });
};

const verifyIdToken = (idToken) => {
  init();
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { verifyIdToken };
