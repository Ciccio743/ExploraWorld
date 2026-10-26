#!/bin/sh
# Regénère data/ à partir de Natural Earth (domaine public).
#   sh tools/build-data.sh <dossier-sources> [dossier-geoboundaries]
# Le dossier doit contenir, téléchargés depuis github.com/nvkelso/natural-earth-vector (geojson/) :
#   ne_10m_admin_1_states_provinces.geojson  et  ne_50m_admin_0_countries.geojson
# Le second dossier contient <CODE>.geojson pour chaque pays de tools/adm2-countries.txt, téléchargé depuis
#   media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/gbOpen/<CODE>/ADM2/geoBoundaries-<CODE>-ADM2_simplified.geojson
# Nécessite node et mapshaper (npm i -g mapshaper).
set -e
SRC=$1
GB=$2
OUT=$(dirname "$0")/../data
TMP=$(mktemp -d)

# noms français et continents des pays
node -e '
const a = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const m = {};
for (const f of a.features) m[f.properties.ADM0_A3] = { n: f.properties.NAME_FR || f.properties.NAME, c: f.properties.CONTINENT };
require("fs").writeFileSync(process.argv[2], JSON.stringify(Object.entries(m).map(([g, v]) => ({ g, ...v }))));
' "$SRC/ne_50m_admin_0_countries.geojson" "$TMP/names.json"

# régions : petits territoires rattachés, découpages trop fins regroupés (voir tools/prep-regions.js)
node "$(dirname "$0")/prep-regions.js" "$SRC/ne_10m_admin_1_states_provinces.geojson" "$TMP/regions-src.json" "$OUT/merged.json"
mapshaper "$TMP/regions-src.json" -dissolve id copy-fields=n,t,g -o "$TMP/regions.json" format=geojson

# pays aux régions trop grandes : subdivisions geoBoundaries découpées dans le contour Natural Earth
if [ -n "$GB" ]; then
  mkdir -p "$TMP/adm2"
  grep -v '^#' "$(dirname "$0")/adm2-countries.txt" | while read code type gbcode; do
    [ -n "$code" ] || continue
    d="$TMP/adm2/$code"; mkdir -p "$d"
    mapshaper "$TMP/regions.json" -filter "g === '$code'" -dissolve g -o "$d/outline.json" format=geojson 2>/dev/null
    mapshaper "$GB/${gbcode:-$code}.geojson" -clip "$d/outline.json" -filter-fields shapeName -o "$d/clipped.json" format=geojson precision=0.00001 2>/dev/null
    mapshaper "$d/outline.json" -erase "$d/clipped.json" -explode -o "$d/slivers.json" format=geojson precision=0.00001 2>/dev/null || true
    node "$(dirname "$0")/adm2-assign.js" "$code" "$type" "$d/clipped.json" "$d/slivers.json" "$d/out.json"
  done
  node -e '
    const fs = require("fs"), [regions, dir, out] = process.argv.slice(1);
    const fc = JSON.parse(fs.readFileSync(regions, "utf8"));
    const done = fs.readdirSync(dir).filter(c => fs.existsSync(dir + "/" + c + "/out.json"));
    fc.features = fc.features.filter(f => !done.includes(f.properties.g));
    for (const c of done) fc.features.push(...JSON.parse(fs.readFileSync(dir + "/" + c + "/out.json", "utf8")).features);
    fs.writeFileSync(out, JSON.stringify(fc));
  ' "$TMP/regions.json" "$TMP/adm2" "$TMP/regions-adm2.json"
  mapshaper "$TMP/regions-adm2.json" -dissolve id copy-fields=n,t,g -o "$TMP/regions.json" format=geojson force
fi

# 1) carte du monde légère : régions + pays fusionnés depuis les mêmes contours (frontières identiques)
mapshaper "$TMP/regions.json" -simplify ${WORLD_SIMPLIFY:-7%} keep-shapes \
  -rename-layers regions \
  -dissolve g + name=countries \
  -join "$TMP/names.json" keys=g,g target=countries \
  -each 'id = g' target=countries -filter-fields id,n,c target=countries \
  -o "$OUT/world.json" format=topojson quantization=1e6 id-field=id target=regions,countries

# 2) détail par pays, chargé quand on zoome : la précision suit la taille du plus grand morceau du pays
#    (la métropole pour la France, les États contigus pour les États-Unis...)
mkdir -p "$OUT/r" "$TMP/split"
mapshaper "$TMP/regions.json" -split g -o "$TMP/split/" format=geojson
for f in "$TMP"/split/*.json; do
  code=$(basename "$f" .json)
  interval=$(node -e '
    const fc = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    let lo = 180, hi = -180, la = 90, ha = -90, best = 0, bbox;
    for (const f of fc.features) {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const p of polys) {
        let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
        for (const [x, y] of p[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        const w = (x1 - x0) * Math.cos((y0 + y1) / 360 * Math.PI) * 111, h = (y1 - y0) * 111;
        if (w * h > best) { best = w * h; bbox = Math.max(w, h); }
      }
    }
    // environ 2500 points sur la largeur de la partie principale, entre 40 m et 1,5 km
    console.log(Math.round(Math.min(1500, Math.max(40, bbox * 1000 / 2500))));
  ' "$f")
  mapshaper "$f" -simplify interval=$interval keep-shapes -rename-layers regions \
    -o "$OUT/r/$code.json" format=topojson quantization=1e6 id-field=id 2>/dev/null
done
rm -rf "$TMP"
