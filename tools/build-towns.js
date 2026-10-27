// Regénère data/towns.json : toutes les petites villes et villages de GeoNames (moins de 10 000 habitants,
// CC BY 4.0, via le paquet all-the-cities). Seulement pour la recherche : la carte n'affiche que data/cities.json.
//   npm i all-the-cities@3.1.0 d3-geo@3 topojson-client@3
//   node tools/build-towns.js
const fs = require("fs");
const path = require("path");
const d3 = require("d3-geo");
const topojson = require("topojson-client");
const cities = require("all-the-cities");

const MAX_POP = 10000; // au-dessus, la ville est déjà dans data/cities.json
const out = path.join(__dirname, "..", "data");
const world = JSON.parse(fs.readFileSync(path.join(out, "world.json"), "utf8"));
const countries = topojson.feature(world, world.objects.countries).features;
for (const f of countries) f.box = d3.geoBounds(f);
const inBox = ([x, y], [[x0, y0], [x1, y1]]) => y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);

const found = [], lost = [], votes = {};
for (const c of cities) {
  if (c.population >= MAX_POP) continue;
  const pt = c.loc.coordinates;
  const code = countries.find(f => inBox(pt, f.box) && d3.geoContains(f, pt))?.id;
  if (code) { found.push([c, code]); (votes[c.country] ||= {})[code] = (votes[c.country][code] || 0) + 1; }
  else lost.push(c);
}
// village posé juste hors du trait de côte simplifié : le pays le plus fréquent pour son code ISO
const isoTo = Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]]));
for (const c of lost) if (isoTo[c.country]) found.push([c, isoTo[c.country]]);

const codes = [], index = new Map(), rows = [];
for (const [c, code] of found) {
  if (!index.has(code)) { index.set(code, codes.length); codes.push(code); }
  const pt = c.loc.coordinates;
  rows.push([c.name, +pt[0].toFixed(3), +pt[1].toFixed(3), index.get(code), c.population]);
}
rows.sort((a, b) => b[4] - a[4]);
for (const r of rows) r.pop();
fs.writeFileSync(path.join(out, "towns.json"), JSON.stringify({ countries: codes, towns: rows }));
console.log(rows.length + " villages");
