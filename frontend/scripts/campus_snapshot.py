"""Render an OSM API map extract as a georeferenced, offline SVG (no third-party packages)."""
import math
import sys
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

WEST, SOUTH, EAST, NORTH = 126.918, 37.440, 126.990, 37.480
WIDTH = 3000
LANDMARKS = {"중앙도서관", "서울대학교 미술관", "규장각한국학연구원", "자하연"}
STYLES = {
    "park": 'fill="#cfdfc1"', "pitch": 'fill="#c0d6b5"',
    "water": 'fill="#b0d8e5"', "stream": 'fill="none" stroke="#a8cfde" stroke-width="2"',
    "building": 'fill="#d7d3c8" stroke="#b4b0a6" stroke-width=".65"',
    "walk": 'fill="none" stroke="#b7a28e" stroke-width=".85" stroke-dasharray="2 1"',
    "road": 'fill="none" stroke="#fffdfa" stroke-width="2.7"',
    "main": 'fill="none" stroke="#e8ca91" stroke-width="4.5"',
}

def mercator(lat):
    return math.asinh(math.tan(math.radians(lat)))

def run(source, destination):
    root = ET.parse(source).getroot()
    bounds = root.find("bounds")
    extent = tuple(float(bounds.attrib[k]) for k in ("minlon","minlat","maxlon","maxlat"))
    if extent != (WEST, SOUTH, EAST, NORTH):
        raise ValueError("Use the bounding box documented in frontend/README.md")
    scale_y = WIDTH / math.radians(EAST - WEST)
    def project(lon, lat):
        return (round((lon - WEST) * WIDTH / (EAST - WEST)),
                round((mercator(NORTH) - mercator(lat)) * scale_y))
    height = project(WEST, SOUTH)[1]
    nodes = {n.get("id"):project(float(n.get("lon")),float(n.get("lat"))) for n in root.findall("node")}
    paths, labels = defaultdict(list), {}
    for way in root.findall("way"):
        tags = {t.get("k"):t.get("v") for t in way.findall("tag")}
        coords = [nodes.get(n.get("ref")) for n in way.findall("nd")]
        if not coords or None in coords:
            continue
        if tags.get("building") not in (None, "no") and coords[0] == coords[-1]:
            layer = "building"
        elif tags.get("highway") in {"trunk","primary","secondary","trunk_link","primary_link","secondary_link"}:
            layer = "main"
        elif tags.get("highway") in {"footway","pedestrian","steps","path","cycleway","track"}:
            layer = "walk"
        elif tags.get("highway") in {"service","residential","unclassified","living_street","tertiary","tertiary_link"}:
            layer = "road"
        elif tags.get("waterway") in {"stream","river","canal"}:
            layer = "stream"
        elif coords[0] != coords[-1]:
            continue
        elif tags.get("natural") == "water":
            layer = "water"
        elif tags.get("leisure") == "pitch":
            layer = "pitch"
        elif tags.get("natural") in {"wood","scrub","shrubbery"} or tags.get("landuse") in {"forest","grass","meadow"} or tags.get("leisure") == "park":
            layer = "park"
        else:
            continue
        points = [coords[0]]
        for point in coords[1:]:
            if point != points[-1]:
                points.append(point)
        if len(points) < 2:
            continue
        paths[layer].append("M"+" ".join(f"{x},{y}" for x,y in points)+("Z" if points[0] == points[-1] else ""))
        name = tags.get("name")
        if name in LANDMARKS:
            labels[name]=(sum(x for x,y in points)//len(points),sum(y for x,y in points)//len(points))
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {height}" preserveAspectRatio="none">',
           '<title>관악캠퍼스 · OpenStreetMap</title>',
           '<desc>© OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright</desc>',
           '<rect width="100%" height="100%" fill="#eeeee4"/>']
    for group, style in STYLES.items():
        out.append(f'<g {style}>')
        out.extend(f'<path d="{path}"/>' for path in paths[group])
        out.append("</g>")
    out.append('<g font-family="sans-serif" font-size="16" text-anchor="middle" fill="#4b5849" stroke="#fff" stroke-width="3" paint-order="stroke">')
    out.extend(f'<text x="{x}" y="{y}">{escape(name)}</text>' for name,(x,y) in sorted(labels.items()))
    Path(destination).write_text("\n".join(out+["</g></svg>"])+"\n", encoding="utf-8")
    print({group:len(paths[group]) for group in STYLES})

if __name__ == "__main__":
    run(*sys.argv[1:])
