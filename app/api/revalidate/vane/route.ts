import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

/**
 * On-demand revalidation for /projects/vane. The engine calls this after it
 * upserts the `vane` export row:
 *
 *   curl -X POST -H "Authorization: Bearer $VANE_REVALIDATE_SECRET" \
 *        https://<site>/api/revalidate/vane
 *
 * Without it the page still refreshes on its 300 s ISR window.
 * Fails closed: no secret configured -> 503, wrong/missing token -> 401.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.VANE_REVALIDATE_SECRET;
  if (!secret) return Response.json({ ok: false, error: "revalidation not configured" }, { status: 503 });

  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  revalidatePath("/projects/vane");
  return Response.json({ ok: true, revalidated: "/projects/vane", at: new Date().toISOString() });
}
