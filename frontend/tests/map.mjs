import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM, VirtualConsole } from "jsdom";

const html = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
for (const url of ["file:///itda.html", "http://localhost/"]) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    url,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      Object.assign(w, {
        structuredClone,
        ResizeObserver: class {
          observe() {}
          disconnect() {}
        },
        scrollTo: () => {},
        TextEncoder,
        TextDecoder,
        Response,
        Request,
        Headers,
        fetch,
        WebSocket,
      });
      Object.defineProperty(w.HTMLElement.prototype, "clientWidth", {
        get() {
          return 600;
        },
      });
      Object.defineProperty(w.HTMLElement.prototype, "clientHeight", {
        get() {
          return 360;
        },
      });
    },
  });
  try {
    const doc = dom.window.document;
    for (let i = 0; i < 100 && !doc.querySelector(".leaflet-image-layer"); i++)
      await new Promise((r) => setTimeout(r, 30));
    const map = doc.querySelector(".itda-map");
    assert.match(
      map.querySelector(".leaflet-image-layer").src,
      /^data:image\/svg\+xml/,
    );
    assert.equal(map.querySelectorAll(".itda-map-pin").length, 6);
    const tile = map.querySelector(".leaflet-tile");
    if (url.startsWith("file:")) assert.equal(tile, null);
    else {
      assert.match(
        tile.src,
        /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/,
      );
      tile.dispatchEvent(new dom.window.Event("error"));
      assert.equal(map.querySelectorAll(".leaflet-tile").length, 0);
      assert.ok(map.querySelector(".leaflet-image-layer"));
    }
    assert.equal(
      map.querySelector(".itda-map-source a").href,
      "https://www.openstreetmap.org/copyright",
    );
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
}
console.log(
  "PASS: geographic snapshot and pins for local files; HTTPS tiles, attribution and tile failure fallback on HTTP.",
);
