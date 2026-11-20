// Shared helpers for reviewer-only functions. The caller's own access token is
// checked against Supabase Auth; only app_metadata.role = "admin" may continue.
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

export const reply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: cors });

export async function requireAdmin(req: Request): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !anonKey) return reply(503, { code: "unavailable" });
  if (!token) return reply(401, { code: "login_required" });
  const res = await fetch(url + "/auth/v1/user", {
    headers: { apikey: anonKey, Authorization: "Bearer " + token },
  }).catch(() => null);
  if (!res) return reply(503, { code: "unavailable" });
  if (res.status === 401 || res.status === 403) return reply(401, { code: "login_required" });
  if (!res.ok) return reply(503, { code: "unavailable" });
  const user = await res.json().catch(() => null);
  if (user?.app_metadata?.role !== "admin") return reply(403, { code: "admin_required" });
  return null;
}

// Same polygon as public.itda_in_campus in setup.sql, as [lng, lat] pairs.
const CAMPUS: [number, number][] = [
  [126.9495, 37.4692], [126.9516, 37.4683], [126.9545, 37.4694], [126.9574, 37.4691],
  [126.9614, 37.4665], [126.9622, 37.4631], [126.9599, 37.4589], [126.9603, 37.4558],
  [126.9573, 37.4528], [126.9553, 37.4488], [126.9517, 37.446], [126.9489, 37.4472],
  [126.9481, 37.451], [126.946, 37.4535], [126.9466, 37.4571], [126.9451, 37.4612],
  [126.9465, 37.4647], [126.9477, 37.467],
];

export function inCampus(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  let inside = false;
  for (let i = 0, j = CAMPUS.length - 1; i < CAMPUS.length; j = i++) {
    const [xi, yi] = CAMPUS[i], [xj, yj] = CAMPUS[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
