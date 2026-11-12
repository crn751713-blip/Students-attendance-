import crypto from "node:crypto";
import { requireAdmin, send } from "./_admin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return send(res, 401, { error: "Login required" });
    const { app, decoded } = await (async () => {
      // Any authenticated Firebase user may request a short-lived ImageKit signature.
      const { getAdminApp } = await import("./_admin.js");
      const a = getAdminApp();
      const d = await a.auth().verifyIdToken(header.slice(7));
      return { app: a, decoded: d };
    })();
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) return send(res, 500, { error: "Image upload is not configured" });
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 5 * 60;
    const signature = crypto.createHmac("sha1", privateKey).update(token + expire).digest("hex");
    return send(res, 200, { token, expire, signature, publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
  } catch (e) {
    return send(res, 401, { error: e.message || "Unauthorized" });
  }
}