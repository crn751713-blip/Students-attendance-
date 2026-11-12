import admin from "firebase-admin";

export function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT");
  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id
  });
}

export async function requireAdmin(req) {
  const app = getAdminApp();
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new Error("Unauthorized");
  const decoded = await app.auth().verifyIdToken(header.slice(7));
  if (decoded.admin !== true) throw new Error("Admin only");
  return { app, decoded };
}

export function send(res, status, body) {
  res.status(status).json(body);
}