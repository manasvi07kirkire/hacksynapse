import { api } from "../../../lib/server/api";
import { sessionCookie } from "../../../lib/auth/api-key";
import { fail } from "../../../lib/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = api(
  async (_req, actor) => {
    if (!actor.admin) fail(403, "FORBIDDEN", "Operator permission required.");
    return Response.json(
      { authenticated: true },
      { headers: { "Set-Cookie": sessionCookie() } },
    );
  },
  { limit: 10 },
);
export const DELETE = api(async () =>
  Response.json(
    { authenticated: false },
    {
      headers: {
        "Set-Cookie":
          "searchops_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      },
    },
  ),
);
