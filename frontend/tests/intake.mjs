// Reviewer intake (INP-10~12) against the in-memory Supabase fixtures.
import assert from "node:assert/strict";
import fs from "node:fs";
import { catalog, mockFetch, intakeCalls } from "./account-api.mjs";
import { JSDOM, VirtualConsole } from "jsdom";
import { within, fireEvent } from "@testing-library/dom";

const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => errors.push(e.message));
const html = fs.readFileSync(new URL("../dist/index.html", import.meta.url), "utf8").replace(
  /window\.ITDA_CONFIG=[^<]+/,
  'window.ITDA_CONFIG={"supabaseUrl":"https://itda-test.supabase.co","supabaseAnonKey":"test-public"}',
);
const dom = new JSDOM(html, {
  url: "http://localhost/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    Object.assign(w, {
      structuredClone, ResizeObserver: class { observe() {} disconnect() {} }, scrollTo: () => {},
      TextDecoder, TextEncoder, Response, Request, Headers, fetch: mockFetch, WebSocket,
      createImageBitmap: async () => ({ width: 3200, height: 2400, close() {} }),
    });
    w.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
    w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/jpeg;base64,QUJD";
    w.localStorage.setItem("itda.lang", "ko");
  },
});
const w = dom.window, d = w.document, ui = within(d.body);
const sleep = () => new Promise((r) => setTimeout(r, 50));
async function wait(fn) {
  for (let i = 0; i < 60; i++) { try { const v = fn(); if (v) return v; } catch {} await sleep(); }
  throw new Error("Timed out: " + fn + "\n" + errors.join("\n") + "\n" + d.body.textContent.slice(-1500));
}
const btn = (n) => ui.getByRole("button", { name: n, exact: true });
const click = async (el) => { fireEvent.click(el); await sleep(); };
const text = () => d.body.textContent;

await wait(() => d.querySelectorAll(".result").length === 6);
// Visitors and students keep the ordinary report entry; intake routes bounce home.
assert.ok(btn("식당 추가하기"));
w.location.hash = "page=intake-restaurant";
w.dispatchEvent(new w.HashChangeEvent("hashchange"));
await sleep();
assert.ok(!text().includes("식당 검색 등록"));

// Reviewer login.
await click(btn("로그인"));
const fill = (i, v) => fireEvent.change(d.querySelectorAll(".accountPane input")[i], { target: { value: v } });
fill(0, "reviewer"); fill(1, "fixture-reviewer");
await click(within(d.querySelector(".accountPane form")).getByRole("button", { name: "로그인", exact: true }));
await click(await wait(() => btn("식당 찾기")));

// INP-10: search, pick a campus candidate, register directly.
await click(await wait(() => btn("식당 검색 등록")));
fireEvent.change(ui.getByPlaceholderText("예: 파리바게뜨"), { target: { value: "테스트 카페" } });
await click(btn("검색"));
await wait(() => text().includes("학내 범위 밖 결과 1건은 제외했습니다."));
assert.equal(intakeCalls.at(-1).body.query, "테스트 카페");
await click(ui.getByRole("button", { name: /테스트 카페 서울대점/ }));
assert.equal(ui.getByLabelText("전화번호").value, "02-880-0000");
assert.match(text(), /37\.45200, 126\.95200/);
await click(btn("등록하고 메뉴 추가"));
await wait(() => text().includes("메뉴 일괄 등록"));
const shop = catalog.restaurants.find((r) => r.ko === "테스트 카페 서울대점");
assert.ok(shop);
assert.equal(shop.phone, "02-880-0000");
const shopReport = catalog.reports.find((r) => r.type === "restaurant");
assert.equal(shopReport.status, "approved");
assert.equal(shopReport.author, "reviewer");

// INP-11: read a photo, edit rows, register menus (ingredients stay unknown).
const fileInput = d.querySelector('input[type="file"]');
const photo = new w.File(["fake"], "kiosk.jpg", { type: "image/jpeg" });
Object.defineProperty(fileInput, "files", { value: [photo] });
fireEvent.change(fileInput);
await click(btn("메뉴 읽기"));
await wait(() => d.querySelectorAll(".intakeMenuRow").length === 2);
assert.equal(intakeCalls.at(-1).body.images.length, 1);
assert.deepEqual(intakeCalls.at(-1).body.images[0], { mediaType: "image/jpeg", data: "QUJD" });
assert.match(text(), /돼지고기 · 돼지고기: 국내산 → 햄 샌드위치/);
await click(btn("행 추가"));
const rows = d.querySelectorAll(".intakeMenuRow");
fireEvent.change(rows[2].querySelectorAll("input")[1], { target: { value: "치즈 케이크" } });
await sleep();
await click(btn("선택한 메뉴 3개 등록"));
await wait(() => text().includes("3개 등록"));
const added = catalog.menus.filter((m) => m.rid === shop.id);
assert.deepEqual(added.map((m) => m.ko).sort(), ["아메리카노", "치즈 케이크", "햄 샌드위치"]);
assert.equal(added.find((m) => m.ko === "햄 샌드위치").en, "Ham Sandwich");
assert.ok(added.every((m) => Object.values(m.ingredients).every((v) => v === "unknown")));
assert.equal(d.querySelectorAll(".intakeMenuRow").length, 0);
assert.ok(btn("선택한 메뉴 0개 등록").disabled);

// INP-12: printed label becomes a dashed 'Contains' suggestion; method is required.
await click(btn("식재료 입력하기"));
await wait(() => d.querySelector(".intakeGrid"));
assert.match(text(), /매장 전체 표시/);
const ham = [...d.querySelectorAll(".intakeGrid tbody tr")].find((tr) => tr.textContent.includes("햄 샌드위치"));
const hamPork = ham.querySelector('button[aria-label="돼지고기: 포함"]');
assert.ok(hamPork.classList.contains("hinted"));
assert.equal(ham.querySelector("select").value, "label");
const cake = [...d.querySelectorAll(".intakeGrid tbody tr")].find((tr) => tr.textContent.includes("치즈 케이크"));
await click(cake.querySelector('button[aria-label="유제품: 미확인"]'));
await click(btn("변경한 메뉴 2개 저장"));
assert.match(cake.textContent, /확인 방법을 선택해주세요/);
assert.equal(catalog.menus.find((m) => m.ko === "햄 샌드위치").ingredients.pork, "unknown");
fireEvent.change(cake.querySelector("select"), { target: { value: "staff" } });
fireEvent.change(cake.querySelector("input"), { target: { value: "직원 확인 11/20" } });
await sleep();
await click(btn("변경한 메뉴 2개 저장"));
await wait(() => catalog.menus.find((m) => m.ko === "치즈 케이크").ingredients.dairy === "yes");
const hamSaved = catalog.menus.find((m) => m.ko === "햄 샌드위치");
assert.equal(hamSaved.ingredients.pork, "yes");
assert.equal(hamSaved.evidence.pork.method, "label");
const edits = catalog.reports.filter((r) => r.type === "edit");
assert.equal(edits.length, 2);
assert.ok(edits.every((r) => r.status === "approved"));
assert.deepEqual(edits.find((r) => r.mid === hamSaved.id).changes, { pork: "yes" });
assert.equal(edits.find((r) => r.changes.dairy).memo, "직원 확인 11/20");
await wait(() => btn("변경한 메뉴 0개 저장").disabled);

assert.deepEqual(errors, []);
console.log("PASS: reviewer-only intake routes, place search to direct registration, photo menu extraction to bulk menus, label-hinted ingredient grid with required method");
w.close();
