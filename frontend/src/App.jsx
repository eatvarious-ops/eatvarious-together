import { preferences } from "./storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MapPin,
  Search,
  Plus,
  LocateFixed,
  Map as MapIcon,
  Languages,
  ClipboardList,
  Compass,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  List,
  PanelsTopLeft,
  LogIn,
  UserRound,
  Check,
  Navigation,
  Utensils,
  Download,
  BookOpen,
  X,
} from "lucide-react";
import CampusMap from "./CampusMap";
import { explore, tags, name, tagList } from "./domain";
import { remote, fromSession, signOut, readDb, naverKey } from "./store";
import { Context, useApp, Chip, Photo } from "./common";
import { Detail, ReportForm, Reports } from "./screens";
import "./style.css";
const rootRoute = { page: "home" };
import AccountScreen from "./AccountScreen";
import { RestaurantIntake, MenuIntake, IngredientIntake } from "./AdminIntake";
const intakePages = ["intake-restaurant", "intake-menus", "intake-ingredients"];
function routeFromHash() {
  try {
    return Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  } catch {
    return rootRoute;
  }
}
function Brand() {
  return (
    <span className="brand">
      <span className="brandIcon">
        <Utensils size={22} strokeWidth={2.5} />
      </span>
      잇다<span className="latin">itda</span>
    </span>
  );
}
function App() {
  const [lang, setLang] = useState(
      () =>
        preferences.getItem("itda.lang") ||
        (navigator.language.startsWith("ko") ? "ko" : "en"),
    ),
    idx = lang === "ko" ? 0 : 1,
    t = (ko, en) => (idx ? en : ko);
  const [route, setRoute] = useState(routeFromHash),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(!remote),
    [db, setDb] = useState(null),
    [error, setError] = useState(false),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState([]),
    [userLocation, setLocation] = useState(null);
  const seq = useRef(0),
    timer = useRef(null);
  const go = useCallback((r, replace = false) => {
    const hash = new URLSearchParams(r).toString();
    try {
      history[replace ? "replaceState" : "pushState"](
        { itda: true },
        "",
        "#" + (r.page === "home" ? "" : hash),
      );
    } catch {}
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);
  const back = () => {
    if (history.state?.itda && location.hash) history.back();
    else go(rootRoute, true);
  };
  const refresh = useCallback(async () => {
    const n = ++seq.current;
    try {
      const data = await readDb();
      if (n === seq.current) {
        setDb(data);
        setError(false);
      }
    } catch {
      if (n === seq.current) setError(true);
    }
  }, []);
  const toast = (s) => {
    clearTimeout(timer.current);
    setNotice(s);
    timer.current = setTimeout(() => setNotice(""), 4500);
  };
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t("잇다 · 캠퍼스 식당 지도", "Itda · Campus dining map");
    preferences.setItem("itda.lang", lang);
  }, [lang]);
  useEffect(() => {
    const update = () => setRoute(routeFromHash());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    if (!remote) {
      return;
    }
    const { data } = remote.auth.onAuthStateChange((_, s) => {
      setUser(fromSession(s));
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!ready) return;
    refresh();
    const sync = (e) => {
      refresh();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [user?.id, ready, refresh]);
  useEffect(() => {
    if (ready && (route.page === "admin" || intakePages.includes(route.page)) && !user?.admin)
      go(rootRoute, true);
  }, [route.page, user?.admin, ready]);
  const auth = (target) => {
    if (user) {
      if (target) go(target);
      return;
    }
    if (!["login", "signup"].includes(route.page))
      go({ page: "login", next: JSON.stringify(target || route || rootRoute) });
  };
  function finishLogin(account) {
    let next = rootRoute;
    try {
      const requested = JSON.parse(route.next || "{}");
      if (
        ["home", "my", "restaurant", "menu", "form"].includes(requested?.page)
      )
        next = requested;
    } catch {}
    setUser(account);
    go(next, true);
  }
  async function logout() {
    try {
      await signOut();
      setUser(null);
      go(rootRoute);
    } catch {
      toast(
        t(
          "로그아웃에 실패했습니다. 다시 시도해 주세요.",
          "Sign-out failed. Please try again.",
        ),
      );
    }
  }
  const locate = () => {
    if (!navigator.geolocation) {
      toast(
        t(
          "현재 위치를 확인할 수 없어 인문대학 1동을 기준으로 표시합니다.",
          "Using Humanities Building 1 as the distance reference.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        toast(
          t(
            "현재 위치를 반영했습니다.",
            "Distances updated using your location.",
          ),
        );
      },
      () => {
        setLocation(null);
        toast(
          t(
            "위치 확인이 어려워 인문대학 1동을 기준으로 표시합니다.",
            "Location unavailable. Using Humanities Building 1.",
          ),
        );
      },
      { timeout: 8000 },
    );
  };
  useEffect(() => {
    let active = true;
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (active && permission.state === "granted")
          navigator.geolocation?.getCurrentPosition(
            (p) => {
              if (active)
                setLocation({
                  lat: p.coords.latitude,
                  lng: p.coords.longitude,
                });
            },
            () => {},
            { timeout: 8000 },
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !remote) return;
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [ready, refresh]);
  const v = {
    idx,
    t,
    lang,
    go,
    back,
    user,
    db,
    refresh,
    auth,
    logout,
    toast,
    selected,
    setSelected,
    userLocation,
    locate,
    route,
  };
  const page = route.page || "home",
    inAccount = ["my", "admin"].includes(page);
  return (
    <Context.Provider value={v}>
      <header>
        <div className="headerinner">
          <button
            className="brandBtn"
            onClick={() => go(rootRoute)}
            aria-label={t("잇다 홈", "Itda home")}
          >
            <Brand />
          </button>
          <span className="headerLine" />
          <nav>
            <button
              className={!inAccount ? "navactive" : ""}
              onClick={() => go(rootRoute)}
            >
              <Compass />
              {t("식당 찾기", "Explore")}
            </button>
            <button
              className={inAccount ? "navactive" : ""}
              onClick={() => auth({ page: "my" })}
            >
              <ClipboardList />
              {t("내 제보", "My reports")}
            </button>
          </nav>
          <div className="headright">
            <button
              className="lang"
              onClick={() => setLang(idx ? "ko" : "en")}
              aria-label={t("Switch to English", "한국어로 전환")}
            >
              <Languages size={17} />
              {idx ? "한국어" : "EN"}
            </button>
            <button
              className="headLogin"
              onClick={() => (user ? go({ page: "my" }) : auth(null))}
            >
              <UserRound size={16} />
              {user ? t("내 계정", "Account") : t("로그인", "Sign in")}
            </button>
          </div>
        </div>
      </header>
      {error && (
        <div className="errorbanner">
          {t("목록을 불러오는 데 실패했습니다.", "Could not load the list.")}{" "}
          <button onClick={refresh}>{t("다시 시도", "Retry")}</button>
        </div>
      )}
      {["login", "signup"].includes(page) ? (
        <AccountScreen
          key={page}
          signup={page === "signup"}
          onSwitch={(signup) =>
            go({ ...route, page: signup ? "signup" : "login" }, true)
          }
          onSuccess={finishLogin}
        />
      ) : !db && !error ? (
        <main className="main">{t("불러오는 중…", "Loading…")}</main>
      ) : (
        db && (
          <>
            <div hidden={page !== "home"}>
              <Explorer />
            </div>
            {["restaurant", "menu"].includes(page) && (
              <Detail key={page + route.id} />
            )}
            {page === "form" &&
              (user ? (
                <ReportForm key={JSON.stringify(route)} />
              ) : (
                ready && (
                  <main className="main">
                    <button className="primary" onClick={() => auth(route)}>
                      {t("로그인하고 제보하기", "Sign in to contribute")}
                    </button>
                  </main>
                )
              ))}
            {inAccount && <Reports key={page} />}
            {user?.admin && page === "intake-restaurant" && <RestaurantIntake />}
            {user?.admin && page === "intake-menus" && <MenuIntake key={route.rid} />}
            {user?.admin && page === "intake-ingredients" && <IngredientIntake key={route.rid} />}
          </>
        )
      )}
      <footer>
        <span>잇다 · {t("서울대학교 관악캠퍼스", "SNU Gwanak Campus")}</span>
        <div>
          {!remote && (
            <span>
              {t("로컬 미리보기 · 예시 데이터", "Local preview · Sample data")}
            </span>
          )}
          {window.ITDA_DOWNLOADS ? (
            <>
              <button
                className="downloadBtn"
                onClick={() => window.ITDA_DOWNLOADS("html")}
              >
                <Download size={15} />
                {t("실행 파일", "Download app")}
              </button>
              <button
                className="downloadBtn"
                onClick={() => window.ITDA_DOWNLOADS("zip")}
              >
                <Download size={15} />
                {t("소스 ZIP", "Source ZIP")}
              </button>
            </>
          ) : (
            window.ITDA_HAS_ZIP && (
              <a href="./itda-source.zip" download>
                <Download size={14} />
                {t("소스 코드", "Source code")}
              </a>
            )
          )}
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            onClick={() => setNotice("")}
            aria-label={t("닫기", "Dismiss")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
function Explorer() {
  const {
    idx,
    t,
    lang,
    db,
    go,
    auth,
    user,
    selected,
    setSelected,
    userLocation,
    locate,
    toast,
  } = useApp();
  const [query, setQuery] = useState(""),
    [mode, setMode] = useState("restaurant"),
    [sorting, setSort] = useState(""),
    [view, setView] = useState("split");
  const sort =
      sorting || (query.trim() || selected.length ? "match" : "distance"),
    rows = explore(db, { query, mode, selected, sort, location: userLocation });
  const open = (id) => go({ page: "restaurant", id });
  function reset() {
    setQuery("");
    setSelected([]);
    setSort("");
  }
  const showEmpty = rows.length === 0;
  const lastCount = useRef(rows.length);
  useEffect(() => {
    if (rows.length === 0 && lastCount.current > 0)
      toast(
        t(
          "조건에 맞는 식당이 없습니다.",
          "No restaurants match these conditions.",
        ),
      );
    lastCount.current = rows.length;
  }, [rows.length]);
  return (
    <main className="main">
      <section className="intro">
        <div>
          <div className="eyebrow">
            <span className="campusDot" />
            {t("서울대학교 관악캠퍼스", "SEOUL NATIONAL UNIVERSITY")}
          </div>
          <h1>
            {t("캠퍼스 식당 찾기", "Campus food finder")}
            <span className="titleDot">.</span>
          </h1>
          <p>
            {t(
              "피하고 싶은 식재료를 고르고, 내 식단에 맞는 한 끼를 찾아보세요.",
              "Choose ingredients to avoid and find a meal that fits your diet.",
            )}
          </p>
        </div>
        <button
          className="secondary add"
          onClick={() =>
            user?.admin
              ? go({ page: "intake-restaurant" })
              : auth({ page: "form", type: "restaurant" })
          }
        >
          <Plus size={17} />
          {user?.admin
            ? t("식당 검색 등록", "Find and add a restaurant")
            : t("식당 추가하기", "Add a restaurant")}
        </button>
      </section>
      <section className="tools">
        <div className="searchrow">
          <div className="searchbox">
            <Search size={20} />
            <select
              aria-label={t("검색 대상", "Search mode")}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="restaurant">{t("식당", "Restaurant")}</option>
              <option value="menu">{t("메뉴", "Menu")}</option>
            </select>
            <span className="vline" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSort("");
              }}
              placeholder={
                mode === "menu"
                  ? t("메뉴 이름을 입력하세요", "Search by menu name")
                  : t("식당 이름을 입력하세요", "Search by restaurant name")
              }
              aria-label={t("검색어", "Search term")}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label={t("검색 지우기", "Clear search")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="viewToggle">
            <button
              className={view === "split" ? "active" : ""}
              onClick={() => setView("split")}
              aria-pressed={view === "split"}
            >
              <PanelsTopLeft />
              {t("지도 + 목록", "Map + list")}
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              <List />
              {t("목록", "List")}
            </button>
          </div>
        </div>
        <div className="filters">
          <strong>
            <SlidersHorizontal size={15} />
            {t("식이 필터", "Dietary filters")}
          </strong>
          <div className="chips">
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                tag={tag}
                selected={selected.includes(tag.id)}
                onClick={() => {
                  setSort("");
                  setSelected((s) =>
                    s.includes(tag.id)
                      ? s.filter((x) => x !== tag.id)
                      : [...s, tag.id],
                  );
                }}
              />
            ))}
          </div>
          {(selected.length > 0 || query) && (
            <button className="reset" onClick={reset}>
              <RotateCcw size={14} />
              {t("초기화", "Reset")}
            </button>
          )}
        </div>
      </section>
      <div className={"exploreLayout " + (view === "list" ? "listonly" : "")}>
        {view === "split" && (
          <section className="mapCard">
            <div className="cardHead">
              <h2>
                <MapIcon size={19} />
                {t("캠퍼스 지도", "Campus map")}
              </h2>
              <span className="subtle">
                <MapPin size={14} />
                {t("관악캠퍼스", "Gwanak Campus")}
              </span>
            </div>
            <div className="mapFrame">
              <CampusMap
                restaurants={rows}
                lang={lang}
                onSelect={open}
                userLocation={userLocation}
                onLocate={locate}
                naverKey={naverKey}
              />
            </div>
            <div className="mapFoot">
              <span className="legendPin" />
              {t(
                "핀 색상은 식당의 대표 식이 태그를 나타냅니다.",
                "Pin colors indicate each restaurant’s most common dietary tag.",
              )}
            </div>
          </section>
        )}
        <section className="listCard">
          <div className="cardHead">
            <h2>
              {t("식당 목록", "Restaurants")}{" "}
              <b className="count">{rows.length}</b>
            </h2>
            <select
              aria-label={t("목록 정렬", "Sort results")}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="distance">{t("거리순", "Nearest")}</option>
              <option value="match">{t("일치도순", "Best match")}</option>
            </select>
          </div>
          <div className="resultRows">
            {rows.map((r) => (
              <button className="result" key={r.id} onClick={() => open(r.id)}>
                <Photo path={r.photo} className="thumb" />
                <div className="resultinfo">
                  <span className="category">
                    {(idx ? r.categoryEn : r.category) ||
                      t("학내 식당", "Campus dining")}
                  </span>
                  <h3>{name(r, lang)}</h3>
                  <span className="locationline">
                    <MapPin size={12} />
                    {Number.isFinite(r.distance)
                      ? r.distance >= 1000
                        ? (r.distance / 1000).toFixed(1) + " km"
                        : Math.round(r.distance) + " m"
                      : t("위치 정보 미제공", "Location unavailable")}{" "}
                    <i>·</i> {t("메뉴", "Menus")} {r.ms.length}
                  </span>
                  <div className="minichips">
                    {(selected.length
                      ? tags.filter((t) => selected.includes(t.id))
                      : tags.filter((t) => r.tagIds.includes(t.id))
                    )
                      .slice(0, 2)
                      .map((tag) => (
                        <Chip key={tag.id} tag={tag} small />
                      ))}
                  </div>
                </div>
                <ChevronRight className="rowArrow" size={17} />
              </button>
            ))}
            {showEmpty && (
              <div className="empty">
                <Search />
                <p>
                  {query.trim() || query.length
                    ? t("일치하는 결과가 없습니다.", "No matching results.")
                    : t(
                        "조건을 만족하는 결과가 없습니다.",
                        "No results match your filters.",
                      )}
                </p>
                <button className="secondary" onClick={reset}>
                  {t("검색 및 필터 초기화", "Clear search and filters")}
                </button>
              </div>
            )}
          </div>
          <div className="listFoot">
            <Navigation size={13} />
            {userLocation
              ? t("현재 위치 기준 거리", "Distances from your location")
              : t(
                  "인문대학 1동 기준 거리",
                  "Distances from Humanities Building 1",
                )}
          </div>
        </section>
      </div>
      {!remote && (
        <div className="previewNote">
          <BookOpen size={16} />
          {t(
            "체험용 가상 식당과 메뉴입니다. 실제 식사 결정에는 사용하지 마세요.",
            "Fictional restaurants and menus for testing. Do not use these records to make dining decisions.",
          )}
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("itda-campus-app")).render(<App />);
