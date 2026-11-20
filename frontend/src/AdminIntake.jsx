// Reviewer intake (PRD 4.3.1, INP-10~12): find a restaurant by name, register
// menus read from a menu-board photo, and fill ingredients in one grid.
// Every save is a normal report approved by the same reviewer.
import React, { useState } from "react";
import { Search, MapPin, ImagePlus, Plus, Check, X } from "lucide-react";
import { fields, ingredients, methods, states, name, norm, distance } from "./domain";
import CampusMap, { inCampus } from "./CampusMap";
import { useApp, message } from "./common";
import { Back, Title } from "./screens";
import { searchPlaces, extractMenus, registerAsAdmin, naverKey } from "./store";

// Printed-label marks from the latest extraction, handed to the ingredient grid.
const pendingMarks = new Map();
const cycle = { unknown: "yes", yes: "no", no: "unknown" };

function Notice({ text, tone = "error" }) {
  if (!text) return null;
  return tone === "error" ? <p className="errorbanner" role="alert">{text}</p> : <p className="formHint">{text}</p>;
}

export function RestaurantIntake() {
  const { t, idx, lang, db, user, go, refresh, toast, userLocation, locate } = useApp();
  const [query, setQuery] = useState(""),
    [candidates, setCandidates] = useState(null),
    [excluded, setExcluded] = useState(0),
    [values, setValues] = useState({ ko: "", en: "", phone: "", address: "" }),
    [pick, setPick] = useState(null),
    [chosen, setChosen] = useState(false),
    [error, setError] = useState(""),
    [hint, setHint] = useState(""),
    [duplicate, setDuplicate] = useState(null),
    [busy, setBusy] = useState(false);
  const val = (k, v) => setValues((o) => ({ ...o, [k]: v }));

  async function search(e) {
    e.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true);
    setError("");
    setHint("");
    try {
      const res = await searchPlaces(query.trim());
      setCandidates(res.candidates || []);
      setExcluded(res.excluded || 0);
      if (!res.candidates?.length) {
        setHint(t("검색 결과가 없습니다. 지도에서 직접 위치를 지정해주세요.",
          "No results. Pick the location on the map."));
        manual();
      }
    } catch (e) {
      setCandidates([]);
      setHint(message(e, idx, t("식당 검색에 실패했습니다. 다시 시도해주세요.",
        "Restaurant search failed. Please try again.")));
      if (["notConfigured", "search_not_configured"].includes(e.message)) manual();
    } finally {
      setBusy(false);
    }
  }
  function manual() {
    setChosen(true);
    setValues((o) => ({ ...o, ko: o.ko || query.trim() }));
  }
  function choose(c) {
    setValues({ ko: c.ko, en: "", phone: c.phone || "", address: c.address || "" });
    setPick({ lat: c.lat, lng: c.lng });
    setChosen(true);
    setDuplicate(null);
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setDuplicate(null);
    const ko = values.ko.trim();
    if (!ko || !pick) return setError(t("식당 이름과 위치를 입력해주세요.", "Enter the restaurant name and location."));
    if (!inCampus(pick.lat, pick.lng)) return setError(t("학내 식당만 등록할 수 있습니다.", "Only campus restaurants can be added."));
    const near = db.restaurants.find((x) => !x.hidden && norm(x.ko) === norm(ko) && distance(x, pick) <= 50);
    if (near) {
      setDuplicate(near);
      return setError(t("이미 등록된 식당입니다.", "This restaurant is already registered."));
    }
    const changes = { ko, lat: pick.lat, lng: pick.lng };
    for (const k of ["en", "phone", "address"]) if (values[k].trim()) changes[k] = values[k].trim();
    const rid = crypto.randomUUID();
    setBusy(true);
    try {
      await registerAsAdmin(
        { id: crypto.randomUUID(), type: "restaurant", rid, mid: null, title: ko, changes, method: "", memo: "", photo: "" },
        Object.keys(changes), user);
      await refresh();
      toast(t("식당을 등록했습니다.", "Restaurant added."));
      go({ page: "intake-menus", rid }, true);
    } catch (e) {
      await refresh();
      setError(message(e, idx, t("식당을 저장하지 못했습니다. 다시 시도해주세요.", "Could not save the restaurant. Please try again.")));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow">
      <Back />
      <Title eyebrow={t("운영진", "REVIEW TEAM")} sub={t("이름으로 찾고 위치를 확인해 바로 등록합니다.", "Find by name, confirm the location and publish.")}>
        {t("식당 검색 등록", "Find and add a restaurant")}
      </Title>
      <form className="formCard" onSubmit={search}>
        <label className="formlabel">
          <span>{t("식당 이름", "Restaurant name")}</span>
          <div className="inline">
            <input value={query} maxLength={60} onChange={(e) => setQuery(e.target.value)}
              placeholder={t("예: 파리바게뜨", "e.g. Paris Baguette")} />
            <button className="primary" disabled={busy || !query.trim()}>
              <Search size={16} />
              {t("검색", "Search")}
            </button>
          </div>
        </label>
        <Notice text={hint} tone="hint" />
        {candidates?.length > 0 && (
          <div className="intakeList">
            {candidates.map((c, i) => (
              <button type="button" key={i} className="intakeCandidate" onClick={() => choose(c)}>
                <MapPin size={16} />
                <span>
                  <strong>{c.ko}</strong>
                  <small>{[c.category, c.address].filter(Boolean).join(" · ")}</small>
                </span>
              </button>
            ))}
            {excluded > 0 && (
              <small>{t(`학내 범위 밖 결과 ${excluded}건은 제외했습니다.`, `${excluded} off-campus results were hidden.`)}</small>
            )}
          </div>
        )}
        {candidates && !chosen && (
          <button type="button" className="textbtn" onClick={manual}>
            {t("지도에서 직접 지정", "Pick on the map instead")}
          </button>
        )}
      </form>
      {chosen && (
        <form className="formCard" onSubmit={save}>
          <label className="formlabel">
            <span>{t("식당 이름 (한글) *", "Restaurant name in Korean *")}</span>
            <input value={values.ko} maxLength={100} onChange={(e) => val("ko", e.target.value)} />
          </label>
          <label className="formlabel">
            <span>{t("영문명", "English name")}</span>
            <input value={values.en} maxLength={100} onChange={(e) => val("en", e.target.value)} />
          </label>
          <div className="formlabel">
            <span>{t("학내 위치 *", "Campus location *")}</span>
            <small>{t("지도를 눌러 위치를 조정할 수 있습니다.", "Tap the map to adjust the location.")}</small>
            <CampusMap restaurants={[]} lang={lang} onSelect={() => {}} pick={pick} onPick={setPick}
              userLocation={userLocation} onLocate={locate} naverKey={naverKey} />
            {pick && <small>{pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}</small>}
          </div>
          <label className="formlabel">
            <span>{t("위치 설명", "Location description")}</span>
            <input value={values.address} maxLength={500} onChange={(e) => val("address", e.target.value)} />
          </label>
          <label className="formlabel">
            <span>{t("전화번호", "Phone number")}</span>
            <input type="tel" value={values.phone} maxLength={100} onChange={(e) => val("phone", e.target.value)} />
          </label>
          <Notice text={error} />
          {duplicate && (
            <button type="button" className="secondary" onClick={() => go({ page: "restaurant", id: duplicate.id })}>
              {t("기존 식당 보기", "View existing restaurant")}
            </button>
          )}
          <div className="actions">
            <button className="primary" disabled={busy}>
              <Check size={16} />
              {busy ? t("저장 중…", "Saving…") : t("등록하고 메뉴 추가", "Add and continue to menus")}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

export function MenuIntake() {
  const { t, idx, lang, db, user, route, go, refresh, toast } = useApp();
  const r = db.restaurants.find((x) => x.id === route.rid && !x.hidden);
  const [files, setFiles] = useState([]),
    [rows, setRows] = useState([]),
    [marks, setMarks] = useState([]),
    [error, setError] = useState(""),
    [hint, setHint] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(null);
  if (!r) return <main className="narrow"><Back /><p>{t("해당 식당 정보를 찾을 수 없습니다.", "Restaurant not found.")}</p></main>;
  const existing = new Set(db.menus.filter((m) => !m.hidden && m.rid === r.id).map((m) => norm(m.ko)));
  const dup = (ko) => existing.has(norm(ko));
  const setRow = (i, patch) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const selected = rows.filter((x) => x.on && x.ko.trim() && !dup(x.ko));

  async function extract() {
    setBusy(true);
    setError("");
    setHint("");
    try {
      const res = await extractMenus(files);
      if (!res.menus?.length) setHint(t("메뉴를 찾지 못했습니다. 다른 사진을 올리거나 직접 입력해주세요.", "No menus found. Try another photo or add rows manually."));
      setRows((old) => [
        ...old,
        ...(res.menus || []).filter((m) => !old.some((o) => norm(o.ko) === norm(m.ko)))
          .map((m) => ({ ko: m.ko, en: m.en || "", on: !dup(m.ko) })),
      ]);
      setMarks(res.marks || []);
    } catch (e) {
      setError(message(e, idx, t("메뉴 추출에 실패했습니다. 다시 시도해주세요.", "Menu extraction failed. Please try again.")));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    const failed = [];
    let added = 0;
    for (const row of selected) {
      const changes = { ko: row.ko.trim(), ...(row.en.trim() ? { en: row.en.trim() } : {}) };
      try {
        await registerAsAdmin({
          id: crypto.randomUUID(), type: "menu", rid: r.id, mid: crypto.randomUUID(),
          title: r.ko + " · " + changes.ko, changes, method: "", memo: "", photo: "",
        }, Object.keys(changes), user);
        added++;
      } catch (e) {
        failed.push(row.ko + ": " + message(e, idx, t("저장 실패", "Save failed")));
      }
    }
    await refresh();
    pendingMarks.set(r.id, marks);
    setRows((rs) => rs.filter((x) => !(x.on && failed.every((f) => !f.startsWith(x.ko + ":")))));
    setDone({ added, failed });
    if (added) toast(t(`메뉴 ${added}개를 등록했습니다.`, `${added} menus added.`));
    setBusy(false);
  }
  return (
    <main className="narrow">
      <Back onClick={() => go({ page: "restaurant", id: r.id })} />
      <Title eyebrow={t("운영진", "REVIEW TEAM")} sub={name(r, lang)}>
        {t("메뉴 일괄 등록", "Add menus in bulk")}
      </Title>
      <section className="formCard">
        <label className="formlabel">
          <span>{t("키오스크·메뉴판 사진 (최대 5장)", "Kiosk or menu board photos (up to 5)")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple
            onChange={(e) => setFiles([...e.target.files].slice(0, 5))} />
        </label>
        <small>{t("사진에 인쇄된 메뉴명만 읽습니다. 식재료는 여기서 저장하지 않습니다.",
          "Only printed menu names are read. Ingredients are not saved here.")}</small>
        <div className="actions">
          <button className="secondary" disabled={busy || !files.length} onClick={extract}>
            <ImagePlus size={16} />
            {busy ? t("읽는 중…", "Reading…") : t("메뉴 읽기", "Read menus")}
          </button>
        </div>
        <Notice text={hint} tone="hint" />
        <Notice text={error} />
      </section>
      <section className="formCard">
        <div className="rowhead">
          <h2>{t("등록할 메뉴", "Menus to add")} <b className="count">{selected.length}</b></h2>
          <button className="textbtn" onClick={() => setRows((rs) => [...rs, { ko: "", en: "", on: true }])}>
            <Plus size={15} />
            {t("행 추가", "Add row")}
          </button>
        </div>
        <div className="intakeMenus">
          {rows.map((row, i) => (
            <div className={"intakeMenuRow" + (dup(row.ko) ? " isDup" : "")} key={i}>
              <input type="checkbox" checked={row.on && !dup(row.ko)} disabled={dup(row.ko)}
                aria-label={t("선택", "Select")} onChange={(e) => setRow(i, { on: e.target.checked })} />
              <input value={row.ko} maxLength={100} placeholder={t("메뉴명 (한글)", "Menu name (Korean)")}
                onChange={(e) => setRow(i, { ko: e.target.value })} />
              <input value={row.en} maxLength={100} placeholder={t("영문명", "English name")}
                onChange={(e) => setRow(i, { en: e.target.value })} />
              {dup(row.ko) ? <small>{t("이미 등록됨", "Already added")}</small> : (
                <button className="iconbtn" aria-label={t("행 삭제", "Remove row")}
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><X size={15} /></button>
              )}
            </div>
          ))}
          {!rows.length && <p>{t("사진을 읽거나 행을 추가하세요.", "Read a photo or add a row.")}</p>}
        </div>
        {marks.length > 0 && (
          <div className="intakeMarks">
            <strong>{t("사진에 인쇄된 원산지·알레르기 표시", "Printed origin and allergen labels")}</strong>
            {marks.map((m, i) => (
              <small key={i}>{ingredients[m.ingredient][idx]} · {m.text}{m.menus.length ? " → " + m.menus.join(", ") : ""}</small>
            ))}
            <small>{t("식재료 입력 화면에서 '포함' 제안으로 표시됩니다.", "These appear as 'Contains' suggestions in the ingredient grid.")}</small>
          </div>
        )}
        {done && (
          <Notice tone={done.failed.length ? "error" : "hint"} text={
            t(`${done.added}개 등록`, `${done.added} added`) + (done.failed.length ? " · " + done.failed.join(" / ") : "")} />
        )}
        <div className="actions">
          <button className="primary" disabled={busy || !selected.length} onClick={save}>
            <Check size={16} />
            {t(`선택한 메뉴 ${selected.length}개 등록`, `Add ${selected.length} selected`)}
          </button>
          <button className="secondary" onClick={() => go({ page: "intake-ingredients", rid: r.id })}>
            {t("식재료 입력하기", "Enter ingredients")}
          </button>
        </div>
      </section>
    </main>
  );
}

export function IngredientIntake() {
  const { t, idx, lang, db, user, route, go, refresh, toast } = useApp();
  const r = db.restaurants.find((x) => x.id === route.rid && !x.hidden);
  const menus = r ? db.menus.filter((m) => !m.hidden && m.rid === r.id).sort((a, b) => a.ko.localeCompare(b.ko, "ko")) : [];
  const marks = (r && pendingMarks.get(r.id)) || [];
  const [grid, setGrid] = useState(() => Object.fromEntries(menus.map((m) => {
    const values = Object.fromEntries(fields.map((f) => [f, m.ingredients?.[f] || "unknown"]));
    const hints = {};
    for (const mark of marks) {
      if (!mark.menus.some((n) => norm(n) === norm(m.ko))) continue;
      if (values[mark.ingredient] === "unknown") values[mark.ingredient] = "yes";
      hints[mark.ingredient] = mark.text;
    }
    return [m.id, { values, hints, method: Object.keys(hints).length ? "label" : "", memo: "" }];
  })));
  const [errors, setErrors] = useState({}), [busy, setBusy] = useState(false);
  if (!r) return <main className="narrow"><Back /><p>{t("해당 식당 정보를 찾을 수 없습니다.", "Restaurant not found.")}</p></main>;
  const shared = marks.filter((m) => !m.menus.length);
  const changed = (m) => fields.filter((f) => grid[m.id].values[f] !== (m.ingredients?.[f] || "unknown"));
  const dirty = menus.filter((m) => changed(m).length);
  const update = (id, patch) => setGrid((g) => ({ ...g, [id]: { ...g[id], ...patch } }));

  async function save() {
    const missing = Object.fromEntries(dirty.filter((m) => !grid[m.id].method)
      .map((m) => [m.id, t("확인 방법을 선택해주세요.", "Choose a verification method.")]));
    setErrors(missing);
    if (Object.keys(missing).length) return;
    setBusy(true);
    const next = {};
    let saved = 0;
    for (const m of dirty) {
      const keys = changed(m), row = grid[m.id];
      try {
        await registerAsAdmin({
          id: crypto.randomUUID(), type: "edit", rid: r.id, mid: m.id, title: r.ko + " · " + m.ko,
          changes: Object.fromEntries(keys.map((k) => [k, row.values[k]])),
          method: row.method, memo: row.memo.trim(), photo: "",
        }, keys, user);
        saved++;
      } catch (e) {
        next[m.id] = message(e, idx, t("저장하지 못했습니다. 다시 시도해주세요.", "Could not save. Please try again."));
      }
    }
    setErrors(next);
    await refresh();
    if (saved) toast(t(`메뉴 ${saved}개의 식재료를 저장했습니다.`, `Saved ingredients for ${saved} menus.`));
    if (!Object.keys(next).length) pendingMarks.delete(r.id);
    setBusy(false);
  }
  return (
    <main className="narrow wideIntake">
      <Back onClick={() => go({ page: "restaurant", id: r.id })} />
      <Title eyebrow={t("운영진", "REVIEW TEAM")} sub={name(r, lang)}>
        {t("식재료 일괄 입력", "Enter ingredients in bulk")}
      </Title>
      <section className="formCard">
        <small>{t(
          "칸을 누르면 미확인 → 포함 → 미포함 순으로 바뀝니다. 근거가 있는 값만 입력하고, 메뉴명으로 추정하지 마세요. 사진 표시에서 온 '포함'은 점선으로 표시됩니다.",
          "Tap a cell to cycle Unknown → Contains → Absent. Enter only values you can back up; never guess from the name. Dotted cells come from printed labels.")}</small>
        {shared.length > 0 && (
          <div className="intakeMarks">
            <strong>{t("매장 전체 표시 (특정 메뉴 미지정)", "Store-wide labels (no menu named)")}</strong>
            {shared.map((m, i) => <small key={i}>{ingredients[m.ingredient][idx]} · {m.text}</small>)}
          </div>
        )}
        <div className="intakeGridWrap">
          <table className="intakeGrid">
            <thead>
              <tr>
                <th>{t("메뉴", "Menu")}</th>
                {fields.map((f) => <th key={f}>{ingredients[f][idx]}</th>)}
                <th>{t("확인 방법", "Method")}</th>
                <th>{t("근거·출처", "Source")}</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((m) => {
                const row = grid[m.id], diff = changed(m);
                return (
                  <tr key={m.id} className={diff.length ? "isDirty" : ""}>
                    <th scope="row">
                      {name(m, lang)}
                      {errors[m.id] && <small className="cellError" role="alert">{errors[m.id]}</small>}
                    </th>
                    {fields.map((f) => (
                      <td key={f}>
                        <button type="button"
                          className={"cell " + row.values[f] + (row.hints[f] ? " hinted" : "") + (diff.includes(f) ? " changed" : "")}
                          title={row.hints[f] || ""}
                          aria-label={ingredients[f][idx] + ": " + states[row.values[f]][idx]}
                          onClick={() => update(m.id, { values: { ...row.values, [f]: cycle[row.values[f]] } })}>
                          {states[row.values[f]][idx]}
                        </button>
                      </td>
                    ))}
                    <td>
                      <select value={row.method} aria-label={t("확인 방법", "Method")}
                        onChange={(e) => update(m.id, { method: e.target.value })}>
                        <option value="">{t("선택", "Select")}</option>
                        {Object.entries(methods).map(([k, v]) => <option key={k} value={k}>{v[idx]}</option>)}
                      </select>
                    </td>
                    <td>
                      <input value={row.memo} maxLength={500} placeholder={t("링크·메모", "Link or note")}
                        onChange={(e) => update(m.id, { memo: e.target.value })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!menus.length && <p>{t("등록된 메뉴가 없습니다.", "No menus have been registered.")}</p>}
        </div>
        <div className="actions">
          <button className="primary" disabled={busy || !dirty.length} onClick={save}>
            <Check size={16} />
            {busy ? t("저장 중…", "Saving…") : t(`변경한 메뉴 ${dirty.length}개 저장`, `Save ${dirty.length} changed menus`)}
          </button>
        </div>
      </section>
    </main>
  );
}
