import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "../server/config";
import { fail } from "../server/errors";
export interface Actor {
  id: string;
  projectId?: string;
  admin: boolean;
}
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest(),
  );
}
export function authenticate(req: Request): Actor {
  const c = getConfig();
  const supplied = req.headers.get("x-searchops-key") || "";
  if (supplied.length >= 32 && supplied.length <= 512) {
    if (equalSecret(supplied, c.SEARCHOPS_API_KEY))
      return { id: "operator", admin: true };
    for (const [projectId, key] of Object.entries(c.projectKeys))
      if (equalSecret(supplied, key))
        return { id: `project:${projectId}`, projectId, admin: false };
  }
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("searchops_session="))
    ?.slice("searchops_session=".length);
  if (cookie && /^\d{13}\.[a-f0-9]{64}$/.test(cookie)) {
    const [expires, signature] = cookie.split(".");
    const expected = createHmac("sha256", c.SEARCHOPS_API_KEY)
      .update(`session:${expires}`)
      .digest("hex");
    if (
      /^\d{13}$/.test(expires) &&
      Number(expires) > Date.now() &&
      Number(expires) < Date.now() + 86400001 &&
      signature &&
      equalSecret(signature, expected)
    ) {
      if (
        !["GET", "HEAD"].includes(req.method) &&
        req.headers.get("origin") !== new URL(req.url).origin
      )
        fail(403, "FORBIDDEN", "Request is not authorized.");
      return { id: "operator", admin: true };
    }
  }
  fail(401, "UNAUTHORIZED", "Authentication required.");
}
export function sessionCookie() {
  const expires = String(Date.now() + 8 * 3600000);
  const sig = createHmac("sha256", getConfig().SEARCHOPS_API_KEY)
    .update(`session:${expires}`)
    .digest("hex");
  return `searchops_session=${expires}.${sig}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
