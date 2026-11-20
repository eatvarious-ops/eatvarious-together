// INP-10: reviewers look up a campus restaurant by name through NAVER local
// search. The Client Secret stays on the server; only campus results return.
import { inCampus, reply, requireAdmin, cors } from "../_shared/admin.ts";

const DEFAULT_ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/local";

const strip = (s: unknown) =>
  typeof s === "string"
    ? s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
    : "";

// NAVER returns WGS84 degrees; older responses scale them by 1e7.
function degrees(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return Math.abs(n) > 1000 ? n / 1e7 : n;
}

export function toCandidate(item: Record<string, unknown>) {
  const lat = degrees(item.mapy), lng = degrees(item.mapx);
  return {
    ko: strip(item.title),
    address: strip(item.roadAddress) || strip(item.address),
    phone: strip(item.telephone),
    category: strip(item.category),
    lat: Math.round(lat * 1e7) / 1e7,
    lng: Math.round(lng * 1e7) / 1e7,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { code: "method" });
  try {
    const denied = await requireAdmin(req);
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    const name = typeof body?.query === "string" ? body.query.replace(/\s+/g, " ").trim() : "";
    if (!name || name.length > 60) return reply(400, { code: "invalid_query" });
    const id = Deno.env.get("NAVER_SEARCH_CLIENT_ID"), secret = Deno.env.get("NAVER_SEARCH_CLIENT_SECRET");
    if (!id || !secret) return reply(503, { code: "search_not_configured" });
    const query = /서울대/.test(name) ? name : "서울대 " + name;
    const endpoint = new URL(Deno.env.get("NAVER_SEARCH_ENDPOINT") || DEFAULT_ENDPOINT);
    endpoint.searchParams.set("query", query);
    endpoint.searchParams.set("display", "5");
    const res = await fetch(endpoint, {
      headers: { "X-NCP-APIGW-API-KEY-ID": id, "X-NCP-APIGW-API-KEY": secret },
    }).catch(() => null);
    if (!res || !res.ok) return reply(502, { code: "search_failed" });
    const data = await res.json().catch(() => null);
    const items: Record<string, unknown>[] = Array.isArray(data?.items) ? data.items : [];
    const all = items.map(toCandidate).filter((c) => c.ko && Number.isFinite(c.lat) && Number.isFinite(c.lng));
    const candidates = all.filter((c) => inCampus(c.lat, c.lng));
    return reply(200, { code: "ok", query, candidates, excluded: all.length - candidates.length });
  } catch {
    return reply(503, { code: "unavailable" });
  }
});
