import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import campusSnapshot from "../assets/gwanak-osm.svg";

const extractBounds = [
  [37.44, 126.918],
  [37.48, 126.99],
];
const campusBounds = [
  [37.446, 126.945],
  [37.4694, 126.9622],
];
const valid = (p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng);

// Keep Leaflet in charge of projection for the map, every marker, and location picks.
export default function OpenCampusMap({
  restaurants,
  lang,
  onSelect,
  onPick,
  pick,
  userLocation,
  mapRef,
  pinHtml,
  onSource,
}) {
  const node = useRef(null);
  const handlers = useRef({});
  handlers.current = { onSelect, onPick, pick, onSource };
  useEffect(() => {
    const container = node.current;
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 13,
      maxZoom: 19,
      zoomSnap: 0.25,
      zoomDelta: 1,
      keyboard: !handlers.current.onPick,
      maxBounds: extractBounds,
      maxBoundsViscosity: 1,
    });
    mapRef.current = map;
    map.setView([37.458, 126.954], 15);
    map.createPane("snapshot").style.zIndex = "190";
    L.imageOverlay(campusSnapshot, extractBounds, {
      pane: "snapshot",
      interactive: false,
      alt: "",
    }).addTo(map);
    let initialFit = false;
    const resize = () => {
      map.invalidateSize({ pan: false });
      if (!initialFit && container.clientWidth && container.clientHeight) {
        map.fitBounds(campusBounds, { padding: [12, 12], animate: false });
        initialFit = true;
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    let onlineLayer;
    if (/^https?:$/.test(window.location.protocol)) {
      const layer = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          minZoom: 13,
          maxZoom: 19,
          updateWhenIdle: true,
          keepBuffer: 0,
          referrerPolicy: "strict-origin-when-cross-origin",
        },
      );
      onlineLayer = layer;
      layer.on("tileload", () => {
        if (map.hasLayer(layer)) handlers.current.onSource("online");
      });
      layer.once("tileerror", () => {
        if (map.hasLayer(layer)) map.removeLayer(layer);
        handlers.current.onSource("snapshot");
      });
      layer.addTo(map);
    }
    map.on("click", ({ latlng }) =>
      handlers.current.onPick?.({ lat: latlng.lat, lng: latlng.lng }),
    );
    const keyboardPick = (e) => {
      const callback = handlers.current.onPick;
      if (!callback || e.target !== container) return;
      const offsets = {
        ArrowLeft: [-10, 0],
        ArrowRight: [10, 0],
        ArrowUp: [0, -10],
        ArrowDown: [0, 10],
        Enter: [0, 0],
      };
      const step = offsets[e.key];
      if (!step) return;
      e.preventDefault();
      const point = map.latLngToContainerPoint(
        valid(handlers.current.pick) ? handlers.current.pick : map.getCenter(),
      );
      const next = map.containerPointToLatLng(point.add(step));
      callback({ lat: next.lat, lng: next.lng });
    };
    container.addEventListener("keydown", keyboardPick);
    return () => {
      observer.disconnect();
      container.removeEventListener("keydown", keyboardPick);
      onlineLayer?.off();
      map.remove();
      mapRef.current = null;
    };
  }, [mapRef]);
  useEffect(() => {
    const map = mapRef.current;
    const group = L.layerGroup().addTo(map);
    for (const r of restaurants.filter(valid)) {
      const name = lang === "ko" ? r.ko : r.en || r.ko;
      const marker = L.marker([r.lat, r.lng], {
        title: name,
        alt: name,
        icon: L.divIcon({
          html: pinHtml(r.color),
          className: "itda-map-pin",
          iconSize: [27, 33],
          iconAnchor: [13.5, 33],
        }),
      }).addTo(group);
      marker.getElement()?.setAttribute("aria-label", name);
      const label = document.createElement("span");
      label.textContent = name;
      marker.bindTooltip(label, { direction: "top", offset: [0, -28] });
      marker.on("click", () => {
        if (handlers.current.onPick)
          handlers.current.onPick({ lat: r.lat, lng: r.lng });
        else handlers.current.onSelect?.(r.id);
      });
    }
    const dot = (point, cls, label) => {
      if (valid(point))
        L.marker([point.lat, point.lng], {
          interactive: false,
          keyboard: false,
          title: label,
          icon: L.divIcon({
            className: cls,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(group);
    };
    dot(userLocation, "itda-gps", lang === "ko" ? "내 위치" : "Your location");
    dot(
      pick,
      "itda-picked",
      lang === "ko" ? "선택한 위치" : "Selected location",
    );
    return () => group.remove();
  }, [restaurants, lang, pick, userLocation, mapRef, pinHtml]);
  return (
    <div
      ref={node}
      className="itda-osm"
      tabIndex={0}
      aria-label={
        onPick
          ? lang === "ko"
            ? "지도에서 위치 선택. 방향키 또는 Enter를 사용하세요."
            : "Choose a location using arrow keys or Enter."
          : lang === "ko"
            ? "관악캠퍼스 실제 지도"
            : "Gwanak campus map"
      }
    />
  );
}
