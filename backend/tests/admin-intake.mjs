// Runs the reviewer intake functions against stub Auth, NAVER and model APIs.
import assert from "node:assert/strict";

const env = {
  SUPABASE_URL: "https://project.example", SUPABASE_ANON_KEY: "anon",
  NAVER_SEARCH_CLIENT_ID: "naver-id", NAVER_SEARCH_CLIENT_SECRET: "naver-secret",
  ANTHROPIC_API_KEY: "model-key",
};
const handlers = [];
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (fn) => handlers.push(fn) };
const place = await import("../supabase/functions/itda-place-search/index.ts");
const menu = await import("../supabase/functions/itda-menu-extract/index.ts");
const [placeSearch, menuExtract] = handlers;

const roles = { "admin-token": "admin", "student-token": "student" };
let naverItems = [], modelInput = null, lastNaver = null, lastModel = null;
globalThis.fetch = async (url, options = {}) => {
  const u = new URL(url);
  if (u.pathname === "/auth/v1/user") {
    const token = options.headers.Authorization.replace("Bearer ", "");
    if (!roles[token]) return Response.json({}, { status: 401 });
    return Response.json({ id: token, app_metadata: { role: roles[token] } });
  }
  if (u.host === "naverapihub.apigw.ntruss.com") {
    lastNaver = { url: u, headers: options.headers };
    return Response.json({ items: naverItems });
  }
  if (u.host === "api.anthropic.com") {
    lastModel = JSON.parse(options.body);
    return Response.json({ content: [{ type: "tool_use", name: "report_menu", input: modelInput }] });
  }
  throw new Error("unexpected fetch " + url);
};
const call = (handler, token, body) => handler(new Request("https://project.example/fn", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
}));

// Access control: anonymous, students and unknown tokens are refused before any API call.
assert.equal((await call(placeSearch, null, { query: "파리바게뜨" })).status, 401);
assert.equal((await call(placeSearch, "student-token", { query: "파리바게뜨" })).status, 403);
assert.equal((await call(menuExtract, "bogus", { images: [] })).status, 401);
assert.equal(lastNaver, null);
assert.equal((await placeSearch(new Request("https://x/fn", { method: "OPTIONS" }))).status, 200);

// Place search: campus prefix, HTML stripped, both coordinate encodings, off-campus results removed.
naverItems = [
  { title: "<b>파리바게뜨</b> 서울대점", roadAddress: "서울 관악구 관악로 1", telephone: "02-000-0000",
    category: "카페,디저트>베이커리", mapx: "1269522500", mapy: "374600500" },
  { title: "파리바게뜨 봉천점", roadAddress: "서울 관악구 봉천로", mapx: "126.9419", mapy: "37.4823" },
  { title: "학내 카페 &amp; 빵", address: "서울 관악구 관악로 1 301동", mapx: "126.9527", mapy: "37.4500" },
];
let res = await call(placeSearch, "admin-token", { query: "  파리바게뜨 " });
let out = await res.json();
assert.equal(res.status, 200);
assert.equal(lastNaver.url.searchParams.get("query"), "서울대 파리바게뜨");
assert.equal(lastNaver.url.searchParams.get("display"), "5");
assert.equal(lastNaver.headers["X-NCP-APIGW-API-KEY"], "naver-secret");
assert.deepEqual(out.candidates.map((c) => c.ko), ["파리바게뜨 서울대점", "학내 카페 & 빵"]);
assert.equal(out.excluded, 1);
assert.equal(out.candidates[0].lat, 37.46005);
assert.equal(out.candidates[0].lng, 126.95225);
assert.equal(out.candidates[1].address, "서울 관악구 관악로 1 301동");
await call(placeSearch, "admin-token", { query: "서울대 학생회관" });
assert.equal(lastNaver.url.searchParams.get("query"), "서울대 학생회관");
assert.equal((await call(placeSearch, "admin-token", { query: " " })).status, 400);
assert.equal(place.toCandidate({ title: "x", mapx: "abc", mapy: "1" }).lng, NaN);

// Missing secrets are reported, not hidden.
delete env.NAVER_SEARCH_CLIENT_SECRET;
assert.equal((await (await call(placeSearch, "admin-token", { query: "a" })).json()).code, "search_not_configured");
env.NAVER_SEARCH_CLIENT_SECRET = "naver-secret";

// Menu extraction: image validation, forced tool output, sanitizing and dedupe.
const img = { mediaType: "image/jpeg", data: Buffer.from("fake").toString("base64") };
assert.equal((await call(menuExtract, "admin-token", { images: [] })).status, 400);
assert.equal((await call(menuExtract, "admin-token", { images: Array(6).fill(img) })).status, 400);
assert.equal((await call(menuExtract, "admin-token", { images: [{ ...img, mediaType: "image/gif" }] })).status, 400);
assert.equal((await call(menuExtract, "admin-token", { images: [{ ...img, data: "not base64!" }] })).status, 400);
modelInput = {
  menus: [{ ko: " 제육  덮밥 ", en: "Spicy Pork Rice" }, { ko: "제육덮밥", en: "" }, { ko: "", en: "x" },
    { ko: "치즈 라면", en: "" }],
  marks: [{ ingredient: "pork", menus: ["제육 덮밥"], text: "돼지고기: 국내산" },
    { ingredient: "nuts", menus: [], text: "땅콩" }, { ingredient: "dairy", menus: [], text: "" }],
};
res = await call(menuExtract, "admin-token", { images: [img, img] });
out = await res.json();
assert.equal(res.status, 200);
assert.equal(out.code, "ok");
assert.deepEqual(out.menus, [{ ko: "제육 덮밥", en: "Spicy Pork Rice" }, { ko: "치즈 라면", en: "" }]);
assert.deepEqual(out.marks, [{ ingredient: "pork", menus: ["제육 덮밥"], text: "돼지고기: 국내산" }]);
assert.equal(lastModel.tool_choice.name, "report_menu");
assert.equal(lastModel.messages[0].content.filter((c) => c.type === "image").length, 2);
assert.match(lastModel.messages[0].content.at(-1).text, /추측하지 않는다/);
modelInput = { menus: [], marks: [] };
assert.equal((await (await call(menuExtract, "admin-token", { images: [img] })).json()).code, "no_menus");
assert.deepEqual(menu.sanitize(null), { menus: [], marks: [] });

console.log("PASS reviewer-only place search with campus filter, and menu extraction with printed-label marks");
