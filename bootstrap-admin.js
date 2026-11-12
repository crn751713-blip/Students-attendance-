import { getAdminApp, send } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const secret = req.headers["x-bootstrap-secret"];
    if (!process.env.BOOTSTRAP_SECRET || secret !== process.env.BOOTSTRAP_SECRET) return send(res, 403, { error: "Forbidden" });
    const app = getAdminApp();
    const { email } = req.body || {};
    if (typeof email !== "string" || !email.endsWith("@attendance.local")) return send(res, 400, { error: "Use the admin login email" });
    const user = await app.auth().getUserByEmail(email.toLowerCase());
    await app.auth().setCustomUserClaims(user.uid, { admin: true });
    await app.firestore().collection("users").doc(user.uid).set({
      studentId: email.split("@")[0], displayName: user.displayName || "Administrator",
      role: "admin", photoURL: "", telegram: ""
    }, { merge: true });
    return send(res, 200, { ok: true, message: "Admin role assigned. Sign out and sign in again." });
  } catch (e) {
    return send(res, 400, { error: e.message || "Setup failed" });
  }
}