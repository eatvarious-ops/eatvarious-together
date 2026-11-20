import React, { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  MapPin,
  Phone,
  Flag,
  Utensils,
  ClipboardCheck,
  Pencil,
  Check,
  LogOut,
  ShieldCheck,
  ImagePlus,
  X,
} from "lucide-react";
import {
  fields,
  ingredients,
  tagList,
  matches,
  name,
  methods,
  types,
  states,
  statuses,
  labels,
  currentField,
  distance,
  norm,
  higherPriority,
} from "./domain";
import MeatInput, { meatKinds } from "./MeatInput";
import CampusMap, { inCampus } from "./CampusMap";
import { Dialog, Chip, Photo, useApp, message } from "./common";
import { submitReport, review, uploadPhoto, naverKey, remote } from "./store";
export function Back({ onClick }) {
  const { back, t } = useApp();
  return (
    <button className="back" onClick={onClick || back}>
      <ArrowLeft size={16} />
      {t("뒤로", "Back")}
    </button>
  );
}
export function Title({ eyebrow, children, sub }) {
  return (
    <div className="sectionTitle">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{children}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
function Sample() {
  const { t } = useApp();
  return (
    !remote && (
      <small className="sample">
        {t("체험용 가상 데이터", "Fictional preview data")}
      </small>
    )
  );
}
export function Detail() {
  const { route, db, idx, t, lang, go, auth, selected, user } = useApp(),
    isMenu = route.page === "menu";
  const m = isMenu
      ? db.menus.find((x) => x.id === route.id && !x.hidden)
      : null,
    r = db.restaurants.find(
      (x) => x.id === (isMenu ? m?.rid : route.id) && !x.hidden,
    );
  if (!r || (isMenu && !m))
    return (
      <main className="narrow">
        <Back />
        <p>{t("해당 정보를 찾을 수 없습니다.", "This item is unavailable.")}</p>
      </main>
    );
  const menus = db.menus
    .filter((x) => !x.hidden && x.rid === r.id)
    .sort(
      (a, b) =>
        Number(matches(b, selected)) - Number(matches(a, selected)) ||
        tagList(b).length - tagList(a).length ||
        a.ko.localeCompare(b.ko, "ko"),
    );
  const form = (type) =>
    auth({ page: "form", type, rid: r.id, ...(m ? { mid: m.id } : {}) });
  return (
    <main className="narrow">
      <Back />
      <article className="detailCard">
        <div className="detailTop">
          <div>
            <span className="eyebrow">
              {isMenu ? name(r, lang) : t("캠퍼스 식당", "CAMPUS RESTAURANT")}
            </span>
            <h1>{name(m || r, lang)}</h1>
            <p>
              {idx
                ? (m || r).ko
                : (m || r).en || t("정보 없음", "No information")}
            </p>
            <Sample />
          </div>
          {(m || r).photo && (
            <Photo path={(m || r).photo} className="detailThumb" />
          )}
        </div>
        {isMenu ? (
          <>
            <div className="detailSection">
              <div className="chips">
                {tagList(m).map((tag) => (
                  <Chip key={tag.id} tag={tag} />
                ))}
              </div>
              <h2>{t("식재료 확인 기록", "Ingredient records")}</h2>
              <div className="ingredientRows">
                {fields.map((k) => {
                  const ev = m.evidence?.[k],
                    s = m.ingredients?.[k] || "unknown";
                  return (
                    <div className="ingredientRow" key={k}>
                      <strong>{ingredients[k][idx]}</strong>
                      <span className={"status " + s}>{states[s][idx]}</span>
                      <small>
                        {ev?.method
                          ? methods[ev.method]?.[idx]
                          : t("확인 기록 없음", "No verification record")}
                        {ev?.date && " · " + ev.date.slice(0, 10)}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="actions">
              <button className="primary" onClick={() => form("edit")}>
                <Pencil size={16} />
                {t("정보 수정하기", "Suggest an update")}
              </button>
              <button className="textbtn" onClick={() => form("end")}>
                <Flag size={15} />
                {t("판매 종료 신고", "Report discontinued menu")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="contact">
              <span>
                <MapPin size={16} />
                {(idx ? r.addressEn || r.address : r.address) ||
                  t("위치 정보 미제공", "Location unavailable")}
              </span>
              <span>
                <Phone size={16} />
                {r.phone || t("정보 없음", "No information")}
              </span>
            </div>
            <div className="detailSection">
              <div className="rowhead">
                <h2>
                  {t("메뉴 목록", "Menus")}{" "}
                  <b className="count">{menus.length}</b>
                </h2>
                <div className="inline">
                  {user?.admin && (
                    <>
                      <button
                        className="secondary"
                        onClick={() => go({ page: "intake-menus", rid: r.id })}
                      >
                        <ImagePlus size={15} />
                        {t("메뉴 일괄 등록", "Add menus in bulk")}
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          go({ page: "intake-ingredients", rid: r.id })
                        }
                      >
                        <Pencil size={15} />
                        {t("식재료 일괄 입력", "Ingredients in bulk")}
                      </button>
                    </>
                  )}
                  <button className="secondary" onClick={() => form("menu")}>
                    <Plus size={15} />
                    {t("메뉴 추가하기", "Add a menu")}
                  </button>
                </div>
              </div>
              {menus.map((item) => (
                <button
                  className="menuRow"
                  key={item.id}
                  onClick={() => go({ page: "menu", id: item.id })}
                >
                  {item.photo && (
                    <Photo path={item.photo} className="menuPhoto" />
                  )}
                  <div>
                    <strong>{name(item, lang)}</strong>
                    <small>{idx ? item.ko : item.en || ""}</small>
                    <div className="minichips">
                      {tagList(item).map((tag) => (
                        <Chip key={tag.id} tag={tag} small />
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
              {!menus.length && (
                <p>
                  {t(
                    "등록된 메뉴가 없습니다.",
                    "No menus have been registered.",
                  )}
                </p>
              )}
            </div>
            <div className="actions">
              <button className="textbtn" onClick={() => form("close")}>
                <Flag size={15} />
                {t("폐점 신고", "Report restaurant closure")}
              </button>
            </div>
          </>
        )}
      </article>
    </main>
  );
}
function Label({ text, children }) {
  return (
    <label className="formlabel">
      <span>{text}</span>
      {children}
    </label>
  );
}
export function ReportForm() {
  const {
      idx,
      t,
      lang,
      db,
      user,
      route,
      go,
      refresh,
      toast,
      userLocation,
      locate,
    } = useApp(),
    { type, rid, mid } = route;
  const r = db.restaurants.find((x) => x.id === rid && !x.hidden),
    m = db.menus.find((x) => x.id === mid && !x.hidden),
    edit = type === "edit",
    newMenu = type === "menu",
    newR = type === "restaurant",
    withFields = edit || newMenu;
  const [values, setValues] = useState(() => ({
      ko: "",
      en: edit ? m?.en || "" : "",
      phone: "",
      address: "",
      ...Object.fromEntries(
        fields.map((f) => [
          f,
          edit ? m?.ingredients?.[f] || "unknown" : "unknown",
        ]),
      ),
    })),
    [pick, setPick] = useState(null),
    [method, setMethod] = useState(""),
    [memo, setMemo] = useState(""),
    [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [duplicate, setDuplicate] = useState(null),
    [busy, setBusy] = useState(false);
  if (!types[type] || (!newR && !r) || ((edit || type === "end") && !m))
    return (
      <main className="narrow">
        <Back />
        <p>
          {t(
            "해당 정보를 찾을 수 없습니다.",
            "The requested item is unavailable.",
          )}
        </p>
      </main>
    );
  const val = (k, v) => setValues((old) => ({ ...old, [k]: v }));
  const changes = {};
  if (newMenu || newR) changes.ko = values.ko.trim();
  if (edit ? values.en.trim() !== (m?.en || "") : values.en.trim())
    changes.en = values.en.trim();
  if (newR) {
    if (values.phone.trim()) changes.phone = values.phone.trim();
    if (values.address.trim()) changes.address = values.address.trim();
    if (pick) Object.assign(changes, pick);
  }
  if (withFields)
    for (const k of fields) {
      const old = edit ? m?.ingredients?.[k] || "unknown" : "unknown";
      if (values[k] !== old) changes[k] = values[k];
    }
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setDuplicate(null);
    setBusy(true);
    try {
      if (newR && (!changes.ko || !pick)) throw new Error("requiredLocation");
      if (newR && !inCampus(pick.lat, pick.lng)) throw new Error("outside");
      if (newMenu && !changes.ko) throw new Error("requiredName");
      if (
        (edit ||
          (newMenu && values.unidentifiedMeat) ||
          fields.some((k) => k in changes)) &&
        !method
      )
        throw new Error("method");
      const dupe = newMenu
        ? db.menus.find(
            (x) =>
              !x.hidden && x.rid === rid && norm(x.ko) === norm(changes.ko),
          )
        : newR
          ? db.restaurants.find(
              (x) =>
                !x.hidden &&
                norm(x.ko) === norm(changes.ko) &&
                distance(x, pick) <= 50,
            )
          : null;
      if (dupe) {
        setDuplicate(dupe);
        throw new Error(newMenu ? "duplicateMenu" : "duplicateRestaurant");
      }
      let image = "";
      if (file) {
        try {
          image = await uploadPhoto(file, user);
        } catch (e) {
          throw new Error(
            e.message === "photoType" ? "photoType" : "photoFail",
          );
        }
      }
      if (image && (newMenu || newR)) changes.photo = image;
      await submitReport(
        {
          id: crypto.randomUUID(),
          type,
          rid: newR ? crypto.randomUUID() : rid,
          mid: newMenu ? crypto.randomUUID() : mid || null,
          title: [r?.ko, newR || newMenu ? changes.ko : m?.ko]
            .filter(Boolean)
            .join(" · "),
          changes,
          method,
          memo:
            newMenu && values.unidentifiedMeat
              ? [
                  t("고기 포함 · 종류 모름", "Meat present · type unknown"),
                  memo.trim(),
                ]
                  .filter(Boolean)
                  .join("\n")
              : memo.trim(),
          photo: image,
        },
        user,
      );
      await refresh();
      go({ page: "my" }, true);
      toast(
        t(
          "제보가 접수되었습니다. 운영진 확인 후 반영됩니다.",
          "Report received. A reviewer will check it before publication.",
        ),
      );
    } catch (e) {
      setError(
        message(
          e,
          idx,
          t(
            "제보를 제출하지 못했습니다. 다시 시도해주세요.",
            "Could not submit the report. Please try again.",
          ),
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow">
      <Back />
      <Title
        eyebrow={t("참여하기", "CONTRIBUTE")}
        sub={[name(r, lang), name(m, lang)].filter(Boolean).join(" · ")}
      >
        {types[type][idx]}
      </Title>
      <form className="formCard" onSubmit={submit}>
        {(newMenu || newR) && (
          <Label
            text={
              newR
                ? t("식당 이름 (한글) *", "Restaurant name in Korean *")
                : t("메뉴 이름 (한글) *", "Menu name in Korean *")
            }
          >
            <input
              value={values.ko}
              maxLength={100}
              onChange={(e) => val("ko", e.target.value)}
            />
          </Label>
        )}
        {(withFields || newR) && (
          <Label text={t("영문명", "English name")}>
            <input
              value={values.en}
              maxLength={100}
              onChange={(e) => val("en", e.target.value)}
            />
          </Label>
        )}
        {newR && (
          <>
            <div className="formlabel">
              <span>{t("학내 위치 *", "Campus location *")}</span>
              <small>
                {t(
                  "지도에서 식당 위치를 선택하세요.",
                  "Select the restaurant location on the map.",
                )}
              </small>
              <CampusMap
                restaurants={[]}
                lang={lang}
                onSelect={() => {}}
                pick={pick}
                onPick={setPick}
                userLocation={userLocation}
                onLocate={locate}
                naverKey={naverKey}
              />
              {pick && (
                <small>
                  {pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}
                </small>
              )}
            </div>
            <Label text={t("위치 설명", "Location description")}>
              <input
                value={values.address}
                onChange={(e) => val("address", e.target.value)}
              />
            </Label>
            <Label text={t("전화번호", "Phone number")}>
              <input
                type="tel"
                value={values.phone}
                onChange={(e) => val("phone", e.target.value)}
              />
            </Label>
          </>
        )}
        {withFields && (
          <>
            <fieldset className="formIngredients">
              <legend>{t("식재료 포함 여부", "Ingredient status")}</legend>
              {newMenu && (
                <MeatInput
                  values={values}
                  onChange={(patch) =>
                    setValues((old) => ({ ...old, ...patch }))
                  }
                />
              )}
              {(newMenu
                ? fields.filter((k) => !meatKinds.includes(k))
                : fields
              ).map((k) => (
                <Label key={k} text={ingredients[k][idx]}>
                  <select
                    value={values[k]}
                    onChange={(e) => val(k, e.target.value)}
                  >
                    {Object.entries(states).map(([key, v]) => (
                      <option key={key} value={key}>
                        {v[idx]}
                      </option>
                    ))}
                  </select>
                </Label>
              ))}
            </fieldset>
            <Label text={t("확인 방법", "Verification method")}>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="">{t("선택해주세요", "Select a method")}</option>
                {Object.entries(methods).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v[idx]}
                  </option>
                ))}
              </select>
            </Label>
          </>
        )}
        <Label text={t("메모", "Notes")}>
          <textarea
            rows={3}
            maxLength={1500}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Label>
        <Label text={t("근거 사진 (선택)", "Evidence photo (optional)")}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            key={file?.name || "pick"}
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {file && <small>{file.name}</small>}
        </Label>
        {file && (
          <button
            type="button"
            className="textbtn"
            onClick={() => setFile(null)}
          >
            {t("사진 지우기", "Remove photo")}
          </button>
        )}
        {error && (
          <p className="errorbanner" role="alert">
            {error}
          </p>
        )}
        {duplicate && (
          <button
            type="button"
            className="secondary"
            onClick={() =>
              go(
                newMenu
                  ? { page: "form", type: "edit", rid, mid: duplicate.id }
                  : { page: "restaurant", id: duplicate.id },
              )
            }
          >
            {newMenu
              ? t("기존 메뉴 수정하기", "Edit existing menu")
              : t("기존 식당 보기", "View existing restaurant")}
          </button>
        )}
        <div className="actions">
          <button
            className="primary"
            disabled={busy || (edit && !Object.keys(changes).length)}
          >
            {busy
              ? t("제출 중…", "Submitting…")
              : t("제보 제출하기", "Submit report")}
          </button>
          <small>
            {t("승인 후 공개 정보에 반영됩니다.", "Published after review.")}
          </small>
        </div>
      </form>
    </main>
  );
}
export function Reports() {
  const { db, user, idx, t, logout, go, route, auth } = useApp(),
    admin = route.page === "admin";
  const [status, setStatus] = useState(admin ? "pending" : ""),
    [type, setType] = useState(""),
    [item, setItem] = useState(null);
  if (!user || (admin && !user.admin))
    return (
      <main className="narrow">
        <Back />
        <button className="primary" onClick={() => auth({ page: "my" })}>
          {t("로그인", "Sign in")}
        </button>
      </main>
    );
  const mine = db.reports.filter((r) => r.uid === user.id),
    approved = mine.filter((r) => r.status === "approved"),
    rows = (admin ? db.reports : mine)
      .filter(
        (r) => (!status || r.status === status) && (!type || r.type === type),
      )
      .sort(
        (a, b) => (admin ? 1 : -1) * a.created_at.localeCompare(b.created_at),
      ),
    report = item && db.reports.find((x) => x.id === item);
  return (
    <main className="narrow">
      <Back />
      <Title
        eyebrow={admin ? t("운영진", "REVIEW TEAM") : user.name}
        sub={
          admin
            ? t(
                "제보와 공개 정보를 비교하고 처리하세요.",
                "Compare submissions with public records.",
              )
            : t(
                "제보의 검토 상태와 반영 결과를 확인하세요.",
                "Track the status of your contributions.",
              )
        }
      >
        {admin ? t("제보 관리", "Review reports") : t("내 제보", "My reports")}
      </Title>
      {!admin && (
        <div className="stats">
          <div>
            <strong>{mine.length}</strong>
            {t("제출한 제보", "Submitted")}
          </div>
          <div>
            <strong>{approved.length}</strong>
            {t("반영된 제보", "Applied")}
          </div>
          <div>
            <strong>
              {
                new Set(
                  approved
                    .filter((r) => ["menu", "edit"].includes(r.type))
                    .map((r) => r.mid),
                ).size
              }
            </strong>
            {t("기여한 메뉴", "Menus updated")}
          </div>
        </div>
      )}
      {user.admin && (
        <button
          className="secondary"
          onClick={() => go({ page: admin ? "my" : "admin" })}
        >
          <ShieldCheck size={16} />
          {admin
            ? t("내 제보 보기", "My reports")
            : t("운영진 검토함", "Open review queue")}
        </button>
      )}
      <section className="formCard reports">
        <div className="rowhead">
          <h2>{t("제보 목록", "Reports")}</h2>
          <div className="inline">
            <select
              aria-label={t("유형", "Type")}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">{t("모든 유형", "All types")}</option>
              {Object.entries(types).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[idx]}
                </option>
              ))}
            </select>
            <select
              aria-label={t("상태", "Status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{t("모든 상태", "All statuses")}</option>
              {Object.entries(statuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v[idx]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {rows.map((r) => (
          <button
            key={r.id}
            className="reportRow"
            onClick={() => setItem(r.id)}
          >
            <div>
              <span className="category">{types[r.type]?.[idx]}</span>
              <h3>{r.title}</h3>
              <small>
                {new Date(r.created_at).toLocaleString(idx ? "en-GB" : "ko-KR")}
                {admin && " · " + r.author}
              </small>
            </div>
            <span className={"status " + r.status}>
              {statuses[r.status]?.[idx]}
            </span>
            <ChevronRight size={16} />
          </button>
        ))}
        {!rows.length && (
          <div className="empty">
            <ClipboardCheck />
            <p>
              {admin
                ? t("검토할 제보가 없습니다.", "No reports to review.")
                : mine.length
                  ? t("조건에 맞는 제보가 없습니다.", "No matching reports.")
                  : t(
                      "아직 제출한 제보가 없습니다.",
                      "You haven’t submitted any reports yet.",
                    )}
            </p>
          </div>
        )}
      </section>
      <button className="textbtn" onClick={logout}>
        <LogOut size={16} />
        {t("로그아웃", "Sign out")}
      </button>
      {report && (
        <ReviewCard
          key={report.id}
          report={report}
          admin={admin}
          close={() => setItem(null)}
        />
      )}
    </main>
  );
}
function ReviewCard({ report: r, admin, close }) {
  const { db, user, t, idx, go, refresh, toast } = useApp(),
    [keys, setKeys] = useState(Object.keys(r.changes)),
    [reason, setReason] = useState(""),
    [other, setOther] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const target = r.mid
      ? db.menus.find((x) => x.id === r.mid)
      : db.restaurants.find((x) => x.id === r.rid),
    required =
      r.type === "restaurant"
        ? ["ko", "lat", "lng"]
        : r.type === "menu"
          ? ["ko"]
          : [];
  const pending = ["pending", "failed"].includes(r.status),
    reviewable = admin && pending,
    others = db.reports.filter(
      (other) =>
        r.mid &&
        other.id !== r.id &&
        other.mid === r.mid &&
        other.status === "pending",
    );
  const reasons = [
    ["근거 부족", "Insufficient evidence"],
    ["중복 제보", "Duplicate report"],
    ["기존 정보와 동일", "Already up to date"],
    ["부적절한 내용", "Inappropriate content"],
    ["기타", "Other"],
  ];
  const fmt = (k, v) =>
    fields.includes(k) ? states[v || "unknown"]?.[idx] : String(v ?? "") || "—";
  async function decide(approve) {
    if (busy) return;
    setError("");
    const why =
      reason === "4"
        ? other.trim()
        : reason === ""
          ? ""
          : reasons[Number(reason)][idx];
    if (!approve && !why) {
      setError(t("반려 사유를 선택해주세요.", "Choose a rejection reason."));
      return;
    }
    setBusy(true);
    try {
      await review(r.id, approve, keys, why, user);
      await refresh();
      close();
      toast(
        approve
          ? t(
              "승인한 내용을 반영했습니다.",
              "Approved changes are now visible.",
            )
          : t("반려 처리했습니다.", "Report rejected."),
      );
    } catch (e) {
      await refresh();
      setError(
        message(
          e,
          idx,
          t(
            "처리에 실패했습니다. 다시 시도해주세요.",
            "Review failed. Please retry.",
          ),
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog onClose={close} title={t("제보 상세", "Report details")} wide>
      <div className="dialogBody">
        <span className={"status " + r.status}>
          {statuses[r.status]?.[idx]}
        </span>
        <h2>{r.title}</h2>
        <p>
          {types[r.type]?.[idx]} · {r.author} ·{" "}
          {new Date(r.created_at).toLocaleDateString(idx ? "en-GB" : "ko-KR")}
        </p>
        {Object.keys(r.changes).length > 0 && (
          <table className="compare">
            <thead>
              <tr>
                <th>{t("항목", "Field")}</th>
                <th>{t("현재 공개 정보", "Public value")}</th>
                <th>{t("제보 내용", "Submitted")}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(r.changes).map(([k, v]) => (
                <tr key={k}>
                  <td>
                    <label>
                      {reviewable && (
                        <input
                          type="checkbox"
                          checked={keys.includes(k)}
                          disabled={required.includes(k)}
                          onChange={() =>
                            setKeys(
                              keys.includes(k)
                                ? keys.filter((x) => x !== k)
                                : [...keys, k],
                            )
                          }
                        />
                      )}{" "}
                      {labels[k]?.[idx] || k}
                    </label>
                  </td>
                  <td>
                    {k === "photo" ? (
                      target?.photo ? (
                        <Photo path={target.photo} className="menuPhoto" />
                      ) : (
                        "—"
                      )
                    ) : target ? (
                      fmt(k, currentField(target, k))
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={v !== currentField(target, k) ? "changed" : ""}
                  >
                    {k === "photo" ? (
                      <Photo path={v} className="menuPhoto" />
                    ) : (
                      fmt(k, v)
                    )}
                    {r.approved_keys?.includes(k) && " ✓"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {r.method && (
          <p>
            {t("확인 방법", "Verification")} · {methods[r.method]?.[idx]}
          </p>
        )}
        {r.memo && <p>{r.memo}</p>}
        {r.photo && (
          <Photo
            path={r.photo}
            alt={t("근거 사진", "Evidence photo")}
            className="evidencePhoto"
          />
        )}
        {others.length > 0 && admin && (
          <div className="noticebox">
            <strong>
              {t("같은 메뉴의 대기 제보", "Pending reports for this menu")}
            </strong>
            {others.map((o) => (
              <p key={o.id}>
                {o.title} · {methods[o.method]?.[idx] || "—"} ·{" "}
                {new Date(o.created_at).toLocaleString()}
                <br />
                {Object.entries(o.changes)
                  .filter(([k]) => fields.includes(k))
                  .map(([k, v]) => ingredients[k][idx] + " " + fmt(k, v))
                  .join(" · ")}
              </p>
            ))}
          </div>
        )}
        {r.reviewer && (
          <p>
            {t("처리자", "Reviewed by")} · {r.reviewer} ·{" "}
            {new Date(r.reviewed_at).toLocaleString()}
          </p>
        )}
        {r.reason && <div className="noticebox">{r.reason}</div>}
        {reviewable && (
          <>
            <Label text={t("반려 사유", "Rejection reason")}>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">{t("사유 선택", "Select reason")}</option>
                {reasons.map((v, i) => (
                  <option key={i} value={i}>
                    {v[idx]}
                  </option>
                ))}
              </select>
            </Label>
            {reason === "4" && (
              <Label text={t("기타 사유", "Other reason")}>
                <input
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                />
              </Label>
            )}
            <div className="actions">
              <button
                className="primary"
                disabled={
                  busy || (!keys.length && !["close", "end"].includes(r.type))
                }
                onClick={() => decide(true)}
              >
                <Check size={16} />
                {r.status === "failed"
                  ? t("다시 반영", "Retry approval")
                  : t("선택 항목 승인", "Approve selected")}
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => decide(false)}
              >
                {t("반려", "Reject")}
              </button>
            </div>
          </>
        )}
        {r.status === "approved" &&
          target &&
          !target.hidden &&
          !["close", "end"].includes(r.type) && (
            <button
              className="primary"
              onClick={() => {
                close();
                go({ page: r.mid ? "menu" : "restaurant", id: r.mid || r.rid });
              }}
            >
              {t("반영된 정보 보기", "View published record")}
            </button>
          )}
        {error && (
          <p className="errorbanner" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
