const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const init = () => {
  if (admin.apps.length) return;

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else {
    const file = path.resolve(__dirname, process.env.FIREBASE_CREDENTIALS_PATH || "serviceAccountKey.json");
    if (fs.existsSync(file)) credential = admin.credential.cert(JSON.parse(fs.readFileSync(file, "utf8")));
  }

  admin.initializeApp(credential ? { credential } : { projectId: process.env.FIREBASE_PROJECT_ID });
};

const verifyIdToken = (idToken) => {
  init();
  return admin.auth().verifyIdToken(idToken);
};

module.exports = { verifyIdToken };
