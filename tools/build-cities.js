// Regénère data/cities.json : villes de plus de 10 000 habitants (GeoNames, CC BY 4.0, via le paquet all-the-cities).
//   npm i all-the-cities@3.1.0 d3-geo@3 topojson-client@3
//   node tools/build-cities.js <ne_50m_admin_0_countries.geojson> <ne_10m_populated_places.geojson>
// Les noms français viennent de Natural Earth (NAME_FR, relié par l'identifiant GeoNames) ; l'ancien nom reste cherchable.
// Chaque ville est rattachée au pays de la carte qui la contient (data/world.json).
const fs = require("fs");
const path = require("path");
const d3 = require("d3-geo");
const topojson = require("topojson-client");
const cities = require("all-the-cities");

const MIN_POP = 10000;
const out = path.join(__dirname, "..", "data");
const world = JSON.parse(fs.readFileSync(path.join(out, "world.json"), "utf8"));
const countries = topojson.feature(world, world.objects.countries).features;
for (const f of countries) f.box = d3.geoBounds(f);

// repli : code ISO à 2 lettres -> code du pays, pour les villes posées juste hors du trait de côte simplifié
const iso = {};
for (const f of JSON.parse(fs.readFileSync(process.argv[2], "utf8")).features) {
  const p = f.properties;
  if (p.ISO_A2_EH && p.ISO_A2_EH !== "-99") iso[p.ISO_A2_EH] = p.ADM0_A3;
}
Object.assign(iso, { GF: "FRA", RE: "FRA", GP: "FRA", MQ: "FRA", YT: "FRA" });
const known = new Set(countries.map(f => f.id));
const fr = new Map();
for (const f of JSON.parse(fs.readFileSync(process.argv[3], "utf8")).features) {
  const p = f.properties;
  if (p.NAME_FR && p.GEONAMESID > 0) fr.set(p.GEONAMESID, p.NAME_FR);
}

const inBox = ([x, y], [[x0, y0], [x1, y1]]) => y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);
const codes = [], index = new Map(), rows = [];
for (const c of cities) {
  if (c.population < MIN_POP) continue;
  const pt = c.loc.coordinates;
  let code = countries.find(f => inBox(pt, f.box) && d3.geoContains(f, pt))?.id;
  if (!code && known.has(iso[c.country])) code = iso[c.country];
  if (!code) continue;
  if (!index.has(code)) { index.set(code, codes.length); codes.push(code); }
  const name = fr.get(c.cityId) || c.name;
  const row = [name, +pt[0].toFixed(3), +pt[1].toFixed(3), Math.round(c.population / 1000), index.get(code)];
  if (name !== c.name) row.push(c.name);
  rows.push(row);
}
rows.sort((a, b) => b[3] - a[3]);
fs.writeFileSync(path.join(out, "cities.json"), JSON.stringify({ countries: codes, cities: rows }));
console.log(rows.length + " villes");
