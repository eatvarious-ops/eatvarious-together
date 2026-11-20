// In-memory HTTP fixtures for the UI test. Live Auth and RLS are checked separately.
import { build } from "esbuild";
import { applyReport } from "../src/domain.js";
import { randomUUID } from "node:crypto";
const bundle = await build({
  entryPoints: ["src/seed.js"],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  loader: { ".jpg": "dataurl" },
});
const seed = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].contents).toString("base64")
);
export const catalog = {
  restaurants: structuredClone(seed.restaurants),
  menus: structuredClone(seed.menus),
  reports: [],
};
const accounts = new Map();
const makeUser = (username, role) => ({
  id: randomUUID(),
  email: username + "@accounts.itda.invalid",
  user_metadata: { username },
  app_metadata: { role, provider: "email" },
  aud: "authenticated",
});
accounts.set("reviewer", {
  password: "fixture-reviewer",
  user: makeUser("reviewer", "admin"),
});
const sessions = new Map();
export const intakeCalls = [];
export async function mockFetch(input, init = {}) {
  const url = new URL(input.url || input),
    h = new Headers(init.headers || input.headers),
    method = init.method || input.method || "GET";
  const body = init.body ? JSON.parse(init.body) : {},
    path = url.pathname;
  const json = (data, status = 200) => Response.json(data, { status });
  const user = sessions.get(
    (h.get("authorization") || "").replace(/^Bearer /, ""),
  );
  if (path.endsWith("/itda-student-signup")) {
    if (accounts.has(body.username))
      return json({ code: "unavailable_id" }, 409);
    accounts.set(body.username, {
      password: body.password,
      user: makeUser(body.username, "student"),
    });
    return json({ code: "created" }, 201);
  }
  if (path.endsWith("/token")) {
    const a = accounts.get(body.email?.split("@")[0]);
    if (!a || a.password !== body.password)
      return json(
        { code: "invalid_credentials", msg: "Invalid login credentials" },
        400,
      );
    const enc = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const tok = [
      enc({ alg: "HS256" }),
      enc({ sub: a.user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
      "c2ln",
    ].join(".");
    sessions.set(tok, a.user);
    return json({
      access_token: tok,
      token_type: "bearer",
      refresh_token: randomUUID(),
      expires_in: 3600,
      user: a.user,
    });
  }
  if (path.endsWith("/logout")) return new Response(null, { status: 204 });
  if (path.endsWith("/itda-place-search") || path.endsWith("/itda-menu-extract")) {
    if (user?.app_metadata.role !== "admin")
      return json({ code: "admin_required" }, 403);
    intakeCalls.push({ path, body });
    if (path.endsWith("/itda-place-search"))
      return json({
        code: "ok",
        query: "서울대 " + body.query,
        excluded: 1,
        candidates: [
          { ko: "테스트 카페 서울대점", address: "관악로 1 301동", phone: "02-880-0000",
            category: "카페", lat: 37.452, lng: 126.952 },
        ],
      });
    return json({
      code: "ok",
      menus: [{ ko: "햄 샌드위치", en: "Ham Sandwich" }, { ko: "아메리카노", en: "" }],
      marks: [{ ingredient: "pork", menus: ["햄 샌드위치"], text: "돼지고기: 국내산" },
        { ingredient: "dairy", menus: [], text: "우유 함유" }],
    });
  }
  if (path.endsWith("/review_report")) {
    if (user?.app_metadata.role !== "admin") return json({}, 403);
    const r = catalog.reports.find((r) => r.id === body.p_id);
    applyReport(catalog, r, body.p_keys);
    r.status = "approved";
    r.approved_keys = body.p_keys;
    return json("approved");
  }
  if (path.startsWith("/rest/v1/")) {
    const table = path.split("/").at(-1);
    if (method === "POST" && table === "reports" && user) {
      catalog.reports.push({
        ...body,
        uid: user.id,
        author: user.user_metadata.username,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      return new Response(null, { status: 201 });
    }
    const rows = catalog[table].filter(
      (row) =>
        table !== "reports" ||
        (user && (user.app_metadata.role === "admin" || row.uid === user.id)),
    );
    const after = url.searchParams.get("id")?.replace(/^gt\./, "");
    return json(
      rows
        .filter((r) => !after || r.id > after)
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((r) => (table === "reports" ? r : { id: r.id, data: r })),
    );
  }
  throw Error("Unexpected test request " + path);
}
