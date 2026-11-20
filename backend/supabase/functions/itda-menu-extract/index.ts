// INP-11: reviewers upload kiosk or menu-board photos and get back the printed
// menu names, plus origin/allergen labels that are printed on the photo. Nothing
// is saved here; the reviewer edits the result before registering it.
import { cors, reply, requireAdmin } from "../_shared/admin.ts";

const INGREDIENTS = ["pork", "beef", "chicken", "other", "seafood", "egg", "dairy"];
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 5, MAX_BYTES = 5 * 1024 * 1024;

const PROMPT = `서울대학교 학내 식당의 키오스크 또는 메뉴판 사진이다. 사진에 인쇄된 글자만 읽어라.
1. menus: 판매 메뉴 이름을 모두 적는다. ko에는 한글 메뉴명, en에는 사진에 영문명이 인쇄된 경우에만 그 영문명을 적고 없으면 빈 문자열. 번역하거나 지어내지 않는다. 가격, 옵션, 사이즈, 세트 구성 문구는 메뉴명에서 뺀다.
2. marks: 사진에 원산지 표시나 알레르기 유발물질 표시가 인쇄돼 있으면, 그 표시가 직접 말하는 식재료만 적는다.
   돼지고기→pork, 쇠고기·소고기→beef, 닭고기→chicken, 오리·양·염소 등 다른 고기→other, 수산물·새우·게·오징어·조개·고등어·낙지 등→seafood, 난류·계란→egg, 우유·유제품→dairy.
   menus에는 표시가 특정 메뉴를 가리키면 그 메뉴명을, 매장 전체 표시면 빈 배열을 적는다. text에는 근거 문구를 그대로 적는다.
메뉴 이름이나 음식 사진으로 재료를 추측하지 않는다. 표시가 없으면 marks는 빈 배열이다.`;

// Structured Outputs (strict): every property required, no extra keys.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    menus: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { ko: { type: "string" }, en: { type: "string" } },
        required: ["ko", "en"],
      },
    },
    marks: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          ingredient: { type: "string", enum: INGREDIENTS },
          menus: { type: "array", items: { type: "string" } },
          text: { type: "string" },
        },
        required: ["ingredient", "menus", "text"],
      },
    },
  },
  required: ["menus", "marks"],
};

// The Responses API returns the JSON as output_text inside a message item.
export function outputJson(data: unknown): unknown {
  const items = Array.isArray((data as { output?: unknown })?.output) ? (data as { output: unknown[] }).output : [];
  for (const item of items as { type?: string; content?: { type?: string; text?: string }[] }[]) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    const part = item.content.find((c) => c?.type === "output_text" && typeof c.text === "string");
    if (part) return JSON.parse(part.text as string);
  }
  return null;
}

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
const key = (s: string) => s.replace(/\s+/g, "");

export function sanitize(raw: unknown) {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const menus: { ko: string; en: string }[] = [];
  for (const m of Array.isArray(input.menus) ? input.menus : []) {
    const ko = clean(m?.ko, 60), en = clean(m?.en, 80);
    if (!ko || seen.has(key(ko)) || menus.length >= 100) continue;
    seen.add(key(ko));
    menus.push({ ko, en });
  }
  const marks: { ingredient: string; menus: string[]; text: string }[] = [];
  for (const m of Array.isArray(input.marks) ? input.marks : []) {
    if (!INGREDIENTS.includes(m?.ingredient) || marks.length >= 100) continue;
    const text = clean(m.text, 200);
    if (!text) continue;
    const names = (Array.isArray(m.menus) ? m.menus : []).map((n: unknown) => clean(n, 60)).filter(Boolean).slice(0, 50);
    marks.push({ ingredient: m.ingredient, menus: names, text });
  }
  return { menus, marks };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { code: "method" });
  try {
    const denied = await requireAdmin(req);
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    const images = Array.isArray(body?.images) ? body.images : [];
    if (!images.length || images.length > MAX_IMAGES) return reply(400, { code: "invalid_images" });
    for (const img of images) {
      if (!TYPES.includes(img?.mediaType) || typeof img?.data !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(img.data) ||
        Math.floor(img.data.length * 3 / 4) > MAX_BYTES) return reply(400, { code: "invalid_images" });
    }
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return reply(503, { code: "extract_not_configured" });
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("ITDA_MENU_MODEL") || "gpt-5.4",
        input: [{
          role: "user",
          content: [
            ...images.map((img: { mediaType: string; data: string }) => ({
              type: "input_image", image_url: `data:${img.mediaType};base64,${img.data}`, detail: "high",
            })),
            { type: "input_text", text: PROMPT },
          ],
        }],
        text: { format: { type: "json_schema", name: "report_menu", strict: true, schema: SCHEMA } },
      }),
    }).catch(() => null);
    if (!res || !res.ok) return reply(502, { code: "extract_failed" });
    const data = await res.json().catch(() => null);
    let parsed: unknown = null;
    try { parsed = outputJson(data); } catch { parsed = null; }
    if (!parsed) return reply(502, { code: "extract_failed" });
    const result = sanitize(parsed);
    return reply(200, { code: result.menus.length ? "ok" : "no_menus", ...result });
  } catch {
    return reply(503, { code: "unavailable" });
  }
});
