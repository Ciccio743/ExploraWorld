// Regénère data/unesco.json (sites du patrimoine mondial) et data/iso2.json (code pays → drapeau).
//   NODE_PATH=… node tools/build-unesco.js <sites.geojson> <ne_50m_admin_0_countries.geojson>
// Sites : instantané de la liste UNESCO (paquet npm @worldwideview/wwv-plugin-unesco-sites, 1 273 sites).
// Chaque site est rattaché aux pays de sa fiche (noms anglais), sinon au pays de la carte qui contient son point.
const fs = require("fs");
const path = require("path");
const d3 = require("d3-geo");
const topojson = require("topojson-client");
const out = path.join(__dirname, "..", "data");
const [sitesFile, a0File] = process.argv.slice(2);

const world = JSON.parse(fs.readFileSync(path.join(out, "world.json"), "utf8"));
const countries = topojson.feature(world, world.objects.countries).features;
const known = new Set(countries.map(f => f.id));
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

const byName = {}, iso2 = {};
for (const f of JSON.parse(fs.readFileSync(a0File, "utf8")).features) {
  const p = f.properties;
  if (!known.has(p.ADM0_A3)) continue;
  for (const k of ["NAME", "NAME_LONG", "ADMIN", "NAME_EN", "FORMAL_EN", "NAME_SORT", "BRK_NAME"]) if (p[k]) byName[norm(p[k])] = p.ADM0_A3;
  if (p.ISO_A2_EH && p.ISO_A2_EH !== "-99") iso2[p.ADM0_A3] = p.ISO_A2_EH;
}
// noms de la liste UNESCO qui diffèrent de Natural Earth
Object.assign(byName, {
  turkiye: "TUR", czechia: "CZE", russianfederation: "RUS", iranislamicrepublicof: "IRN", syrianarabrepublic: "SYR",
  unitedkingdomofgreatbritainandnorthernireland: "GBR", unitedrepublicoftanzania: "TZA", vietnam: "VNM", vietnamsocialistrepublicof: "VNM",
  laopeoplesdemocraticrepublic: "LAO", republicofkorea: "KOR", democraticpeoplesrepublicofkorea: "PRK", republicofmoldova: "MDA",
  boliviaplurinationalstateof: "BOL", venezuelabolivarianrepublicof: "VEN", micronesiafederatedstatesof: "FSM",
  democraticrepublicofthecongo: "COD", congo: "COG", cotedivoire: "CIV", caboverde: "CPV", holysee: "VAT", palestine: "PSE",
  northmacedonia: "MKD", eswatini: "SWZ", unitedstatesofamerica: "USA", netherlandskingdomofthe: "NLD", jerusalemsitepro: "ISR"
});
const sites = [];
let byPoint = 0, none = 0;
for (const f of JSON.parse(fs.readFileSync(sitesFile, "utf8")).features) {
  const p = f.properties, [lon, lat] = f.geometry.coordinates;
  let codes = String(p.country || "").split(",").map(s => byName[norm(s)]).filter(Boolean);
  if (!codes.length) {
    const c = countries.find(c => d3.geoContains(c, [lon, lat]));
    if (c) { codes = [c.id]; byPoint++; } else { none++; continue; }
  }
  const cat = { cultural: "c", natural: "n", mixed: "m" }[p.category] || "c";
  sites.push([+p.id, p.name, +lon.toFixed(3), +lat.toFixed(3), cat, p.year || 0, [...new Set(codes)]]);
}
sites.sort((a, b) => a[0] - b[0]);
fs.writeFileSync(path.join(out, "unesco.json"), JSON.stringify(sites));
fs.writeFileSync(path.join(out, "iso2.json"), JSON.stringify(iso2));
console.log(`${sites.length} sites (${byPoint} rattachés par position, ${none} ignorés), ${Object.keys(iso2).length} drapeaux`);
