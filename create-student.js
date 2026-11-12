import { getAdminApp, requireAdmin, send } from "./_admin.js";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const { app } = await requireAdmin(req);
    const { studentId, displayName, password } = req.body || {};
    if (!/^[A-Za-z0-9_-]{3,24}$/.test(studentId || "")) return send(res, 400, { error: "Student ID មិនត្រឹមត្រូវ" });
    if (typeof displayName !== "string" || displayName.trim().length < 2 || displayName.length > 70) return send(res, 400, { error: "ឈ្មោះមិនត្រឹមត្រូវ" });
    if (typeof password !== "string" || password.length < 8) return send(res, 400, { error: "Password ត្រូវមានយ៉ាងតិច 8 តួ" });
    const email = `${studentId.toLowerCase()}@attendance.local`;
    const user = await app.auth().createUser({ email, password, displayName: displayName.trim() });
    await app.firestore().collection("users").doc(user.uid).set({
      studentId, displayName: displayName.trim(), role: "student",
      photoURL: "", telegram: "", createdAt: app.firestore.FieldValue.serverTimestamp()
    });
    return send(res, 200, { ok: true, uid: user.uid, studentId });
  } catch (e) {
    return send(res, 403, { error: e.message || "Request failed" });
  }
}