export const fields = [
  "pork",
  "beef",
  "chicken",
  "other",
  "seafood",
  "egg",
  "dairy",
];
export const ingredients = {
  pork: ["돼지고기", "Pork"],
  beef: ["소고기", "Beef"],
  chicken: ["닭고기", "Chicken"],
  other: ["기타 고기", "Other meat"],
  seafood: ["해산물", "Seafood"],
  egg: ["계란", "Egg"],
  dairy: ["유제품", "Dairy"],
};
export const tags = [
  {
    id: "pork",
    label: ["돼지고기 없음", "No pork"],
    fields: ["pork"],
    color: "#bb5368",
    bg: "#fff1f3",
  },
  {
    id: "beef",
    label: ["소고기 없음", "No beef"],
    fields: ["beef"],
    color: "#9c6639",
    bg: "#fcf2e6",
  },
  {
    id: "meat",
    label: ["고기 없음", "No meat"],
    fields: fields.slice(0, 4),
    color: "#408552",
    bg: "#eaf5e9",
  },
  {
    id: "seafood",
    label: ["해산물 없음", "No seafood"],
    fields: ["seafood"],
    color: "#397c9e",
    bg: "#eaf4fa",
  },
  {
    id: "egg",
    label: ["계란 없음", "No egg"],
    fields: ["egg"],
    color: "#977217",
    bg: "#fff5cf",
  },
  {
    id: "dairy",
    label: ["유제품 없음", "No dairy"],
    fields: ["dairy"],
    color: "#7962a8",
    bg: "#f2edfb",
  },
];
export const states = {
  unknown: ["미확인", "Unknown"],
  yes: ["포함", "Contains"],
  no: ["미포함", "Absent"],
};
export const methods = {
  staff: ["직원 확인", "Staff confirmation"],
  label: ["메뉴판·성분표", "Menu or label"],
  self: ["직접 확인", "Direct observation"],
};
export const types = {
  edit: ["정보 수정", "Ingredient update"],
  menu: ["새 메뉴", "New menu"],
  restaurant: ["새 식당", "New restaurant"],
  close: ["폐점 신고", "Restaurant closure"],
  end: ["판매 종료 신고", "Discontinued menu"],
};
export const statuses = {
  pending: ["검토 대기", "Pending"],
  approved: ["반영됨", "Applied"],
  rejected: ["반려", "Rejected"],
  failed: ["반영 실패", "Apply failed"],
};
export const labels = {
  ...ingredients,
  ko: ["한글명", "Korean name"],
  en: ["영문명", "English name"],
  photo: ["사진", "Photo"],
  address: ["위치 설명", "Location"],
  lat: ["위도", "Latitude"],
  lng: ["경도", "Longitude"],
  phone: ["전화번호", "Phone"],
};
export const name = (row, lang) =>
  row ? (lang === "en" ? row.en || row.ko : row.ko || row.en) : "";
export const tagList = (m) =>
  tags.filter((t) => t.fields.every((f) => m.ingredients?.[f] === "no"));
export const matches = (m, ids) =>
  ids.every((id) => tagList(m).some((t) => t.id === id));
export const norm = (s) => (s || "").replace(/\s/g, "").toLowerCase();
export const origin = { lat: 37.46005, lng: 126.95225 };
export function distance(a, b) {
  if (!a || !b || ![a.lat, a.lng, b.lat, b.lng].every(Number.isFinite))
    return Infinity;
  const rad = Math.PI / 180,
    dlat = (b.lat - a.lat) * rad,
    dlng = (b.lng - a.lng) * rad;
  return (
    12742000 *
    Math.asin(
      Math.min(
        1,
        Math.sqrt(
          Math.sin(dlat / 2) ** 2 +
            Math.cos(a.lat * rad) *
              Math.cos(b.lat * rad) *
              Math.sin(dlng / 2) ** 2,
        ),
      ),
    )
  );
}
const initial = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ",
  vowels = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ",
  final = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
function letters(s, initials = false) {
  return Array.from(s.toLowerCase())
    .map((c) => {
      const n = c.charCodeAt(0) - 44032;
      if (n < 0 || n > 11171) return c;
      return (
        initial[Math.floor(n / 588)] +
        (initials
          ? ""
          : vowels[Math.floor((n % 588) / 28)] + final[n % 28].trim())
      );
    })
    .join("");
}
function searchMatch(records, term) {
  if (!term) return { rank: 0, suffix: "" };
  const query = letters(term);
  const initialsOnly = [...term].every((ch) => initial.includes(ch));
  let best = null;
  for (const record of records) {
    for (const title of [record.ko, record.en].filter(Boolean)) {
      for (const word of new Set([title, ...title.split(/[\s·()-]+/)])) {
        const candidate = letters(word, initialsOnly);
        if (!candidate.startsWith(query)) continue;
        const suffix = candidate.slice(query.length);
        const rank = query.length;
        if (
          !best ||
          rank > best.rank ||
          (rank === best.rank && suffix.localeCompare(best.suffix, "ko") < 0)
        ) {
          best = { rank, suffix };
        }
      }
    }
  }
  return best || { rank: -1, suffix: "" };
}
export function explore(db, { query, mode, selected, sort, location }) {
  const q = query.trim();
  if (query.length && !q) return [];
  const rows = db.restaurants
    .filter((r) => !r.hidden)
    .map((r) => {
      const ms = db.menus.filter((m) => m.rid === r.id && !m.hidden),
        good = ms.filter((m) => matches(m, selected));
      const { rank, suffix } = searchMatch(
        mode === "menu" && q ? good : [r],
        q,
      );
      const counts = tags.map(
        (t) => ms.filter((m) => matches(m, [t.id])).length,
      );
      const peak = Math.max(0, ...counts),
        rep = peak ? tags[counts.indexOf(peak)] : null;
      return {
        ...r,
        ms,
        good,
        rank,
        suffix,
        rep,
        color: rep?.color || "#808a87",
        distance: distance(location || origin, r),
        tagIds: tags.filter((_, i) => counts[i] > 0).map((t) => t.id),
      };
    })
    .filter((r) => (!selected.length || r.good.length > 0) && r.rank >= 0);
  return rows.sort((a, b) =>
    sort === "distance"
      ? a.distance - b.distance
      : (q ? b.rank - a.rank : 0) ||
        (q && a.suffix.localeCompare(b.suffix, "ko")) ||
        (selected.length ? b.good.length - a.good.length : 0) ||
        a.distance - b.distance,
  );
}
export function currentField(c, k) {
  return fields.includes(k) ? c?.ingredients?.[k] || "unknown" : (c?.[k] ?? "");
}
export const rankMethod = (m) => ({ staff: 3, label: 2, self: 1 })[m] || 0;
export function higherPriority(a, b) {
  return (
    rankMethod(a.method) > rankMethod(b.method) ||
    (rankMethod(a.method) === rankMethod(b.method) &&
      a.created_at > b.created_at)
  );
}
export function exception(code) {
  throw new Error(code);
}
export function applyReport(db, r, keys) {
  const restaurant = db.restaurants.find((x) => x.id === r.rid && !x.hidden),
    menu = db.menus.find((x) => x.id === r.mid && !x.hidden);
  const changes = Object.fromEntries(
    Object.entries(r.changes).filter(([k]) => keys.includes(k)),
  );
  if (r.type === "restaurant") {
    if (
      !changes.ko ||
      !Number.isFinite(changes.lat) ||
      !Number.isFinite(changes.lng)
    )
      exception("requiredLocation");
    if (
      db.restaurants.some(
        (x) =>
          !x.hidden &&
          norm(x.ko) === norm(changes.ko) &&
          distance(x, changes) <= 50,
      )
    )
      exception("duplicateRestaurant");
    db.restaurants.push({ id: r.rid, ...changes });
  } else if (!restaurant) exception("missing");
  else if (r.type === "close") restaurant.hidden = true;
  else if (r.type === "end") {
    if (!menu) exception("missing");
    menu.hidden = true;
  } else {
    if (r.type === "edit" && !menu) exception("missing");
    if (r.type === "menu" && !changes.ko) exception("requiredName");
    if (
      r.type === "menu" &&
      db.menus.some(
        (x) => !x.hidden && x.rid === r.rid && norm(x.ko) === norm(changes.ko),
      )
    )
      exception("duplicateMenu");
    const target =
      r.type === "edit"
        ? menu
        : {
            id: r.mid,
            rid: r.rid,
            ingredients: Object.fromEntries(fields.map((f) => [f, "unknown"])),
            evidence: {},
          };
    for (const [k, v] of Object.entries(changes)) {
      if (fields.includes(k)) {
        const rival = db.reports.some(
          (other) =>
            other.id !== r.id &&
            other.mid === r.mid &&
            ["approved", "pending"].includes(other.status) &&
            Object.hasOwn(other.changes, k) &&
            other.changes[k] !== v &&
            (other.status === "pending" || other.approved_keys?.includes(k)) &&
            higherPriority(other, r),
        );
        if (rival) exception("conflict");
        target.ingredients[k] = v;
        target.evidence[k] = {
          method: r.method,
          date: r.created_at.slice(0, 10),
        };
      } else target[k] = v;
    }
    if (r.type === "menu") db.menus.push(target);
  }
}
