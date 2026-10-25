// Prépare les régions avant simplification : rattache les petits territoires à leur pays et
// regroupe les découpages trop fins (districts anglais, communes slovènes...) en grandes régions.
//   node tools/prep-regions.js <ne_10m_admin_1_states_provinces.geojson> <sortie.geojson> <data/merged.json>
// merged.json garde l'ancien identifiant -> le nouveau, pour retrouver les marquages déjà faits.
const fs = require("fs");
const [src, out, mergedOut] = process.argv.slice(2);
const fc = JSON.parse(fs.readFileSync(src, "utf8"));

const DROP = new Set(["ATA", "PGA", "CLP", "CSI"]);
const ATTACH = { USG: "USA", UMI: "USA", ESB: "GBR", WSB: "GBR", GIB: "GBR", KAB: "KAZ" };
// pays regroupés par le champ « region » de Natural Earth (le Royaume-Uni par nation puis région anglaise)
const GROUP = {
  GBR: p => p.geonunit === "England" ? p.region : p.geonunit,
  ITA: p => p.region, ESP: p => p.region, SVN: p => p.region, LVA: p => p.region,
  UGA: p => p.region, AZE: p => p.region, MLT: p => p.region, PHL: p => p.region, BFA: p => p.region
};
const FR = {
  "England": "Angleterre", "Scotland": "Écosse", "Wales": "Pays de Galles", "Northern Ireland": "Irlande du Nord",
  "Greater London": "Grand Londres", "South East": "Sud-Est de l'Angleterre", "South West": "Sud-Ouest de l'Angleterre",
  "East": "Est de l'Angleterre", "Eastern": "Est de l'Angleterre", "East Midlands": "Midlands de l'Est", "West Midlands": "Midlands de l'Ouest",
  "North West": "Nord-Ouest de l'Angleterre", "North East": "Nord-Est de l'Angleterre", "Yorkshire and the Humber": "Yorkshire-et-Humber",
  "Sicily": "Sicile", "Sardegna": "Sardaigne", "Lombardia": "Lombardie", "Toscana": "Toscane", "Piemonte": "Piémont", "Apulia": "Pouilles",
  "Campania": "Campanie", "Lazio": "Latium", "Calabria": "Calabre", "Veneto": "Vénétie", "Liguria": "Ligurie", "Umbria": "Ombrie",
  "Marche": "Marches", "Valle d'Aosta": "Vallée d'Aoste", "Trentino-Alto Adige": "Trentin-Haut-Adige", "Friuli-Venezia Giulia": "Frioul-Vénétie Julienne",
  "Emilia-Romagna": "Émilie-Romagne", "Basilicata": "Basilicate", "Abruzzo": "Abruzzes", "Molise": "Molise",
  "Andalucía": "Andalousie", "Cataluña": "Catalogne", "País Vasco": "Pays basque", "Aragón": "Aragon", "Castilla y León": "Castille-et-León",
  "Castilla-La Mancha": "Castille-La Manche", "Valenciana": "Communauté valencienne", "Murcia": "Murcie", "Asturias": "Asturies",
  "Cantabria": "Cantabrie", "Canary Is.": "Îles Canaries", "Islas Baleares": "Îles Baléares", "Galicia": "Galice", "Foral de Navarra": "Navarre",
  "Madrid": "Communauté de Madrid", "Extremadura": "Estrémadure", "La Rioja": "La Rioja", "Ceuta": "Ceuta", "Melilla": "Melilla"
};
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

const merged = {};
fc.features = fc.features.filter(f => !DROP.has(f.properties.adm0_a3)).map(f => {
  const p = f.properties;
  const g = ATTACH[p.adm0_a3] || p.adm0_a3;
  let id = p.adm1_code, n = p.name_fr || p.name || p.name_en || p.gn_name || p.woe_name || p.adm1_code, t = p.type_en || "";
  const key = GROUP[g] && GROUP[g](p);
  if (key) {
    id = g + "-R-" + slug(key);
    merged[p.adm1_code] = id;
    n = FR[key] || key;
    t = "Region";
  }
  f.properties = { id, n, t, g };
  return f;
});
fs.writeFileSync(out, JSON.stringify(fc));
fs.writeFileSync(mergedOut, JSON.stringify(merged));
const groups = new Set(Object.values(merged));
console.log(Object.keys(merged).length + " régions regroupées en " + groups.size);
