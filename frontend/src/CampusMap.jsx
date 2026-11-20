import React, { useEffect, useRef, useState } from "react";
import OpenCampusMap from "./OpenCampusMap";
import "./map.css";

const bounds = {
  west: 126.943,
  east: 126.9668,
  north: 37.4728,
  south: 37.4458,
};
const center = {
  lat: (bounds.north + bounds.south) / 2,
  lng: (bounds.west + bounds.east) / 2,
};
const northGate = [
  [126.9495, 37.4692],
  [126.9516, 37.4683],
  [126.9545, 37.4694],
  [126.9574, 37.4691],
  [126.9614, 37.4665],
  [126.9622, 37.4631],
  [126.9599, 37.4589],
  [126.9603, 37.4558],
  [126.9573, 37.4528],
  [126.9553, 37.4488],
  [126.9517, 37.446],
  [126.9489, 37.4472],
  [126.9481, 37.451],
  [126.946, 37.4535],
  [126.9466, 37.4571],
  [126.9451, 37.4612],
  [126.9465, 37.4647],
  [126.9477, 37.467],
];
export function inCampus(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  let inside = false;
  for (let i = 0, j = northGate.length - 1; i < northGate.length; j = i++) {
    const [xi, yi] = northGate[i],
      [xj, yj] = northGate[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
const validPoint = (row) =>
  row &&
  typeof row.lat === "number" &&
  typeof row.lng === "number" &&
  Number.isFinite(row.lat) &&
  Number.isFinite(row.lng);
const nameOf = (row, lang) => (lang === "ko" ? row.ko : row.en || row.ko);
const palette = /^#[\da-f]{3,8}$/i;
const pinColor = (color) => (palette.test(color) ? color : "#307958");

function Icon({ name }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "add" ? (
        <path d="M12 5v14M5 12h14" />
      ) : name === "minus" ? (
        <path d="M5 12h14" />
      ) : (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.4" />
          <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
        </>
      )}
    </svg>
  );
}
const pinSvg =
  '<svg viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"><path d="M14 32c-2.4-3.1-11-12.2-11-19a11 11 0 0 1 22 0c0 6.8-8.6 15.9-11 19Z" fill="COLOR" stroke="white" stroke-width="2"/><path d="M9 7v5a2 2 0 0 0 4 0V7m-2 0v13m6-13c-1.5 2-2 4.3-2 7h3m0-7v13" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.4"/></svg>';
const pinHtml = (color) => pinSvg.replace("COLOR", pinColor(color));
const naverPromises = new Map();
let naverAuthRejected = false;
function onNaverAuthFailure() {
  naverAuthRejected = true;
  window.dispatchEvent(new Event("itda:naver-auth-failed"));
}
function loadNaver(key) {
  if (naverAuthRejected)
    return Promise.reject(new Error("Map authentication failed"));
  if (window.naver?.maps?.Map) return Promise.resolve(window.naver.maps);
  if (naverPromises.has(key)) return naverPromises.get(key);
  const load = async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          let finished = false;
          const cleanup = (error) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            script.onerror = script.onload = null;
            if (window.navermap_authFailure === fail)
              window.navermap_authFailure = error
                ? previous
                : onNaverAuthFailure;
            if (error) {
              script.remove();
              reject(error);
            } else resolve();
          };
          const previous = window.navermap_authFailure;
          const fail = () => cleanup(new Error("Map authentication failed"));
          const timer = setTimeout(fail, 6000);
          window.navermap_authFailure = fail;
          script.src =
            "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=" +
            encodeURIComponent(key);
          script.async = true;
          script.onerror = fail;
          script.onload = () => (window.naver?.maps?.Map ? cleanup() : fail());
          document.head.append(script);
        });
        return window.naver.maps;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
  };
  const promise = load().catch((err) => {
    naverPromises.delete(key);
    throw err;
  });
  naverPromises.set(key, promise);
  return promise;
}
function NaverLayer({
  maps,
  restaurants,
  lang,
  onSelect,
  userLocation,
  onPick,
  pick,
  mapRef,
}) {
  const container = useRef(null);
  const handlers = useRef(null);
  handlers.current = { onSelect, onPick };
  useEffect(() => {
    const map = new maps.Map(container.current, {
      center: new maps.LatLng(center.lat, center.lng),
      zoom: 14,
      minZoom: 10,
      maxZoom: 19,
      mapDataControl: true,
    });
    mapRef.current = map;
    const click = maps.Event.addListener(map, "click", (ev) =>
      handlers.current.onPick?.({ lat: ev.coord.lat(), lng: ev.coord.lng() }),
    );
    return () => {
      maps.Event.removeListener(click);
      map.destroy?.();
      mapRef.current = null;
    };
  }, [maps, mapRef]);
  useEffect(() => {
    const markers = [],
      listeners = [];
    for (const r of restaurants.filter(validPoint)) {
      const name = nameOf(r, lang);
      const marker = new maps.Marker({
        position: new maps.LatLng(r.lat, r.lng),
        map: mapRef.current,
        title: name,
        icon: {
          content:
            '<div class="itda-native-pin">' +
            pinSvg.replace("COLOR", pinColor(r.color)) +
            "</div>",
          anchor: new maps.Point(14, 32),
        },
      });
      listeners.push(
        maps.Event.addListener(marker, "click", () =>
          handlers.current.onPick
            ? handlers.current.onPick({ lat: r.lat, lng: r.lng })
            : handlers.current.onSelect?.(r.id),
        ),
      );
      markers.push(marker);
    }
    if (validPoint(userLocation))
      markers.push(
        new maps.Marker({
          position: new maps.LatLng(userLocation.lat, userLocation.lng),
          map: mapRef.current,
          icon: {
            content: '<span class="itda-gps"></span>',
            anchor: new maps.Point(8, 8),
          },
        }),
      );
    if (validPoint(pick))
      markers.push(
        new maps.Marker({
          position: new maps.LatLng(pick.lat, pick.lng),
          map: mapRef.current,
        }),
      );
    return () => {
      listeners.forEach((listener) => maps.Event.removeListener(listener));
      markers.forEach((marker) => marker.setMap(null));
    };
  }, [maps, mapRef, restaurants, lang, userLocation, pick]);
  return <div ref={container} className="itda-native-map" />;
}

export default function CampusMap({
  restaurants = [],
  lang = "ko",
  onSelect,
  userLocation,
  onLocate,
  pick,
  onPick,
  naverKey,
}) {
  const ko = lang === "ko";
  const sdkKey = location.protocol === "file:" ? "" : naverKey;
  const native = useRef(null),
    openMap = useRef(null),
    locating = useRef(false);
  const [maps, setMaps] = useState(null),
    [apiError, setApiError] = useState(false),
    [fallback, setFallback] = useState(false);
  const [source, setSource] = useState("snapshot");
  useEffect(() => {
    let active = true;
    setMaps(null);
    setApiError(false);
    setFallback(false);
    const rejectMap = () => {
      setMaps(null);
      setApiError(true);
    };
    window.addEventListener("itda:naver-auth-failed", rejectMap);
    if (sdkKey)
      loadNaver(sdkKey)
        .then((result) => {
          if (active) {
            if (naverAuthRejected) rejectMap();
            else setMaps(result);
          }
        })
        .catch(() => active && setApiError(true));
    return () => {
      active = false;
      window.removeEventListener("itda:naver-auth-failed", rejectMap);
    };
  }, [sdkKey]);
  function centerOn(point) {
    if (native.current && maps)
      native.current.panTo(new maps.LatLng(point.lat, point.lng));
    else if (openMap.current && inCampus(point.lat, point.lng))
      openMap.current.setView(point, 16);
  }
  useEffect(() => {
    if (locating.current && validPoint(userLocation)) {
      locating.current = false;
      centerOn(userLocation);
    }
  }, [userLocation, maps]);
  function locate() {
    locating.current = !validPoint(userLocation);
    if (validPoint(userLocation)) centerOn(userLocation);
    onLocate();
  }
  function zoom(delta) {
    if (native.current) {
      native.current.setZoom(native.current.getZoom() + delta);
      return;
    }
    if (openMap.current)
      openMap.current.setZoom(openMap.current.getZoom() + delta);
  }
  const open = !sdkKey || fallback;
  return (
    <section
      className="itda-map"
      aria-label={
        ko ? "서울대학교 캠퍼스 지도" : "Seoul National University campus map"
      }
    >
      {open ? (
        <OpenCampusMap
          {...{
            restaurants,
            lang,
            onSelect,
            onPick,
            pick,
            userLocation,
            pinHtml,
          }}
          mapRef={openMap}
          onSource={setSource}
        />
      ) : maps ? (
        <NaverLayer
          {...{ maps, restaurants, lang, onSelect, userLocation, onPick, pick }}
          mapRef={native}
        />
      ) : (
        <div className="itda-map-status" role="status">
          {apiError ? (
            <>
              {ko
                ? "지도 정보를 불러오는 데 실패했습니다."
                : "Could not load the map."}
              <button type="button" onClick={() => setFallback(true)}>
                {ko ? "OpenStreetMap 열기" : "Open OpenStreetMap"}
              </button>
            </>
          ) : ko ? (
            "지도 불러오는 중…"
          ) : (
            "Loading map…"
          )}
        </div>
      )}
      {(open || maps) && (
        <>
          {onPick && (
            <div className="itda-map-caption">
              <Icon name="locate" />
              {ko ? "지도에서 위치 선택" : "Choose a location"}
            </div>
          )}
          {open && (
            <span className="itda-north" aria-hidden="true">
              <b>N</b>
              <i />
            </span>
          )}
          <div className="itda-map-tools">
            <div className="itda-map-zoom">
              <button
                type="button"
                aria-label={ko ? "지도 확대" : "Zoom in"}
                onClick={() => zoom(1)}
              >
                <Icon name="add" />
              </button>
              <button
                type="button"
                aria-label={ko ? "지도 축소" : "Zoom out"}
                onClick={() => zoom(-1)}
              >
                <Icon name="minus" />
              </button>
            </div>
            {onLocate && (
              <button
                type="button"
                aria-label={ko ? "내 위치 확인" : "Locate me"}
                onClick={locate}
              >
                <Icon name="locate" />
              </button>
            )}
          </div>
          {open && (
            <span className="itda-map-source">
              {source === "online"
                ? ko
                  ? "온라인 지도"
                  : "Online map"
                : ko
                  ? "저장된 캠퍼스 지도"
                  : "Saved campus map"}{" "}
              ·{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noreferrer"
              >
                © OpenStreetMap contributors
              </a>
            </span>
          )}
        </>
      )}
    </section>
  );
}
