import fs from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let firebaseApp;

export function getFirebaseAdminAuth() {
  if (!firebaseApp) {
    const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (!credentialsPath) {
      throw new Error("Firebase service-account path is not configured");
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(credentialsPath, "utf8")
    );

    firebaseApp = getApps().find(
      (app) => app.name === "fitbro-admin"
    ) || initializeApp(
      { credential: cert(serviceAccount) },
      "fitbro-admin"
    );
  }

  return getAuth(firebaseApp);
}
