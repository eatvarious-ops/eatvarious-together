import { preferences } from "./storage";
import { createClient } from "@supabase/supabase-js";
import { restaurants, menus } from "./seed";
import { applyReport, exception, norm, distance } from "./domain";
const config = window.ITDA_CONFIG || {};
export const naverKey = config.naverKey || "";
export const remote =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;
const key = "itda.preview.catalog.v1";
export function fromSession(s) {
  const u = s?.user;
  return u
    ? {
        id: u.id,
        name:
          u.user_metadata?.username ||
          u.user_metadata?.full_name ||
          u.email?.split("@")[0],
        email: u.email,
        admin: u.app_metadata?.role === "admin",
      }
    : null;
}
export async function registerStudent(username, password) {
  if (!remote) throw new Error("network");
  const { error } = await remote.functions.invoke("itda-student-signup", {
    body: { username, password },
  });
  if (error) {
    const data = await error.context?.json?.().catch(() => null);
    throw new Error(data?.code || "network");
  }
}
export async function signIn(username, password) {
  if (!remote) throw new Error("network");
  const { data, error } = await remote.auth.signInWithPassword({
    email: username + "@accounts.itda.invalid",
    password,
  });
  if (error) {
    if (error.status === 429) throw new Error("rate_limit");
    throw new Error(
      error.code === "invalid_credentials" || error.status === 400
        ? "credentials"
        : "network",
    );
  }
  return fromSession(data.session);
}
export async function signOut() {
  const { error } = await remote.auth.signOut({ scope: "local" });
  if (error) throw error;
}
function initial() {
  return {
    restaurants: structuredClone(restaurants),
    menus: structuredClone(menus),
    reports: [],
  };
}
function localDb() {
  const raw = preferences.getItem(key);
  return raw ? JSON.parse(raw) : initial();
}
async function writeLocal(fn) {
  const update = () => {
    const db = localDb();
    const result = fn(db);
    preferences.setItem(key, JSON.stringify(db));
    return result;
  };
  return navigator.locks ? navigator.locks.request(key, update) : update();
}
function checked(res) {
  if (!res.error) return res.data;
  const codes = {
    DUPLICATE_MENU: "duplicateMenu",
    DUPLICATE_RESTAURANT: "duplicateRestaurant",
    OUTSIDE_CAMPUS: "outside",
    ALREADY_REVIEWED: "already",
    METHOD_REQUIRED: "method",
    MENU_UNAVAILABLE: "missing",
    RESTAURANT_UNAVAILABLE: "missing",
  };
  if (codes[res.error.message]) throw new Error(codes[res.error.message]);
  if (
    res.error.code === "23505" &&
    res.error.message.includes("reports_one_closure_per_user")
  )
    throw new Error("duplicateReport");
  throw res.error;
}
// Keyset pagination also works when the project limits the size of each response.
async function readTable(table, columns, visibleOnly) {
  const rows = [];
  let cursor;
  for (;;) {
    let query = remote.from(table).select(columns).order("id").limit(500);
    if (visibleOnly) query = query.eq("hidden", false);
    if (cursor) query = query.gt("id", cursor);
    const page = checked(await query);
    if (!page.length) return rows;
    rows.push(...page);
    cursor = page[page.length - 1].id;
  }
}
export async function readDb() {
  if (!remote) return localDb();
  const [rs, ms, reports] = await Promise.all([
    readTable("restaurants", "id,data", true),
    readTable("menus", "id,data", true),
    readTable("reports", "*", false),
  ]);
  return {
    restaurants: rs.map((r) => ({ ...r.data, id: r.id })),
    menus: ms.map((r) => ({ ...r.data, id: r.id })),
    reports,
  };
}
export async function uploadPhoto(file, user) {
  if (!file) return "";
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 4 * 1024 * 1024
  )
    exception("photoType");
  if (remote) {
    const path =
      user.id +
      "/" +
      crypto.randomUUID() +
      "." +
      { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
        file.type
      ];
    checked(await remote.storage.from("evidence").upload(path, file));
    return path;
  }
  const bmp = await createImageBitmap(file),
    ratio = Math.min(1, 900 / Math.max(bmp.width, bmp.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * ratio));
  canvas.height = Math.max(1, Math.round(bmp.height * ratio));
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.toDataURL("image/jpeg", 0.7);
}
export async function photoUrl(path) {
  if (!path) return "";
  if (!remote || /^(data:|https?:|\.\/)/.test(path)) return path;
  return checked(
    await remote.storage.from("evidence").createSignedUrl(path, 1800),
  ).signedUrl;
}
export async function submitReport(report, user) {
  if (!user) exception("login");
  if (remote) {
    checked(await remote.from("reports").insert(report));
    return;
  }
  await writeLocal((db) => {
    if (
      ["close", "end"].includes(report.type) &&
      db.reports.some(
        (r) =>
          r.type === report.type &&
          r.rid === report.rid &&
          r.mid === report.mid &&
          r.uid === user.id,
      )
    )
      exception("duplicateReport");
    if (
      report.type === "menu" &&
      db.menus.some(
        (m) =>
          !m.hidden &&
          m.rid === report.rid &&
          norm(m.ko) === norm(report.changes.ko),
      )
    )
      exception("duplicateMenu");
    if (
      report.type === "restaurant" &&
      db.restaurants.some(
        (r) =>
          !r.hidden &&
          norm(r.ko) === norm(report.changes.ko) &&
          distance(r, report.changes) <= 50,
      )
    )
      exception("duplicateRestaurant");
    db.reports.push({
      ...report,
      uid: user.id,
      author: user.name,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  });
}
export async function review(id, approve, keys, reason, user) {
  if (!user?.admin) exception("unauthorized");
  if (remote) {
    const status = checked(
      await remote.rpc("review_report", {
        p_id: id,
        p_approve: approve,
        p_keys: keys,
        p_reason: reason,
      }),
    );
    if (status === "failed") exception("applyFailed");
    return;
  }
  const result = await writeLocal((db) => {
    const r = db.reports.find((r) => r.id === id);
    if (!r || !["pending", "failed"].includes(r.status)) exception("already");
    if (!approve && !reason.trim()) exception("reason");
    if (approve) {
      const updated = structuredClone(db);
      try {
        applyReport(updated, r, keys);
      } catch (e) {
        r.status = "failed";
        r.reason = e.message;
        return e.message;
      }
      db.restaurants = updated.restaurants;
      db.menus = updated.menus;
    }
    Object.assign(r, {
      status: approve ? "approved" : "rejected",
      reviewer: user.name,
      reviewed_at: new Date().toISOString(),
      approved_keys: approve ? keys : [],
      reason: approve ? "" : reason,
    });
  });
  if (result) exception(result);
}
// Reviewer intake (INP-10~12). The functions only suggest; registration goes
// through the same validated report and review_report approval as any report.
async function invokeAdmin(fn, body) {
  if (!remote) exception("notConfigured");
  const { data, error } = await remote.functions.invoke(fn, { body });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.code || "network");
  }
  return data;
}
export function searchPlaces(query) {
  return invokeAdmin("itda-place-search", { query });
}
// Large phone photos are scaled down so each upload stays well under the limit.
async function toImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    exception("invalid_images");
  const bmp = await createImageBitmap(file),
    ratio = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * ratio));
  canvas.height = Math.max(1, Math.round(bmp.height * ratio));
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return {
    mediaType: "image/jpeg",
    data: canvas.toDataURL("image/jpeg", 0.85).split(",")[1],
  };
}
export async function extractMenus(files) {
  if (!files.length || files.length > 5) exception("invalid_images");
  if (!remote) exception("notConfigured");
  const images = await Promise.all(files.map(toImage));
  return invokeAdmin("itda-menu-extract", { images });
}
export async function registerAsAdmin(report, keys, user) {
  if (!user?.admin) exception("unauthorized");
  await submitReport(report, user);
  await review(report.id, true, keys, "", user);
}
