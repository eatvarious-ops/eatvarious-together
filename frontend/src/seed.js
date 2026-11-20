import greenBowl from "../assets/green-bowl.jpg";
import noodleHouse from "../assets/noodle-house.jpg";
import riceKitchen from "../assets/rice-kitchen.jpg";
import pastaTable from "../assets/pasta-table.jpg";
import sandwichRoom from "../assets/sandwich-room.jpg";
import sliceOven from "../assets/slice-oven.jpg";

// Illustrative photographs downloaded from images.unsplash.com (Unsplash License).
// green-bowl: photo-1512621776951-a57141f2eefd; noodle-house: photo-1569718212165-3a8278d5f624
// rice-kitchen: photo-1512058564366-18510be2db19; pasta-table: photo-1473093295043-cdd812d0e601
// sandwich-room: photo-1528735602780-2552fd46c7af; slice-oven: photo-1513104890138-7c749659a591
// Fictional local preview fixtures. Names, map points, recipes and histories are illustrative.
// Photos depict food for visual orientation only. They are never used as ingredient evidence.
export const restaurants = [
  {
    id: "leaf",
    ko: "초록한끼",
    en: "Leaf Bowl",
    lat: 37.4608,
    lng: 126.9516,
    address: "관악캠퍼스 · 인문대학 인근",
    addressEn: "Gwanak Campus · Humanities area",
    category: "샐러드·보울",
    categoryEn: "Salads & bowls",
    photo: greenBowl,
  },
  {
    id: "grain",
    ko: "소담한 그릇",
    en: "Sodam Rice Kitchen",
    lat: 37.4637,
    lng: 126.9501,
    address: "관악캠퍼스 · 정문 방면",
    addressEn: "Gwanak Campus · Main Gate area",
    category: "한식·덮밥",
    categoryEn: "Korean rice bowls",
    photo: riceKitchen,
  },
  {
    id: "noodle",
    ko: "면과 사이",
    en: "Between Noodles",
    lat: 37.459,
    lng: 126.9534,
    address: "관악캠퍼스 · 중앙도서관 인근",
    addressEn: "Gwanak Campus · Library area",
    category: "아시안·면 요리",
    categoryEn: "Asian noodles",
    photo: noodleHouse,
  },
  {
    id: "toast",
    ko: "한칸 샌드",
    en: "One Room Sandwich",
    lat: 37.4662,
    lng: 126.9503,
    address: "관악캠퍼스 · 미술관 인근",
    addressEn: "Gwanak Campus · Art museum area",
    category: "샌드위치",
    categoryEn: "Sandwiches",
    photo: sandwichRoom,
  },
  {
    id: "pasta",
    ko: "오후의 포크",
    en: "Afternoon Fork",
    lat: 37.4579,
    lng: 126.9503,
    address: "관악캠퍼스 · 자연과학대학 인근",
    addressEn: "Gwanak Campus · Science area",
    category: "이탈리안·파스타",
    categoryEn: "Italian pasta",
    photo: pastaTable,
  },
  {
    id: "oven",
    ko: "둥근화덕",
    en: "Round Oven",
    lat: 37.4629,
    lng: 126.9541,
    address: "관악캠퍼스 · 미술대학 인근",
    addressEn: "Gwanak Campus · Fine Arts area",
    category: "화덕 피자",
    categoryEn: "Oven-baked pizza",
    photo: sliceOven,
  },
].map((row) => ({ ...row, phone: "", demo: true }));

const ingredientKeys = [
  "pork",
  "beef",
  "chicken",
  "other",
  "seafood",
  "egg",
  "dairy",
];

function sampleMenu(id, rid, ko, en, values, method, date, photo = "") {
  const ingredients = Object.fromEntries(
    ingredientKeys.map((key, i) => [key, values[i]]),
  );
  const evidence = Object.fromEntries(
    ingredientKeys
      .filter((key) => ingredients[key] !== "unknown")
      .map((key) => [key, { method, date }]),
  );
  return { id, rid, ko, en, ingredients, evidence, photo, demo: true };
}

const N = "no";
const Y = "yes";
const U = "unknown";

export const menus = [
  sampleMenu(
    "garden",
    "leaf",
    "가든 채소 보울",
    "Garden vegetable bowl",
    [N, N, N, N, N, N, N],
    "staff",
    "2026-11-18",
    greenBowl,
  ),
  sampleMenu(
    "tofu",
    "leaf",
    "구운 두부 보울",
    "Roasted tofu bowl",
    [N, N, N, N, N, N, U],
    "label",
    "2026-11-16",
  ),
  sampleMenu(
    "chicken",
    "leaf",
    "레몬 치킨 보울",
    "Lemon chicken bowl",
    [N, N, Y, N, U, N, N],
    "staff",
    "2026-11-17",
  ),
  sampleMenu(
    "mushroom",
    "grain",
    "들깨 버섯덮밥",
    "Perilla mushroom rice",
    [N, N, N, N, U, N, N],
    "staff",
    "2026-11-18",
  ),
  sampleMenu(
    "fried-rice",
    "grain",
    "김치 달걀볶음밥",
    "Kimchi egg fried rice",
    [Y, N, N, N, Y, Y, N],
    "label",
    "2026-11-15",
    riceKitchen,
  ),
  sampleMenu(
    "bulgogi",
    "grain",
    "간장 불고기덮밥",
    "Soy bulgogi rice",
    [U, Y, N, N, N, Y, N],
    "self",
    "2026-11-14",
  ),
  sampleMenu(
    "miso",
    "noodle",
    "미소 라멘",
    "Miso ramen",
    [Y, N, U, U, Y, Y, N],
    "staff",
    "2026-11-19",
    noodleHouse,
  ),
  sampleMenu(
    "sesame",
    "noodle",
    "참깨 비빔면",
    "Sesame tossed noodles",
    [U, N, N, N, N, Y, N],
    "label",
    "2026-11-16",
  ),
  sampleMenu(
    "herb-toast",
    "toast",
    "허브 치즈 토스트",
    "Herb cheese toast",
    [N, N, N, N, U, U, Y],
    "label",
    "2026-11-15",
    sandwichRoom,
  ),
  sampleMenu(
    "ham-toast",
    "toast",
    "햄치즈 파니니",
    "Ham and cheese panini",
    [Y, N, N, U, N, U, Y],
    "self",
    "2026-11-17",
  ),
  sampleMenu(
    "pesto",
    "pasta",
    "바질 파르팔레",
    "Basil farfalle",
    [N, N, N, N, N, U, Y],
    "staff",
    "2026-11-19",
    pastaTable,
  ),
  sampleMenu(
    "shrimp",
    "pasta",
    "새우 오일 파스타",
    "Shrimp aglio e olio",
    [N, U, U, U, Y, U, N],
    "staff",
    "2026-11-17",
  ),
  sampleMenu(
    "house",
    "oven",
    "화덕 하우스 피자",
    "House oven pizza",
    [Y, U, N, U, N, N, Y],
    "staff",
    "2026-11-17",
    sliceOven,
  ),
  sampleMenu(
    "season",
    "oven",
    "시즌 피자",
    "Seasonal pizza",
    [U, U, U, U, U, U, U],
    null,
    null,
  ),
];
