import React, { useEffect, useId, useRef, useState } from "react";
import "./map.css";

const bounds = {
  west: 126.943,
  east: 126.9668,
  north: 37.4728,
  south: 37.4458,
};
const world = { w: 1000, h: 600 };
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
const toXY = ({ lng, lat }) => ({
  x: ((lng - bounds.west) / (bounds.east - bounds.west)) * world.w,
  y: ((bounds.north - lat) / (bounds.north - bounds.south)) * world.h,
});
const toGeo = (x, y) => ({
  lng: bounds.west + (x / world.w) * (bounds.east - bounds.west),
  lat: bounds.north - (y / world.h) * (bounds.north - bounds.south),
});
const validPoint = (row) =>
  row &&
  typeof row.lat === "number" &&
  typeof row.lng === "number" &&
  Number.isFinite(row.lat) &&
  Number.isFinite(row.lng);
const nameOf = (row, lang) => (lang === "ko" ? row.ko : row.en || row.ko);
const palette = /^#[\da-f]{3,8}$/i;
const pinColor = (color) => (palette.test(color) ? color : "#307958");

const pathways = [
  "M-180 140 C30 172 50 108 126 111 S250 176 303 180 S386 149 465 115 S622 62 705 -15",
  "M110 -20 C117 80 205 97 255 146 S360 213 413 250 S518 315 590 343 S708 355 797 403 S924 464 1090 480",
  "M-50 355 C77 322 115 281 181 254 S267 212 313 187 C357 167 395 178 453 179 S544 155 608 175 S741 255 829 273 S968 262 1050 318",
  "M211 607 C196 536 176 465 202 405 S249 322 279 270 S306 223 316 185",
  "M64 527 C156 476 201 457 271 424 S390 381 431 335 C475 288 480 242 467 187 S453 107 492 49",
  "M419 690 C431 580 439 549 469 498 S532 422 574 369 S619 304 633 242 S675 151 717 100 S751 64 804 -15",
  "M54 90 C78 50 111 6 156 -20",
  "M130 359 C213 355 251 345 307 363 S396 393 448 423 S534 461 582 474",
  "M267 592 C288 530 326 478 344 426 S375 357 398 314 S411 265 417 242",
  "M549 609 C584 515 628 478 688 459 S784 422 801 397",
  "M579 340 C542 327 514 301 494 284",
  "M228 146 C205 169 211 199 183 221 S106 251 39 272",
  "M335 207 C333 242 317 256 339 277 S379 298 408 306",
  "M648 194 C700 174 725 174 762 189 S834 214 853 246",
  "M590 155 C580 125 590 102 604 72",
  "M731 259 C712 295 718 327 749 357 S794 379 818 398",
  "M296 508 C330 511 361 525 404 540 S440 544 453 537",
  "M365 362 C341 338 311 334 275 325",
  "M471 485 C445 470 428 469 397 450",
  "M605 465 C633 502 654 523 690 550",
];
const buildings = [
  [168, 133, 57, 13, 26],
  [168, 151, 38, 11, 26],
  [128, 165, 47, 14, 25],
  [119, 184, 37, 12, 25],
  [224, 109, 38, 17, 38],
  [244, 129, 42, 12, 36],
  [272, 141, 21, 16, 37],
  [322, 139, 40, 16, -19],
  [365, 134, 52, 11, -17],
  [380, 147, 29, 10, -17],
  [310, 221, 31, 12, 28],
  [289, 243, 44, 12, 31],
  [275, 267, 25, 13, 31],
  [358, 209, 43, 15, 30],
  [343, 229, 35, 13, 28],
  [352, 248, 34, 11, 28],
  [388, 219, 21, 12, 30],
  [416, 203, 25, 16, -8],
  [429, 226, 21, 12, 5],
  [430, 263, 27, 12, 12],
  [487, 190, 50, 16, 4],
  [492, 212, 43, 14, 7],
  [499, 236, 56, 13, 5],
  [514, 252, 37, 11, 5],
  [520, 281, 39, 14, 29],
  [545, 298, 36, 15, 36],
  [552, 277, 27, 13, 33],
  [526, 140, 42, 14, -12],
  [515, 120, 45, 13, -13],
  [539, 99, 26, 13, -15],
  [548, 189, 37, 15, 7],
  [558, 215, 33, 12, 5],
  [583, 235, 30, 14, 8],
  [618, 145, 34, 14, 23],
  [638, 122, 34, 12, 24],
  [652, 107, 39, 13, 22],
  [675, 215, 51, 15, 16],
  [674, 237, 42, 12, 14],
  [694, 257, 30, 13, 15],
  [169, 280, 41, 14, -33],
  [144, 298, 28, 11, -32],
  [159, 313, 49, 12, -30],
  [184, 300, 37, 13, -26],
  [220, 283, 34, 15, 28],
  [203, 312, 36, 13, 30],
  [243, 374, 48, 12, -15],
  [223, 394, 42, 15, -18],
  [259, 391, 38, 10, -14],
  [274, 302, 43, 14, 18],
  [311, 312, 31, 13, 18],
  [313, 337, 37, 13, 11],
  [367, 318, 25, 12, 27],
  [353, 333, 20, 11, 26],
  [378, 388, 45, 14, 23],
  [401, 409, 37, 13, 24],
  [385, 424, 31, 14, 23],
  [443, 365, 51, 16, 28],
  [457, 340, 42, 12, 29],
  [468, 323, 40, 11, 30],
  [506, 346, 32, 11, 29],
  [502, 367, 40, 15, 30],
  [483, 391, 47, 13, 28],
  [550, 402, 29, 14, -35],
  [603, 381, 49, 14, -19],
  [631, 395, 40, 16, -19],
  [659, 385, 34, 13, -20],
  [644, 416, 54, 13, -21],
  [684, 406, 32, 13, -17],
  [321, 470, 38, 14, -58],
  [347, 485, 51, 14, -58],
  [371, 497, 36, 13, -56],
  [247, 469, 44, 13, -21],
  [223, 488, 43, 12, -20],
  [205, 512, 40, 15, -18],
  [466, 530, 43, 14, -55],
  [490, 543, 46, 13, -55],
  [507, 558, 40, 13, -60],
  [546, 494, 38, 13, -52],
  [562, 507, 28, 14, -51],
  [594, 527, 37, 14, 46],
];
const labels = [
  [145, 77, "서울대학교 정문", "Main Gate"],
  [737, 140, "관악사", "Gwanak Residence"],
  [400, 294, "중앙도서관", "Central Library"],
  [216, 311, "자연과학대학", "Natural Sciences"],
  [321, 496, "공과대학", "Engineering"],
  [576, 255, "인문대학", "Humanities"],
  [820, 345, "관악산", "Gwanaksan"],
  [65, 410, "관악수목원 방면", "Gwanak Forest"],
];
function Terrain({ id }) {
  return (
    <g aria-hidden="true">
      <defs>
        <pattern
          id={id + "field"}
          width="11"
          height="11"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M3 5h.6m4 3h.7"
            stroke="#a9c7a9"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </pattern>
        <pattern
          id={id + "trees"}
          width="49"
          height="46"
          patternUnits="userSpaceOnUse"
        >
          <g fill="#b0cbae" opacity=".61">
            <ellipse cx="9" cy="11" rx="3.5" ry="2.8" />
            <ellipse cx="35" cy="35" rx="2.8" ry="2.2" />
            <circle cx="40" cy="9" r="1.5" />
          </g>
        </pattern>
        <pattern
          id={id + "track"}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="4" height="8" fill="#9fc5a4" />
        </pattern>
      </defs>
      <rect x="-1300" y="-1000" width="3600" height="2600" fill="#dae7d7" />
      <rect
        x="-1300"
        y="-1000"
        width="3600"
        height="2600"
        fill={"url(#" + id + "field)"}
      />
      <path
        fill="#c3d9be"
        d="M-250-180H1050V110C921 108 895 146 834 129S750 132 716 103C649 68 571 93 506 90S424 96 371 83C303 67 291 85 261 76S234 34 175 48S123 110 55 129L-250 185Z"
      />
      <path
        fill="#c5daba"
        d="M845 177C913 169 918 116 1002 109L1193 134V740H326C423 626 477 594 551 579S668 497 708 477C807 430 789 359 792 304S803 218 845 177Z"
      />
      <path
        fill="#c3d9c0"
        d="M-140 400C-20 343 56 328 96 334S164 357 149 392S82 446 67 467S69 513 30 541L-140 559Z"
      />
      <g fill="none" stroke="#a8c2a7" opacity=".43" strokeWidth="1.1">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={i}
            transform={"translate(" + i * 13 + " " + i * 9 + ")"}
            d="M587 650C635 550 666 547 720 507S788 440 807 402S818 341 851 301S881 256 881 225S908 168 1003 148"
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            transform={"translate(" + -8 * i + " " + -8 * i + ")"}
            d="M-60 158C69 121 100 124 140 81S197 21 261 49S351 57 402 44S483 56 537 32S609 6 630 -15"
          />
        ))}
      </g>
      <path
        fill={"url(#" + id + "trees)"}
        d="M-100 -100H1050V100C903 96 881 162 813 123S729 135 701 90S554 88 495 77S355 70 283 52S201 26 138 60S87 132-100 148ZM865 209C967 167 955 133 1060 157V680H445C572 578 659 539 744 461S781 276 865 209Z"
      />
      <path
        d="M738 -60C680 42 618 52 593 92S586 135 555 157S500 175 497 221"
        fill="none"
        stroke="#afcdc7"
        strokeWidth="6"
      />
      <path
        d="M691 50C672 43 646 41 632 49S613 74 592 78S558 85 563 101S595 111 614 99S646 84 666 83S700 69 691 50Z"
        fill="#b6d6cf"
        stroke="#9bbeb6"
        strokeWidth="1.5"
      />
      <g transform="translate(282 37) rotate(20)">
        <rect width="95" height="48" rx="21" fill="#dbbd9f" />
        <rect
          x="4"
          y="4"
          width="87"
          height="40"
          rx="17"
          fill="none"
          stroke="#f0d7c0"
        />
        <rect x="8" y="8" width="79" height="32" rx="14" fill="#a8c9a8" />
        <rect
          x="14"
          y="10"
          width="67"
          height="28"
          fill={"url(#" + id + "track)"}
          stroke="#ecf1df"
        />
        <path d="M47 10v28" stroke="#ecf1df" />
        <circle cx="47" cy="24" r="6" fill="none" stroke="#ecf1df" />
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {pathways.map((d, i) => (
          <path d={d} key={i} stroke="#c4cec0" strokeWidth={i < 6 ? 13 : 7} />
        ))}
        {pathways.map((d, i) => (
          <path
            d={d}
            key={i}
            stroke={i < 2 ? "#fcf6df" : "#f8f8ee"}
            strokeWidth={i < 6 ? 10.5 : 5}
          />
        ))}
      </g>
      {buildings.map(([x, y, w, h, r], i) => (
        <g
          key={i}
          transform={"translate(" + x + " " + y + ") rotate(" + r + ")"}
          fill={["#d7d8cd", "#dedbd0", "#d2d7cc", "#d7dace"][i % 4]}
          stroke="#bdc5ba"
          strokeWidth="1.15"
          strokeLinejoin="round"
        >
          {i % 4 === 0 ? (
            <path
              d={
                "M0 0h" +
                w +
                "v" +
                h +
                "h-" +
                w * 0.34 +
                "v-" +
                h * 0.33 +
                "h-" +
                w * 0.66 +
                "Z"
              }
            />
          ) : (
            <rect width={w} height={h} rx="1.6" />
          )}
        </g>
      ))}
    </g>
  );
}

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
function Pin({ color }) {
  return (
    <span
      className="itda-pin-icon"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: pinSvg.replace("COLOR", pinColor(color)),
      }}
    />
  );
}

const naverPromises = new Map();
function loadNaver(key) {
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
              window.navermap_authFailure = previous;
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
  const viewport = useRef(null),
    gestures = useRef(null),
    native = useRef(null),
    locating = useRef(false);
  const [size, setSize] = useState({ width: 900, height: 400 });
  const [view, setView] = useState({ zoom: 1, x: 500, y: 300 });
  const [maps, setMaps] = useState(null),
    [apiError, setApiError] = useState(false),
    [offline, setOffline] = useState(false);
  const prefix = "campus" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  useEffect(() => {
    let active = true;
    setMaps(null);
    setApiError(false);
    setOffline(false);
    if (naverKey)
      loadNaver(naverKey)
        .then((result) => active && setMaps(result))
        .catch(() => active && setApiError(true));
    return () => {
      active = false;
    };
  }, [naverKey]);
  useEffect(() => {
    const node = viewport.current;
    const read = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  function centerOn(point) {
    if (native.current && maps)
      native.current.panTo(new maps.LatLng(point.lat, point.lng));
    else if (inCampus(point.lat, point.lng))
      setView({ ...toXY(point), zoom: 1.7 });
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
    setView((v) => ({
      ...v,
      zoom: Math.max(1, Math.min(5, v.zoom * (delta > 0 ? 1.35 : 1 / 1.35))),
    }));
  }
  const percent = (point) => ({
    left: 50 + ((point.x - view.x) * view.zoom) / 10 + "%",
    top: 50 + ((point.y - view.y) * view.zoom) / 6 + "%",
  });
  function pointerDown(e) {
    if (e.button !== 0 || e.target.closest("button")) return;
    gestures.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      view,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e) {
    const g = gestures.current;
    if (!g) return;
    const dx = e.clientX - g.clientX,
      dy = e.clientY - g.clientY;
    if (!g.moved && Math.hypot(dx, dy) < 4) return;
    g.moved = true;
    const rect = viewport.current.getBoundingClientRect();
    setView({
      zoom: g.view.zoom,
      x: Math.max(
        0,
        Math.min(1000, g.view.x - ((dx / rect.width) * 1000) / g.view.zoom),
      ),
      y: Math.max(
        0,
        Math.min(600, g.view.y - ((dy / rect.height) * 600) / g.view.zoom),
      ),
    });
  }
  function pointerUp(e) {
    const g = gestures.current;
    gestures.current = null;
    if (!g || g.moved || !onPick) return;
    const rect = viewport.current.getBoundingClientRect();
    onPick(
      toGeo(
        view.x +
          (((e.clientX - rect.left) / rect.width - 0.5) * 1000) / view.zoom,
        view.y +
          (((e.clientY - rect.top) / rect.height - 0.5) * 600) / view.zoom,
      ),
    );
  }
  function keyboardMap(e) {
    if (e.target !== e.currentTarget) return;
    const offsets = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const offset = offsets[e.key];
    if (offset) {
      e.preventDefault();
      const at = onPick && validPoint(pick) ? toXY(pick) : view;
      const next = {
        x: Math.max(0, Math.min(1000, at.x + (offset[0] * 9) / view.zoom)),
        y: Math.max(0, Math.min(600, at.y + (offset[1] * 9) / view.zoom)),
      };
      if (onPick) onPick(toGeo(next.x, next.y));
      else setView({ ...view, ...next });
    } else if (e.key === "Enter" && onPick) {
      e.preventDefault();
      onPick(validPoint(pick) ? pick : toGeo(view.x, view.y));
    }
  }
  const pins = restaurants.filter(validPoint).map((r) => {
    const point = toXY(r);
    return {
      r,
      point,
      x: size.width * (0.5 + ((point.x - view.x) * view.zoom) / 1000),
      y: size.height * (0.5 + ((point.y - view.y) * view.zoom) / 600),
    };
  });
  const occupied = pins.map((p) => ({
    x: p.x - 12,
    y: p.y - 30,
    w: 24,
    h: 30,
  }));
  const overlaps = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const p of pins) {
    const text = nameOf(p.r, lang) || "";
    const width =
      12 +
      Array.from(text).reduce(
        (sum, ch) => sum + (ch.charCodeAt(0) > 127 ? 12 : 7),
        0,
      );
    const choices = [
      ["bottom", p.x - width / 2, p.y + 2],
      ["right", p.x + 14, p.y - 23],
      ["left", p.x - 14 - width, p.y - 23],
      ["top", p.x - width / 2, p.y - 53],
    ];
    p.placement = "quiet";
    for (const [position, x, y] of choices) {
      const label = { x: x - 2, y: y - 1, w: width + 4, h: 20 };
      if (
        x >= 3 &&
        y >= 3 &&
        x + width <= size.width - 3 &&
        y + 20 <= size.height - 3 &&
        !occupied.some((rect) => overlaps(rect, label))
      ) {
        p.placement = position;
        occupied.push(label);
        break;
      }
    }
  }
  const schematic = !naverKey || offline;
  return (
    <section
      className="itda-map"
      aria-label={
        ko ? "서울대학교 캠퍼스 지도" : "Seoul National University campus map"
      }
      ref={viewport}
    >
      {schematic ? (
        <div
          className={"itda-map-surface" + (onPick ? " is-picker" : "")}
          tabIndex={0}
          aria-label={
            onPick
              ? ko
                ? "위치 선택. 방향키로 위치를 조정할 수 있습니다."
                : "Choose a location with the arrow keys."
              : ko
                ? "방향키로 지도 이동"
                : "Pan the map with the arrow keys"
          }
          onKeyDown={keyboardMap}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => {
            gestures.current = null;
          }}
        >
          <svg
            className="itda-map-art"
            aria-hidden="true"
            preserveAspectRatio="none"
            viewBox={[
              view.x - 500 / view.zoom,
              view.y - 300 / view.zoom,
              1000 / view.zoom,
              600 / view.zoom,
            ].join(" ")}
          >
            <Terrain id={prefix} />
          </svg>
          {labels.map(([x, y, kr, en]) => (
            <span key={kr} className="itda-map-label" style={percent({ x, y })}>
              {ko ? kr : en}
            </span>
          ))}
          {validPoint(userLocation) && (
            <span
              className="itda-gps itda-on-map"
              aria-label={ko ? "내 위치" : "Your location"}
              style={percent(toXY(userLocation))}
            />
          )}
          {pins.map(({ r, point, placement }) => (
            <button
              type="button"
              className={"itda-map-pin label-" + placement}
              key={r.id}
              style={percent(point)}
              title={nameOf(r, lang)}
              aria-label={nameOf(r, lang)}
              onClick={() =>
                onPick ? onPick({ lat: r.lat, lng: r.lng }) : onSelect?.(r.id)
              }
            >
              <Pin color={r.color} />
              <span className="itda-pin-label">{nameOf(r, lang)}</span>
            </button>
          ))}
          {validPoint(pick) && (
            <span
              className="itda-picked"
              aria-label={ko ? "선택한 위치" : "Selected location"}
              style={percent(toXY(pick))}
            >
              ＋
            </span>
          )}
        </div>
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
              <button type="button" onClick={() => setOffline(true)}>
                {ko ? "캠퍼스 약도 열기" : "Open campus guide map"}
              </button>
            </>
          ) : ko ? (
            "지도 불러오는 중…"
          ) : (
            "Loading map…"
          )}
        </div>
      )}
      {(schematic || maps) && (
        <>
          {onPick && (
            <div className="itda-map-caption">
              <Icon name="locate" />
              {ko ? "지도에서 위치 선택" : "Choose a location"}
            </div>
          )}
          {schematic && (
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
          {schematic && (
            <span className="itda-map-source">
              {ko
                ? "관악캠퍼스 약도 · 위치는 대략적입니다"
                : "Gwanak campus guide · Approximate locations"}
            </span>
          )}
        </>
      )}
    </section>
  );
}
