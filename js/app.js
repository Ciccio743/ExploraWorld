(() => {
const WORLD_COUNTRIES = 195; // membres de l'ONU + Vatican + Palestine
const CAT = { c: "culturel", n: "naturel", m: "mixte" };
// moyens de transport : icône, nom, vitesse moyenne (km/h)
const MODES = { plane: ["✈️", "Avion", 750], car: ["🚗", "Voiture", 80], train: ["🚆", "Train", 110], bus: ["🚌", "Bus", 65], boat: ["⛴️", "Bateau", 30] };
// couleurs au choix pour un trip (lisibles en clair comme en sombre)
const TRIP_COLORS = ["#1677ff", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#16a34a", "#0d9488"];
const CAT_IC = { c: "🏛️", n: "🌿", m: "🏞️" };
const MILESTONES = [1, 5, 10, 20, 30, 50, 75, 100, 150, 195];
const KIND = {
  "Metropolitan department": "départements", "Overseas department": "départements", "Department": "départements",
  "State": "états", "Province": "provinces", "Region": "régions", "County": "comtés", "Prefecture": "préfectures",
  "Oblast": "oblasts", "Canton": "cantons", "District": "districts", "Municipality": "municipalités",
  "Governorate": "gouvernorats", "Emirate": "émirats", "Autonomous Community": "communautés", "Voivodeship": "voïvodies",
  "Län": "comtés", "Parish": "paroisses", "Island": "îles", "Territory": "territoires", "Republic": "républiques"
};
const SINGULAR = {
  "départements": "département", "états": "état", "provinces": "province", "régions": "région", "comtés": "comté",
  "préfectures": "préfecture", "oblasts": "oblast", "cantons": "canton", "districts": "district", "municipalités": "municipalité",
  "gouvernorats": "gouvernorat", "émirats": "émirat", "communautés": "communauté", "voïvodies": "voïvodie",
  "paroisses": "paroisse", "îles": "île", "territoires": "territoire", "républiques": "république"
};
// types de régions au féminin, pour accorder « visitées », « une région »...
const FEMININE = new Set(["régions", "provinces", "préfectures", "municipalités", "communautés", "voïvodies", "paroisses", "îles", "républiques"]);
const CONTINENT = {
  "Europe": "Europe", "Asia": "Asie", "Africa": "Afrique", "North America": "Amérique du Nord",
  "South America": "Amérique du Sud", "Oceania": "Océanie", "Seven seas (open ocean)": "Îles des océans"
};
const OCEAN_ISLANDS = "Seven seas (open ocean)";
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

const $ = id => document.getElementById(id);
// à augmenter quand les fichiers de data/ changent, pour que les téléphones ne gardent pas l'ancienne version
const DATA_VERSION = 6;
const dataUrl = file => "data/" + file + "?v=" + DATA_VERSION;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cap = s => s[0].toUpperCase() + s.slice(1);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmtPct = p => p === 0 ? "0" : p < .01 ? "<0,01" : (p < 10 ? p.toFixed(2) : p.toFixed(1)).replace(".", ",");
const plural = (n, one, many) => n + " " + (n > 1 ? many : one);
const fmtDate = iso => { if (!iso) return ""; const d = new Date(iso + "T12:00"); return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear(); };
const monthValue = ts => { if (!ts) return ""; const d = new Date(ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
const today = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };

/* ---------- Données et état ---------- */
let countries = [], byId = new Map(), regionsBy = new Map(), regionById = new Map();
let worldArea = 0;
const neighbors = new Map(); // pays → pays voisins (frontière commune)
let sites = [], siteById = new Map(), sitesBy = new Map(), selSite = null; // patrimoine mondial UNESCO
let iso2 = {};
// drapeau emoji à partir du code ISO à 2 lettres
const flag = code => iso2[code] ? [...iso2[code]].map(ch => String.fromCodePoint(0x1F1A5 + ch.charCodeAt(0))).join("") : "";
// c, r : pays et régions visités (id -> date) · w : envies (id de pays ou de région -> date) · plans : projets de voyage
let state = { c: new Map(), r: new Map(), w: new Map(), u: new Map(), plans: [], k: {}, j: {}, p: [], f: [] };
// Couleurs de la carte : chaque pays visité a sa couleur (choisie, sinon attribuée), ou tout en or
const PALETTE = ["#f5b83d", "#ff6b6b", "#ff922b", "#fcc419", "#51cf66", "#20c997", "#22b8cf", "#339af0", "#5c7cfa", "#845ef7", "#cc5de8", "#f06595", "#94d82d"];
const cleanColors = o => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).filter(([k, v]) => /^[A-Z0-9-]{2,8}$/.test(k) && PALETTE.includes(v)));
const autoColor = new Map();
// noms faux ou anglais dans les données Natural Earth
const REGION_NAMES = { "UGA-R-Western": "Région de l'Ouest", "UGA-R-Central": "Région centrale", "UGA-R-Eastern": "Région de l'Est", "UGA-R-Northern": "Région du Nord",
  "SGP-4873": "Nord-Ouest", "SGP-4872": "Sud-Ouest", "SGP-4875": "Sud-Est", "SGP-4874": "Nord-Est" };
// Royaume-Uni : les quatre nations, pour les distinguer sur la carte, dans la fiche et dans la recherche
const UK_NATIONS = {
  SCT: { n: "Écosse", f: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", r: "Scottish-Borders Dumfries-et-Galloway Stirling-et-Forth Edimbourg-et-Lothian Ayrshire Glasgow-et-Clyde Argyll-et-Bute Highlands Aberdeen-et-Grampian Tayside Fife Iles-ecossaises" },
  WLS: { n: "Pays de Galles", f: "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}", r: "Clwyd Powys Gwent Cardiff-et-Vale-of-Glamorgan Glamorgan-central Swansea-et-Glamorgan-Ouest Dyfed Gwynedd-et-Anglesey" },
  NIR: { n: "Irlande du Nord", f: "🇬🇧", r: "Londonderry Tyrone Fermanagh Armagh Down Antrim-et-Belfast" },
  OVS: { n: "Territoires d'outre-mer", f: "🇬🇧", r: "Dhekelia Akrotiri Gibraltar" },
  ENG: { n: "Angleterre", f: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", r: "" }
};
const nationOfId = new Map(Object.entries(UK_NATIONS).flatMap(([k, v]) => v.r.split(" ").filter(Boolean).map(x => ["GBR-R-" + x, k])));
const nationOf = id => String(id).startsWith("GBR-") ? nationOfId.get(id) || "ENG" : null;
// Journal de chaque pays : { cover, entries: [{ id, d, t, x, e, ph: [ids des photos] }] } ; les photos sont dans IndexedDB
const MOODS = ["😍", "😀", "😌", "🤩", "😴", "🥵", "🥶", "🍽️", "🏖️", "🏔️", "🚶", "🎉"];
// Photos accrochées sur la carte : { id, ph (photo sur l'appareil), lon, lat, d (jour de la photo) }
const cleanPins = l => (Array.isArray(l) ? l : []).filter(x => x && x.ph && isFinite(x.lon) && isFinite(x.lat)).slice(0, 3000)
  .map(x => ({ id: String(x.id || x.ph).slice(0, 24), ph: String(x.ph).slice(0, 24), lon: +(+x.lon).toFixed(5), lat: +(+x.lat).toFixed(5), d: /^\d{4}-\d{2}-\d{2}$/.test(x.d) ? x.d : "", ...(/^[A-Z0-9]{3}$/.test(x.c) ? { c: x.c } : {}) }));
// Mes vols : { id, a: { n, lon, lat, c }, b: {…}, d }
const cleanEnd = e => e && e.n && isFinite(e.lon) && isFinite(e.lat) ? { n: String(e.n).slice(0, 60), lon: +(+e.lon).toFixed(3), lat: +(+e.lat).toFixed(3), c: String(e.c || "").slice(0, 8) } : null;
const cleanFlights = l => (Array.isArray(l) ? l : []).slice(0, 2000).map((x, i) => ({ id: String(x.id || "f" + i).slice(0, 20), a: cleanEnd(x.a), b: cleanEnd(x.b), d: /^\d{4}-\d{2}-\d{2}$/.test(x.d) ? x.d : "" })).filter(x => x.a && x.b);
function cleanJournal(o) {
  const out = {};
  for (const [c, v] of Object.entries(o && typeof o === "object" ? o : {})) {
    if (!/^[A-Z0-9-]{2,8}$/.test(c) || !v || !Array.isArray(v.entries)) continue;
    const entries = v.entries.filter(x => x && x.id).slice(0, 500).map(x => ({
      id: String(x.id).slice(0, 20), d: /^\d{4}-\d{2}-\d{2}$/.test(x.d) ? x.d : "", t: String(x.t || "").slice(0, 120),
      x: String(x.x || "").slice(0, 20000), e: MOODS.includes(x.e) ? x.e : "", ph: (Array.isArray(x.ph) ? x.ph : []).map(String).slice(0, 30)
    }));
    out[c] = { cover: typeof v.cover === "string" ? v.cover.slice(0, 20) : "", entries };
  }
  return out;
}
const countryColor = code => state.k[code] || autoColor.get(code) || null;
// variantes claire et foncée calculées ici (plus sûr que color-mix sur les anciens iPhone)
let fogNow = "";
function setColorVars(el, code) {
  const c = countryColor(code);
  if (!c) { el.style.removeProperty("--c"); el.style.removeProperty("--cs"); el.style.removeProperty("--cd"); return; }
  el.style.setProperty("--c", c);
  el.style.setProperty("--cs", d3.interpolateRgb(fogNow || "#eef1ef", c)(.55));
  el.style.setProperty("--cd", d3.interpolateRgb(c, "#000")(.4));
}
// style de carte : « classic » (dessinée) ou « real » (satellite avec les reliefs)
// par défaut : carte réaliste (satellite) ; « classic » = carte dessinée
const REAL = (() => { try { return localStorage.getItem("explora-mapstyle") !== "classic"; } catch (e) { return true; } })();
let current = null, selected = null, tab = "map", tripView = "visited";
let routePlan = null; // projet affiché sur la carte
let quick = false;
let sheetMonth = ""; // mois choisi avant de marquer le pays
let askRegions = null; // pays tout juste marqué : on propose d'en choisir les régions
let me = null, watchId = null;

/* ---------- Sauvegarde locale ---------- */
const LS = "explora-world-v1";
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
function toMap(v) {
  // accepte l'ancien format (liste d'ids) et le nouveau (id -> date)
  if (Array.isArray(v)) return new Map(v.map(id => [id, 0]));
  if (v && typeof v === "object") return new Map(Object.entries(v).map(([k, t]) => [k, +t || 0]));
  return new Map();
}
const httpsOr = u => typeof u === "string" && u.startsWith("https://") ? u.slice(0, 500) : "";
const cleanSpots = l => (Array.isArray(l) ? l : []).filter(x => x && x.n).slice(0, 100)
  .map(x => ({ n: String(x.n).slice(0, 140), done: !!x.done, url: httpsOr(x.url), img: httpsOr(x.img) }));
function cleanPlans(list) {
  return (Array.isArray(list) ? list : []).filter(p => p && p.id).map(p => {
    const stops = Array.isArray(p.stops) ? p.stops.map(String) : [];
    return {
      id: String(p.id), name: String(p.name || "Mon projet"), start: p.start || "", end: p.end || "",
      color: TRIP_COLORS.includes(p.color) ? p.color : TRIP_COLORS[0],
      stops, notes: String(p.notes || ""), done: !!p.done,
      // nights[i] : nuits passées à l'étape i · modes[i] : transport pour y arriver ("" = choisi selon la distance)
      nights: stops.map((_, i) => Math.max(0, Math.min(99, Math.round(+(p.nights || [])[i]) || 0))),
      modes: stops.map((_, i) => MODES[(p.modes || [])[i]] ? p.modes[i] : ""),
      snotes: stops.map((_, i) => String((p.snotes || [])[i] || "").slice(0, 5000)), // notes de chaque étape
      spots: stops.map((_, i) => cleanSpots((p.spots || [])[i])) // spots et activités de chaque étape
    };
  });
}
function serialize() {
  return { v: 3, c: Object.fromEntries(state.c), r: Object.fromEntries(state.r), w: Object.fromEntries(state.w), u: Object.fromEntries(state.u), plans: state.plans, k: state.k, j: state.j, p: state.p, f: state.f, t: Date.now() };
}
let VIEW = null; // carte d'un ami ouverte par un lien : rien n'est enregistré
function save() { if (!VIEW) store.set(LS, JSON.stringify(serialize())); }
try {
  const d = JSON.parse(store.get(LS) || "null");
  if (d) state = { c: toMap(d.c), r: toMap(d.r), w: toMap(d.w), u: toMap(d.u), plans: cleanPlans(d.plans), k: cleanColors(d.k), j: cleanJournal(d.j), p: cleanPins(d.p), f: cleanFlights(d.f) };
} catch (e) {}
// le marquage rapide a été retiré du panneau : toucher une région la sélectionne toujours
// les premières versions dataient chaque visite du jour du marquage : on efface ces dates automatiques
// (une date choisie par l'utilisateur tombe toujours pile à midi)
if (!store.get("explora-dates-v2")) {
  for (const [id, t] of state.c) { const d = new Date(t); if (t && (d.getHours() !== 12 || d.getMinutes() || d.getSeconds())) state.c.set(id, 0); }
  save();
  store.set("explora-dates-v2", "1");
}

/* ---------- Chargement ---------- */
// découpages qui ont changé : merged = ancienne région → région regroupée,
// split = ancienne grande région → ses nouvelles subdivisions (toutes reprises, à décocher au besoin)
function migrate(merged, split) {
  let changed = false;
  const targets = id => split[id] || (merged[id] ? [merged[id]] : null);
  for (const key of ["r", "w"]) {
    for (const [id, ts] of [...state[key]]) {
      const to = targets(id);
      if (!to) continue;
      state[key].delete(id);
      for (const t of to) {
        const old = state[key].get(t);
        state[key].set(t, old === undefined ? ts : (old && ts ? Math.min(old, ts) : old || ts));
      }
      changed = true;
    }
  }
  for (const p of state.plans) {
    // une étape sur une région redécoupée devient le pays entier
    const stops = p.stops.map(id => split[id] ? split[id][0].split("-")[0] : merged[id] || id);
    if (stops.join() !== p.stops.join()) { p.stops = stops; changed = true; }
  }
  if (changed) save();
}
function mainParts(f) {
  // pour cadrer un pays : garder les gros morceaux (évite la Guyane dans le cadrage de la France)
  const g = f.geometry;
  if (g.type !== "MultiPolygon") return f;
  const parts = g.coordinates.map(c => ({ c, a: d3.geoArea({ type: "Polygon", coordinates: c }) }));
  const max = d3.max(parts, p => p.a);
  return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: parts.filter(p => p.a >= max * .2).map(p => p.c) } };
}
function kindOf(code) {
  const counts = d3.rollup(regionsBy.get(code) || [], v => v.length, r => r.properties.t);
  const top = [...counts].sort((a, b) => b[1] - a[1])[0];
  return (top && KIND[top[0]]) || "régions";
}

let worldTopo = null;
// frontières entre les nations du Royaume-Uni et contour de chacune (pour les nommer)
function ukNations(t, obj) {
  const geoms = obj.geometries.filter(g => (g.properties?.g || g.id.split("-")[0]) === "GBR" || String(g.id).startsWith("GBR-"));
  return {
    mesh: topojson.mesh(t, { type: "GeometryCollection", geometries: geoms }, (a, b) => a !== b && nationOf(a.id) !== nationOf(b.id)),
    shapes: ["SCT", "ENG", "WLS", "NIR"].map(k => ({ k, shape: topojson.merge(t, geoms.filter(g => nationOf(g.id) === k)) }))
  };
}
let ukWorld = null;
async function load() {
  // carte légère du monde : pays et régions tirés des mêmes contours, donc frontières identiques
  const [world, merged, split] = worldTopo = await Promise.all([
    fetch(dataUrl("world.json")).then(r => r.json()),
    fetch(dataUrl("merged.json")).then(r => r.json()).catch(() => ({})),
    fetch(dataUrl("split.json")).then(r => r.json()).catch(() => ({}))
  ]);
  // lien de partage : on affiche la carte de l'ami à la place de la sienne, sans rien enregistrer
  const shared = location.hash.startsWith("#carte=") ? await unpackMap(location.hash.slice(7)).catch(() => null) : null;
  if (shared) {
    VIEW = shared;
    state = { c: new Map(shared.c.map(c => [c, 0])), r: new Map(shared.r.map(r => [r, 0])), w: new Map(), u: new Map(), plans: [], k: shared.k, j: {}, p: [], f: shared.f || [] };
  }
  migrate(merged, split);
  countries = topojson.feature(world, world.objects.countries).features;
  ukWorld = ukNations(world, world.objects.regions);
  const nb = topojson.neighbors(world.objects.countries.geometries);
  countries.forEach((f, i) => neighbors.set(f.id, nb[i].map(j => countries[j].id)));
  // couleur attribuée à chaque pays, différente de celles de ses voisins
  for (const f of [...countries].sort((a, b) => a.id.localeCompare(b.id))) {
    const used = new Set((neighbors.get(f.id) || []).map(n => autoColor.get(n)));
    let h = 0; for (const ch of f.id) h = (h * 31 + ch.charCodeAt(0)) % 997;
    const AUTO = PALETTE.slice(1); // l'or reste au choix, pays par pays
    let c = AUTO[h % AUTO.length];
    for (let i = 0; used.has(c) && i < AUTO.length; i++) c = AUTO[(h + i) % AUTO.length];
    autoColor.set(f.id, c);
  }
  for (const f of countries) byId.set(f.id, f);
  for (const r of topojson.feature(world, world.objects.regions).features) {
    r.area = d3.geoArea(r); r.code = r.properties.g;
    if (REGION_NAMES[r.id]) r.properties.n = REGION_NAMES[r.id];
    regionById.set(r.id, r); worldArea += r.area;
    if (!regionsBy.has(r.code)) regionsBy.set(r.code, []);
    regionsBy.get(r.code).push(r);
  }
  // régions qui n'existent plus dans ce découpage (ancien regroupement) : retirées, le pays reste visité
  let pruned = false;
  for (const key of ["r", "w"]) for (const id of [...state[key].keys()]) {
    if (key === "w" && byId.has(id)) continue;
    if (!regionById.has(id)) { state[key].delete(id); pruned = true; }
  }
  if (pruned) save();
  for (const fs of regionsBy.values()) fs.sort((a, b) => a.properties.n.localeCompare(b.properties.n, "fr"));
  for (const f of countries) {
    f.main = mainParts(f);
    f.kind = kindOf(f.id);
    f.nreg = (regionsBy.get(f.id) || []).length;
    f.area = d3.sum(regionsBy.get(f.id) || [], r => r.area);
  }
  $("loading").hidden = true;
  if (VIEW) showViewBanner();
  resize();
  drawBase();
  update();
  svg.call(zoom.transform, homeTransform());
  loadCities().catch(() => {}).then(() => autoLocate());
  loadSites().catch(() => {});
}

/* ---------- Contours détaillés d'un pays, chargés au zoom ---------- */
const details = new Map(); // code -> { regions, byId, outline } ou promesse en cours
function ensureDetail(code) {
  if (details.has(code)) return Promise.resolve(details.get(code));
  const p = fetch(dataUrl("r/" + code + ".json")).then(r => r.json()).then(t => {
    const obj = t.objects.regions;
    const regions = topojson.feature(t, obj).features;
    // garde-fou : un détail qui ne correspond pas à la carte légère (ancienne version en cache) est ignoré
    if (regions.some(r => !regionById.has(r.id))) throw new Error("détail périmé");
    for (const r of regions) { r.detail = true; r.code = code; if (REGION_NAMES[r.id]) r.properties.n = REGION_NAMES[r.id]; }
    const d = { regions, byId: new Map(regions.map(r => [r.id, r])), outline: topojson.merge(t, obj.geometries) };
    if (code === "GBR") d.nations = ukNations(t, obj);
    details.set(code, d);
    return d;
  }).catch(() => { details.delete(code); return null; });
  details.set(code, p);
  return p;
}
const detailOf = code => { const d = details.get(code); return d && !(d instanceof Promise) ? d : null; };
const shapeOf = id => { const r = regionById.get(id); return (r && detailOf(r.code)?.byId.get(id)) || r; };

/* ---------- Lieux (pays ou région) ---------- */
const isCountry = id => byId.has(id);
// une étape peut être une ville : « @région|nom|lon|lat »
const isCity = id => id[0] === "@";
const cityStops = new Map();
function cityStop(id) {
  if (!cityStops.has(id)) { const [r, n, lon, lat] = id.slice(1).split("|"); cityStops.set(id, { r, lon: +lon, lat: +lat, properties: { n } }); }
  return cityStops.get(id);
}
const cityId = (c, r) => `@${r}|${c.n.replace(/\|/g, " ")}|${c.lon}|${c.lat}`;
// ou un site du patrimoine mondial : « #site|région »
const isSite = id => id[0] === "#";
const siteOfStop = id => siteById.get(id.slice(1).split("|")[0]);
function siteStop(id) {
  const st = siteOfStop(id);
  return st && { r: id.split("|")[1], lon: st.lon, lat: st.lat, site: st, properties: { n: st.n } };
}
const place = id => isCity(id) ? cityStop(id) : isSite(id) ? siteStop(id) : byId.get(id) || regionById.get(id);
const placeName = id => place(id)?.properties.n || id;
const placeRegion = id => isCity(id) ? cityStop(id).r : isSite(id) ? id.split("|")[1] : id;
const placeCountry = id => isCountry(id) ? id : regionById.get(placeRegion(id))?.code;
function placeSub(id) {
  if (isCountry(id)) return "";
  const r = regionById.get(placeRegion(id));
  if (!r) return "";
  const c = byId.get(r.code)?.properties.n || "";
  return c; // pour une ville, le pays suffit (les noms de régions détaillées sont souvent en langue locale)
}
function centroid(id) {
  if (isCity(id) || isSite(id)) { const c = place(id); return [c.lon, c.lat]; }
  const f = byId.get(id);
  return d3.geoCentroid(f ? f.main : regionById.get(id));
}
function isVisited(id) { return isCountry(id) ? state.c.has(id) : state.r.has(placeRegion(id)); }

/* ---------- Trajets ---------- */
const legKm = (a, b) => d3.geoDistance(centroid(a), centroid(b)) * 6371;
const legMode = (p, i) => p.modes[i] || (legKm(p.stops[i - 1], p.stops[i]) > 700 ? "plane" : "car");
function legInfo(p, i) {
  const m = legMode(p, i), crow = legKm(p.stops[i - 1], p.stops[i]);
  const road = ROAD[m] && roadRoute(p.stops[i - 1], p.stops[i]);
  if (road) return { m, km: road.d / 1000, h: road.t / 3600 * ROAD[m], road: road.c, real: true };
  const km = m === "plane" ? crow : crow * 1.25; // par la route, un peu plus long qu'à vol d'oiseau
  return { m, km, h: m === "plane" ? crow / 750 + .75 : km / MODES[m][2] };
}
const fmtKm = (km, real) => (real ? "" : "≈ ") + (km < 10 ? Math.round(km) : Math.round(km / 10) * 10).toLocaleString("fr-FR") + " km";
function fmtDur(h, real) {
  const pre = real ? "" : "≈ ";
  if (h < 1) return pre + Math.max(5, Math.round(h * 12) * 5) + " min";
  const H = Math.floor(h), M = Math.round((h - H) * (real ? 12 : 4)) * (real ? 5 : 15);
  return pre + (M === 60 ? H + 1 + " h" : H + " h" + (M ? " " + String(M).padStart(2, "0") : ""));
}

/* ---------- Tracé routier ---------- */
// Trajets en voiture et en bus : le vrai itinéraire par la route (OSRM, données OpenStreetMap),
// demandé une fois par trajet puis gardé sur le téléphone. Sans réseau, on garde l'estimation.
const ROAD = { car: 1, bus: 1.3 }; // le bus roule un peu moins vite que la voiture
const ROUTES_KEY = "explora-routes";
let routes = {};
try { routes = JSON.parse(localStorage.getItem(ROUTES_KEY)) || {}; } catch (e) {}
const roadAsked = new Set();
let roadQueue = Promise.resolve();
const roadKey = (a, b) => [centroid(a), centroid(b)].map(([x, y]) => x.toFixed(3) + "," + y.toFixed(3)).join(";");
function roadRoute(a, b) {
  const key = roadKey(a, b), r = routes[key];
  if (r) return r.c ? r : null;
  if (roadAsked.has(key)) return null;
  roadAsked.add(key);
  // une demande à la fois, pour rester discret avec le service gratuit
  roadQueue = roadQueue.then(async () => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?overview=simplified&geometries=geojson`);
      const d = await res.json();
      const route = d.code === "Ok" && d.routes?.[0];
      // pas de route possible (une île, un océan…) : on s'en souvient aussi
      routes[key] = route ? { d: route.distance, t: route.duration, c: route.geometry.coordinates.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]) } : { none: 1 };
      const keys = Object.keys(routes);
      for (const k of keys.slice(0, Math.max(0, keys.length - 80))) delete routes[k];
      try { localStorage.setItem(ROUTES_KEY, JSON.stringify(routes)); } catch (e) {}
      roadReady();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  });
  return null;
}
// un trajet vient d'arriver : on met à jour ce qui est affiché
const roadReady = (() => {
  let t = 0;
  return () => { clearTimeout(t); t = setTimeout(() => { if (editPlan && !$("view-plans").hidden) renderPlans(); if (routePlan) drawRoute(); }, 150); };
})();
// tracé d'un trajet entre deux points de l'écran : les vols sont des arcs, le reste des lignes
function legPath(a, b, m) {
  if (m !== "plane") return `M${a}L${b}`;
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  let nx = -dy / d, ny = dx / d;
  if (ny > 0) { nx = -nx; ny = -ny; } // l'arc monte
  const c = [(a[0] + b[0]) / 2 + nx * d * .22, (a[1] + b[1]) / 2 + ny * d * .22];
  return `M${a}Q${c} ${b}`;
}

/* ---------- Carte ---------- */
const svg = d3.select("#map");
const root = svg.append("g");
const gTiles = root.append("g").attr("class", "tiles");
const gBase = root.append("g");
const gOverlay = root.append("g");
const gNear = root.append("g").attr("class", "near");
const gDetail = root.append("g").attr("class", "detail");
const gOutline = root.append("g");
const gSel = root.append("g");
const gRoute = root.append("g");
const gFlights = root.append("g").attr("class", "flights");
const gSites = root.append("g");
const gCities = root.append("g");
const gPins = root.append("g").attr("class", "pins");
const gMe = root.append("g");
const projection = REAL ? d3.geoMercator() : d3.geoNaturalEarth1();
document.body.classList.toggle("real", REAL);
const path = d3.geoPath(projection);
let W = 0, H = 0, k = 1;
const tip = $("tip");

const zoom = d3.zoom().scaleExtent([1, 600]).on("zoom", e => {
  k = e.transform.k;
  root.attr("transform", e.transform);
  if (me) drawMe();
  if (routePlan) sizeStops();
  gCities.selectAll(".city").attr("transform", cityTransform);
  gSites.selectAll(".site").attr("transform", siteTransform);
  gPins.selectAll(".pin-g").attr("transform", pinTransform);
  gFlights.selectAll(".fl-end").attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / k})`);
  gOutline.selectAll(".nation-name").attr("transform", d => { const [x, y] = path.centroid(d.shape); return `translate(${x},${y}) scale(${1 / k})`; });
  gBase.selectAll(".ocean-name").attr("transform", oceanTransform).style("opacity", k > 5 ? 0 : null);
  tip.hidden = true;
  if (REAL && !tileRaf) tileRaf = requestAnimationFrame(() => { tileRaf = 0; drawTiles(); });
}).on("end", () => { drawCities(); drawTiles(); drawPins(); });
// Carte réaliste : images satellite avec le relief (NASA Blue Marble, puis Sentinel-2 en zoomant fort)
let tileRaf = 0;
const tileUrl = (z, x, y) => z <= 8
  ? `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/${z}/${y}/${x}.jpeg`
  : `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${z}/${y}/${x}.jpg`;
function drawTiles() {
  if (!REAL || !W) return;
  const t = d3.zoomTransform(svg.node());
  const world = 2 * Math.PI * projection.scale();
  const [ox, oy] = projection([-180, 85.0511287798]);
  const zc = Math.max(1, Math.min(15, Math.round(Math.log2(world * t.k * Math.min(2, devicePixelRatio || 1) / 256))));
  const tiles = [];
  const add = z => {
    const n = 2 ** z, T = world / n;
    const x0 = Math.max(0, Math.floor((-t.x / t.k - ox) / T)), x1 = Math.min(n - 1, Math.floor(((W - t.x) / t.k - ox) / T));
    const y0 = Math.max(0, Math.floor((-t.y / t.k - oy) / T)), y1 = Math.min(n - 1, Math.floor(((H - t.y) / t.k - oy) / T));
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push({ id: z + "/" + x + "/" + y, z, x, y, X: ox + x * T, Y: oy + y * T, T });
  };
  // un fond peu détaillé toujours présent, puis les images plus fines par-dessus
  add(2);
  if (zc > 2) add(Math.min(zc, 8));
  if (zc > 8) add(zc);
  gTiles.selectAll("image").data(tiles, d => d.id).join(enter => enter.append("image")
      .attr("href", d => tileUrl(d.z, d.x, d.y)).attr("preserveAspectRatio", "none")
      .attr("x", d => d.X).attr("y", d => d.Y).attr("width", d => d.T * 1.002).attr("height", d => d.T * 1.002)
      .on("error", function () { this.remove(); }))
    .sort((a, b) => a.z - b.z);
}
svg.call(zoom).on("dblclick.zoom", null);

function resize() {
  const r = svg.node().getBoundingClientRect();
  if (!r.width) return false;
  if (r.width === W && r.height === H) return false;
  W = r.width; H = r.height;
  if (REAL) projection.fitExtent([[0, 10], [W, H - 10]], { type: "MultiPoint", coordinates: [[-180, -58], [180, 80]] });
  else projection.fitExtent([[10, 10], [W - 10, H - 10]], { type: "Sphere" });
  zoom.translateExtent([[-W * .5, -H * .5], [W * 1.5, H * 1.5]]).extent([[0, 0], [W, H]]);
  return true;
}

function drawBase() {
  for (const g of [gBase, gOverlay, gDetail, gRoute, gTiles]) g.selectAll("*").remove();
  setTimeout(drawTiles);
  gBase.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" }));
  gBase.selectAll(".ocean-name").data(OCEANS).join("text")
    .attr("class", "ocean-name").attr("text-anchor", "middle")
    .attr("transform", oceanTransform)
    .call(t => { t.append("tspan").attr("x", 0).attr("dy", "-.2em").text("Océan"); t.append("tspan").attr("x", 0).attr("dy", "1.25em").text(d => d[0]); });
  gBase.selectAll(".country").data(countries, d => d.id).join("path")
    .attr("class", "country").attr("d", path)
    .on("click", (e, d) => { e.stopPropagation(); if (d.id !== current) openCountry(d.id); })
    .on("pointermove", (e, d) => showTip(e, d.properties.n))
    .on("pointerleave", () => tip.hidden = true);
}

function drawMap() {
  fogNow = getComputedStyle(document.documentElement).getPropertyValue("--fog").trim();
  // autour du pays ouvert, les voisins sont dessinés avec leurs contours détaillés : frontières jointives
  const near = new Set(current ? (neighbors.get(current) || []).filter(detailOf) : []);
  gBase.selectAll(".country")
    .classed("visited", d => state.c.has(d.id))
    .classed("wish", d => !state.c.has(d.id) && state.w.has(d.id))
    .classed("active", d => d.id === current || near.has(d.id))
    .each(function (d) { setColorVars(this, d.id); });
  gNear.selectAll(".region").data([...near].flatMap(c => detailOf(c).regions), d => d.id).join(
    enter => enter.append("path").attr("d", path).on("click", (e, d) => { e.stopPropagation(); openCountry(d.code); })
  ).attr("class", d => "region " + (state.r.has(d.id) ? "visited" : state.c.has(d.code) ? "in-visited" : state.w.has(d.id) || state.w.has(d.code) ? "wish" : ""))
    .each(function (d) { setColorVars(this, d.code); });
  gNear.selectAll(".near-line").data([...near].map(c => detailOf(c).outline)).join("path").attr("class", "near-line").attr("d", path);
  const marked = new Set([...state.r.keys(), ...[...state.w.keys()].filter(id => regionById.has(id))]);
  const others = [...marked].map(id => regionById.get(id)).filter(r => r && r.code !== current && !near.has(r.code));
  gOverlay.selectAll(".region").data(others, d => d.id)
    .join(enter => enter.append("path").attr("d", path))
    .attr("class", d => "region " + (state.r.has(d.id) ? "visited" : "wish"))
    .each(function (d) { setColorVars(this, d.code); });
  const det = current && detailOf(current);
  gDetail.selectAll(".region").data(current ? (det ? det.regions : regionsBy.get(current) || []) : [], d => d.id + (d.detail ? "+" : "")).join(
    enter => enter.append("path").attr("class", "region").attr("d", path)
      .on("click", (e, d) => { e.stopPropagation(); tapRegion(d); })
      .on("pointermove", (e, d) => showTip(e, d.properties.n))
      .on("pointerleave", () => tip.hidden = true)
  ).classed("visited", d => state.r.has(d.id)).classed("wish", d => !state.r.has(d.id) && state.w.has(d.id))
    .each(function () { setColorVars(this, current); });
  gOutline.selectAll("path").data(current ? [det ? det.outline : byId.get(current)] : []).join("path").attr("class", "outline").attr("d", path);
  // Royaume-Uni ouvert : frontières des nations bien marquées, et leur nom
  const uk = current === "GBR" ? (det && det.nations) || ukWorld : null;
  gOutline.selectAll(".nation-line").data(uk ? [uk.mesh] : []).join("path").attr("class", "nation-line").attr("d", path);
  gOutline.selectAll(".nation-name").data(uk ? uk.shapes : [], d => d.k).join("text").attr("class", "nation-name").attr("text-anchor", "middle")
    .text(d => UK_NATIONS[d.k].n).attr("transform", d => { const [x, y] = path.centroid(d.shape); return `translate(${x},${y}) scale(${1 / k})`; });
  gSel.selectAll("path").data(selected ? [shapeOf(selected)] : [], d => d.id + (d.detail ? "+" : "")).join("path").attr("class", "selected").attr("d", path);
  // sites du patrimoine mondial du pays ouvert : petits losanges, dorés une fois visités
  gSites.selectAll(".site").data(current ? (sitesBy.get(current) || []).filter(st => regionIn(current, st.lon, st.lat) || st.codes.length === 1) : [], d => d.id).join(
    enter => enter.append("g").attr("class", d => "site" + (d.wonder ? " wonder" : "")).call(g => {
      g.append("circle").attr("r", 14).attr("class", "hit");
      g.append("path").attr("d", d => d.wonder ? STAR : "M0,-7L7,0L0,7L-7,0Z");
    }).on("click", (e, d) => { e.stopPropagation(); selSite = selSite === d.id ? null : d.id; selected = null; update(); })
      .on("pointermove", (e, d) => showTip(e, d.n)).on("pointerleave", () => tip.hidden = true)
  ).attr("transform", siteTransform).classed("visited", d => state.u.has(d.id)).classed("on", d => d.id === selSite)
    .order().raise();
  gSites.selectAll(".wonder").raise();
  drawRoute();
  drawFlights();
  drawPins();
}

function drawRoute() {
  const plan = routePlan && state.plans.find(p => p.id === routePlan);
  const idx = plan ? plan.stops.map((id, i) => i).filter(i => place(plan.stops[i])) : [];
  const pts = idx.map(i => centroid(plan.stops[i]));
  gRoute.style("--trip", plan ? plan.color : null);
  gRoute.selectAll(".route").data(idx.slice(1).map((i, j) => [pts[j], pts[j + 1], legMode(plan, i), legInfo(plan, i).road])).join("path")
    .attr("class", d => "route m-" + d[2]).attr("d", d => d[3] ? path({ type: "LineString", coordinates: d[3] }) : legPath(projection(d[0]), projection(d[1]), d[2]));
  const g = gRoute.selectAll(".stop").data(pts).join(enter => {
    const s = enter.append("g").attr("class", "stop");
    s.append("circle"); s.append("text");
    return s;
  });
  g.attr("transform", d => { const [x, y] = projection(d); return `translate(${x},${y})`; });
  g.select("text").text((d, i) => i + 1);
  sizeStops();
}
function sizeStops() {
  gRoute.selectAll(".stop circle").attr("r", 10 / k);
  gRoute.selectAll(".stop text").style("font-size", 11 / k + "px");
}

/* ---------- Villes ---------- */
// GeoNames (CC BY 4.0) : villes de plus de 10 000 habitants, triées de la plus peuplée à la moins peuplée
let cities = [];
// Les 7 merveilles du monde moderne (New7Wonders, 2007) et la pyramide de Gizeh, merveille honoraire.
// Elles sont ajoutées à la liste des sites, avec leur nom français et une étoile sur la carte.
const WONDERS = [
  { id: "w-muraille", n: "Grande Muraille de Chine", lon: 117.236, lat: 40.431, codes: ["CHN"], wiki: "Grande Muraille" },
  { id: "w-petra", n: "Petra", lon: 35.441, lat: 30.329, codes: ["JOR"], wiki: "Pétra (Jordanie)" },
  { id: "w-christ", n: "Christ Rédempteur", lon: -43.211, lat: -22.952, codes: ["BRA"], wiki: "Christ Rédempteur (Rio de Janeiro)" },
  { id: "w-machu", n: "Machu Picchu", lon: -72.545, lat: -13.163, codes: ["PER"], wiki: "Machu Picchu" },
  { id: "w-chichen", n: "Chichén Itzá", lon: -88.569, lat: 20.683, codes: ["MEX"], wiki: "Chichén Itzá" },
  { id: "w-colisee", n: "Colisée", lon: 12.492, lat: 41.890, codes: ["ITA"], wiki: "Colisée" },
  { id: "w-taj", n: "Taj Mahal", lon: 78.042, lat: 27.175, codes: ["IND"], wiki: "Taj Mahal" },
  { id: "w-gizeh", n: "Pyramide de Khéops", lon: 31.134, lat: 29.979, codes: ["EGY"], wiki: "Pyramide de Khéops", hon: true }
];
// pays où se trouve le point du site (un site transfrontalier est listé dans plusieurs pays)
const short = (t, n = 48) => t.length > n ? t.slice(0, n - 1).replace(/[\s,;–-]+\S*$/, "") + "…" : t;
const siteHome = st => st.codes.find(c => regionIn(c, st.lon, st.lat)) || st.codes[0];
async function loadSites() {
  const [list, iso] = await Promise.all([fetch(dataUrl("unesco.json")).then(r => r.json()), fetch(dataUrl("iso2.json")).then(r => r.json())]);
  iso2 = iso;
  sites = list.map(([id, n, lon, lat, cat, year, codes]) => ({ id: String(id), n, lon, lat, cat, year, codes, key: norm(n) }));
  for (const w of WONDERS) sites.push({ ...w, cat: "c", year: 2007, wonder: true, key: norm(w.n) });
  for (const st of sites) {
    siteById.set(st.id, st);
    for (const c of st.codes) { if (!sitesBy.has(c)) sitesBy.set(c, []); sitesBy.get(c).push(st); }
  }
  frenchSiteNames();
  update();
}
// Noms français des sites UNESCO : Wikidata (identifiant P757), demandés une fois puis gardés 30 jours.
// Sans réseau, les noms anglais de la liste restent ; ils restent aussi cherchables.
const FR_KEY = "explora-sites-fr-2";
// quelques sites dont Wikidata garde le nom local
const FR_FIX = { 395: "Place des Miracles, Pise", 1349: "Canaux d'Amsterdam", 616: "Centre historique de Prague", 320: "Œuvres d'Antoni Gaudí" };
function applyFrNames(m) {
  for (const st of sites) {
    const fr = !st.wonder && (m[st.id] || (FR_FIX[st.id] && [FR_FIX[st.id]]));
    if (!fr) continue;
    st.en = st.en || st.n;
    st.n = cap(FR_FIX[st.id] || fr[0]);
    if (fr[1]) st.wiki = fr[1];
    st.key = norm(st.n) + "|" + norm(st.en);
  }
}
async function frenchSiteNames() {
  let saved = null;
  try { localStorage.removeItem("explora-sites-fr"); saved = JSON.parse(localStorage.getItem(FR_KEY)); } catch (e) {}
  applyFrNames(saved?.m || {});
  if (saved && Date.now() - saved.t < 30 * 864e5) return;
  // les identifiants « 320bis », « 616ter »… désignent le même site agrandi
  const q = `SELECT ?id ?l ?t WHERE { ?s wdt:P757 ?id .
    OPTIONAL { ?s rdfs:label ?l . FILTER(LANG(?l) = "fr") }
    OPTIONAL { ?a schema:about ?s ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?t } }`;
  try {
    const d = await fetch("https://query.wikidata.org/sparql?" + new URLSearchParams({ format: "json", query: q })).then(r => r.json());
    const m = {};
    for (const b of d.results.bindings) {
      const id = b.id.value.match(/^(\d+)(bis|ter|quater)?$/i)?.[1];
      const name = b.l?.value || b.t?.value.replace(/ \(.*\)$/, "");
      if (!id || !name) continue;
      const exact = b.id.value === id;
      if (!m[id] || (exact && !m[id].exact)) m[id] = Object.assign(b.t ? [name, b.t.value] : [name], { exact });
    }
    if (Object.keys(m).length < 500) return;
    applyFrNames(m);
    try { localStorage.setItem(FR_KEY, JSON.stringify({ t: Date.now(), m })); } catch (e) {}
    update();
  } catch (e) {}
}
async function loadCities() {
  const d = await fetch(dataUrl("cities.json")).then(r => r.json());
  cities = d.cities.map(([n, lon, lat, pop, ci, alt]) => ({ n, lon, lat, pop, code: d.countries[ci], key: norm(n), alt: alt ? norm(alt) : "" }));
  drawCities();
}
// noms des océans, discrets, à taille constante ; ils s'effacent quand on zoome sur un pays
const OCEANS = [["Atlantique", -44, 27], ["Atlantique", -14, -22], ["Pacifique", -135, 5], ["Pacifique", 170, 20],
  ["Indien", 78, -22], ["Austral", 20, -60]];
const oceanTransform = d => { const [x, y] = projection([d[1], d[2]]); return `translate(${x},${y}) scale(${1 / k})`; };
const STAR = (() => {
  let d = "";
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.2 : 10;
    d += (i ? "L" : "M") + (Math.cos(a) * r).toFixed(2) + "," + (Math.sin(a) * r).toFixed(2); }
  return d + "Z";
})();
const siteTransform = d => { const [x, y] = projection([d.lon, d.lat]); return `translate(${x},${y}) scale(${1 / k})`; };
const cityTransform = d => `translate(${d.px},${d.py}) scale(${1 / k})`;
function drawCities() {
  if (!cities.length || tab !== "map" || !W) return;
  const t = d3.zoomTransform(svg.node());
  // en milliers d'habitants : seules les très grandes villes de loin, les plus petites en zoomant fort
  const minPop = Math.max(10, 8000 / Math.pow(t.k, 1.3));
  const topH = document.querySelector(".top").offsetHeight + 6;
  const boxes = [], shown = [];
  for (const c of cities) {
    if (c.pop < minPop) break;
    if (current && c.code !== current) continue; // dans un pays, on ne nomme que ses villes
    const p = projection([c.lon, c.lat]);
    const x = t.applyX(p[0]), y = t.applyY(p[1]);
    if (x < 0 || y < topH || x > W || y > H) continue;
    // marge large autour de chaque nom pour garder la carte aérée
    const b = [x - 30, y - 22, x + c.n.length * 5.6 + 36, y + 22];
    if (boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
    boxes.push(b);
    c.px = p[0]; c.py = p[1];
    shown.push(c);
    if (shown.length >= 18) break;
  }
  gCities.selectAll(".city").data(shown, d => d.n + d.lon).join(enter => {
    const g = enter.append("g").attr("class", "city");
    g.append("circle").attr("r", 1.8);
    g.append("text").attr("x", 4.5).attr("dy", "0.35em").text(d => d.n);
    return g;
  }).attr("transform", cityTransform);
}
function regionIn(code, lon, lat) {
  return (regionsBy.get(code) || []).find(r => d3.geoContains(r, [lon, lat])) || null;
}
// village au bord de la côte simplifiée : la région la plus proche
function regionNear(code, lon, lat) {
  return regionIn(code, lon, lat) || d3.least(regionsBy.get(code) || [], r => d3.geoDistance(d3.geoCentroid(r), [lon, lat])) || null;
}
function countryAt(lon, lat) {
  return countries.find(f => d3.geoContains(f, [lon, lat])) || null;
}
// Petites villes et villages (moins de 10 000 habitants) : seulement pour la recherche, chargés à la première recherche
let towns = [], townsP = null;
function ensureTowns() {
  return townsP ||= fetch(dataUrl("towns.json")).then(r => r.json()).then(d => {
    towns = d.towns.map(([n, lon, lat, ci]) => ({ n, lon, lat, pop: 0, code: d.countries[ci], key: norm(n), alt: "" }));
  }).catch(() => { townsP = null; });
}
// Tout le reste (hameaux, lieux-dits…) : recherche en ligne dans OpenStreetMap (Photon), quand la liste locale est courte
const PLACE_KINDS = new Set(["city", "town", "village", "hamlet", "suburb", "locality", "isolated_dwelling", "island", "islet", "neighbourhood", "quarter", "oasis"]);
const onlineCache = new Map();
async function onlinePlaces(q) {
  if (onlineCache.has(q)) return onlineCache.get(q);
  const url = "https://photon.komoot.io/api/?limit=10&lang=fr&osm_tag=place&q=" + encodeURIComponent(q);
  const d = await fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!d) return [];
  const out = [];
  for (const f of d.features || []) {
    const p = f.properties || {};
    if (!PLACE_KINDS.has(p.osm_value) || !p.name) continue;
    const [lon, lat] = f.geometry.coordinates;
    const ctry = countryAt(lon, lat);
    if (!ctry) continue;
    out.push({ n: p.name, lon: +lon.toFixed(3), lat: +lat.toFixed(3), pop: 0, code: ctry.id, key: norm(p.name), alt: "" });
  }
  if (onlineCache.size > 200) onlineCache.clear();
  onlineCache.set(q, out);
  return out;
}

function drawMe() {
  const pts = me ? [projection([me.lon, me.lat])] : [];
  gMe.selectAll(".me-halo").data(pts).join("circle").attr("class", "me-halo").attr("cx", d => d[0]).attr("cy", d => d[1]).attr("r", 16 / k);
  gMe.selectAll(".me-dot").data(pts).join("circle").attr("class", "me-dot").attr("cx", d => d[0]).attr("cy", d => d[1]).attr("r", 6 / k);
}

function showTip(e, text) {
  if (e.pointerType !== "mouse") return;
  const r = svg.node().getBoundingClientRect();
  tip.textContent = text; tip.hidden = false;
  tip.style.left = (e.clientX - r.left) + "px"; tip.style.top = (e.clientY - r.top) + "px";
}

function fitBounds([[x0, y0], [x1, y1]], dur = 650, pad = .9) {
  gCities.selectAll("*").remove(); // les noms reviennent à la fin du zoom, adaptés au nouveau cadrage
  const topH = document.querySelector(".top").offsetHeight + 10;
  const sheetH = document.querySelector(".sheet .card").offsetHeight + 24;
  const availH = Math.max(140, H - sheetH - topH);
  const s = Math.max(1, Math.min(600, pad / Math.max((x1 - x0) / W, (y1 - y0) / availH, 1e-6)));
  const t = d3.zoomIdentity.translate(W / 2, topH + availH / 2).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  svg.interrupt().transition().duration(reduceMotion() ? 0 : dur).ease(d3.easeCubicOut).call(zoom.transform, t);
}
const zoomTo = (feature, dur) => fitBounds(path.bounds(feature), dur);
function zoomNation(k) {
  const uk = detailOf("GBR")?.nations || ukWorld, sh = uk && uk.shapes.find(x => x.k === k);
  if (sh) zoomTo(sh.shape);
}

// Vue d'accueil : en portrait, le monde entier tient dans une bande trop fine.
// On agrandit pour remplir la hauteur libre, centré sur l'Europe et l'Afrique ; on peut toujours dézoomer.
let landY = null;
function homeTransform() {
  if (!landY) { const b = path.bounds({ type: "FeatureCollection", features: REAL ? countries.filter(f => d3.geoCentroid(f)[1] > -60) : countries }); landY = [b[0][1], b[1][1]]; }
  const topH = document.querySelector(".top").offsetHeight + 6;
  const sheetH = document.querySelector(".sheet .card").offsetHeight + 18;
  const availH = Math.max(140, H - sheetH - topH);
  const s = Math.max(1, Math.min(1.9, availH / (landY[1] - landY[0])));
  if (s === 1) return d3.zoomIdentity;
  const cx = projection([2, 0])[0], cy = (landY[0] + landY[1]) / 2;
  return d3.zoomIdentity.translate(W / 2, topH + availH / 2).scale(s).translate(-cx, -cy);
}
const goHome = (dur = 0) => svg.interrupt().transition().duration(reduceMotion() ? 0 : dur).ease(d3.easeCubicOut).call(zoom.transform, homeTransform());

function openCountry(code, regionId = null, focus = false) {
  if (code !== current) { colorOpen = false; selSite = null; sheetMonth = ""; }
  current = code;
  selected = regionId;
  routePlan = null;
  update();
  // une ville cherchée : on cadre sa région, sinon le pays entier
  zoomTo(focus && regionId ? regionById.get(regionId) : byId.get(code).main);
  ensureDetail(code).then(d => { if (d && current === code) drawMap(); });
  for (const n of neighbors.get(code) || []) ensureDetail(n).then(d => { if (d && current === code) drawMap(); });
}
function openWorld() {
  current = null; selected = null; selSite = null;
  update();
  gCities.selectAll("*").remove();
  goHome(650);
}
function showRoute(id) {
  const plan = state.plans.find(p => p.id === id);
  if (!plan) return;
  showTab("map");
  current = null; selected = null; routePlan = id;
  update();
  const pts = plan.stops.filter(place).map(id => projection(centroid(id)));
  if (!pts.length) { svg.call(zoom.transform, homeTransform()); return; }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const pad = 30;
  fitBounds([[d3.min(xs) - pad, d3.min(ys) - pad], [d3.max(xs) + pad, d3.max(ys) + pad]], 650, pts.length > 1 ? .85 : .1);
}
svg.on("click", () => { if (selected || selSite) { selected = null; selSite = null; update(); } else if (current) openWorld(); });
$("btn-world").onclick = () => { routePlan = null; openWorld(); };

/* ---------- Marquage ---------- */
function tapRegion(r) {
  selSite = null;
  if (quick && !VIEW) { toggleRegion(r.id); selected = r.id; update(); return; }
  selected = selected === r.id ? null : r.id;
  update();
}
function setRegion(id, on, ts = 0) {
  const r = regionById.get(id);
  if (!r) return;
  if (on) {
    state.r.set(id, state.r.get(id) || ts);
    if (!state.c.has(r.code)) state.c.set(r.code, ts);
    state.w.delete(id);
  } else state.r.delete(id);
  save();
}
// un site visité implique la région et le pays où il se trouve
function toggleSite(id) {
  const st = siteById.get(id);
  if (state.u.has(id)) { state.u.delete(id); save(); toast(short(st.n) + " retiré", 1300); return; }
  state.u.set(id, 0);
  const r = st.codes.map(c => regionIn(c, st.lon, st.lat)).find(Boolean);
  if (r) setRegion(r.id, true); else if (st.codes.length === 1) setCountry(st.codes[0], true);
  save();
  toast(short(st.n) + " ajouté à ta carte ✓", 1500);
}
function toggleRegion(id) {
  const on = !state.r.has(id);
  setRegion(id, on);
  const r = regionById.get(id);
  toast(on ? r.properties.n + " ajouté à ta carte ✓" : r.properties.n + " retiré", 1300);
}
// date d'une visite à partir d'un champ mois (« 2024-03 ») ; vide = date inconnue
function monthTs(value) {
  const [y, m] = (value || "").split("-").map(Number);
  return y && m ? new Date(y, m - 1, 15, 12).getTime() : 0;
}
// Choix du mois dans une petite fenêtre : sur iPhone, le champ « mois » natif enregistre
// le mois en cours dès qu'on le touche, d'où des dates choisies sans le vouloir.
const monthLabel = v => { const [y, m] = (v || "").split("-").map(Number); return y && m ? `${MONTHS[m - 1]} ${y}` : ""; };
const monthBtn = (attrs, v, empty = "Ajouter une date") =>
  `<button type="button" class="month-btn ${v ? "" : "empty"}" ${attrs} data-v="${v}">${v ? monthLabel(v) : empty}</button>`;
function pickMonth(v, title = "Date de visite") {
  return new Promise(done => {
    const now = new Date();
    const [y0, m0] = v ? v.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
    const back = document.createElement("div");
    back.className = "mp-back";
    back.innerHTML = `<div class="card mp" role="dialog" aria-label="${esc(title)}">
      <h3>${esc(title)}</h3>
      <div class="two">
        <select id="mp-m" aria-label="Mois">${MONTHS.map((n, i) => `<option value="${i + 1}" ${i + 1 === m0 ? "selected" : ""}>${cap(n)}</option>`).join("")}</select>
        <select id="mp-y" aria-label="Année">${d3.range(now.getFullYear(), 1939, -1).map(y => `<option ${y === y0 ? "selected" : ""}>${y}</option>`).join("")}</select>
      </div>
      <div class="btns">
        <button class="btn primary" data-mp="ok">Enregistrer</button>
        ${v ? `<button class="btn" data-mp="none">Effacer la date</button>` : ""}
        <button class="btn" data-mp="cancel">Annuler</button>
      </div></div>`;
    document.body.append(back);
    const close = r => { back.remove(); done(r); };
    back.onclick = e => { if (e.target === back) close(null); };
    back.querySelectorAll("[data-mp]").forEach(b => b.onclick = () => {
      if (b.dataset.mp === "cancel") return close(null);
      if (b.dataset.mp === "none") return close("");
      let y = +$("mp-y").value, m = +$("mp-m").value;
      // pas de date dans le futur
      if (y === now.getFullYear() && m > now.getMonth() + 1) m = now.getMonth() + 1;
      close(y + "-" + String(m).padStart(2, "0"));
    });
  });
}
// Même principe pour un jour (dates d'un trip)
const isoDay = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
// Calendrier du trip : on touche le jour du départ, puis celui du retour.
// Les flèches changent de mois, et le titre ouvre le choix du mois et de l'année (sans limite).
function pickDates(start, end, toEnd, nights, single = false) {
  return new Promise(done => {
    let s = start || "", e = end || "", phase = toEnd && s ? "end" : "start";
    let view = new Date((toEnd && (e || s) || s || isoDay(new Date())) + "T12:00");
    view.setDate(1);
    let years = false;
    const back = document.createElement("div");
    back.className = "mp-back";
    if (single) back.style.zIndex = 90; // au-dessus des fiches
    if (editPlan?.color) back.style.setProperty("--trip", editPlan.color);
    document.body.append(back);
    const close = r => { back.remove(); done(r); };
    const nf = n => n + (n > 1 ? " nuits" : " nuit");
    const draw = () => {
      const y = view.getFullYear(), m = view.getMonth();
      const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      const today = isoDay(new Date());
      const n = s && e ? Math.round((new Date(e + "T12:00") - new Date(s + "T12:00")) / 864e5) : 0;
      back.innerHTML = `<div class="card mp cal" role="dialog" aria-label="Dates du trip">
        <div class="cal-sum" ${single ? "hidden" : ""}>
          <button type="button" class="${phase === "start" ? "on" : ""}" data-ph="start"><small>Départ</small>${s ? fmtDate(s) : "—"}</button>
          <button type="button" class="${phase === "end" ? "on" : ""}" data-ph="end"><small>Retour</small>${e ? fmtDate(e) : "—"}</button>
        </div>
        <div class="cal-head">
          <button type="button" class="icon-btn" data-nav="-1" aria-label="${years ? "Année précédente" : "Mois précédent"}">‹</button>
          <button type="button" class="cal-title" data-years>${years ? y : cap(MONTHS[m]) + " " + y} <span>▾</span></button>
          <button type="button" class="icon-btn" data-nav="1" aria-label="${years ? "Année suivante" : "Mois suivant"}">›</button>
        </div>
        ${years ? `<div class="cal-months">${MONTHS.map((mn, k) => `<button type="button" data-month="${k}" class="${k === m ? "on" : ""}">${cap(mn.slice(0, 4))}${mn.length > 4 ? "." : ""}</button>`).join("")}</div>` : `
        <div class="cal-grid">${["L", "M", "M", "J", "V", "S", "D"].map(d => `<b>${d}</b>`).join("")}${"<i></i>".repeat(first)}${d3.range(1, days + 1).map(d => {
          const iso = isoDay(new Date(y, m, d, 12));
          const cls = [iso === s ? "s" : "", iso === e ? "e" : "", s && e && iso > s && iso < e ? "in" : "", iso === today ? "today" : ""].join(" ");
          return `<button type="button" data-day="${iso}" class="${cls}">${d}</button>`; }).join("")}</div>`}
        <p class="small cal-hint">${single ? "Touche le jour" : s && e && phase === "start" ? `${nf(n)} · touche un jour pour changer le départ` : phase === "start" ? "Touche le jour du départ" : "Touche le jour du retour"}${nights && !e && s ? ` · ${nf(nights)} prévues dans l'itinéraire` : ""}</p>
        <div class="btns">
          <button class="btn primary" data-mp="ok">Enregistrer</button>
          ${start || end ? `<button class="btn" data-mp="none">Effacer les dates</button>` : ""}
          <button class="btn" data-mp="cancel">Annuler</button>
        </div></div>`;
    };
    back.onclick = ev => {
      const t = ev.target.closest("button");
      if (ev.target === back) return close(null);
      if (!t) return;
      if (t.dataset.mp === "cancel") return close(null);
      if (t.dataset.mp === "none") return close({ start: "", end: "" });
      if (t.dataset.mp === "ok") return close({ start: s, end: e && s && e < s ? s : e });
      if (t.dataset.ph) phase = t.dataset.ph;
      else if (t.dataset.nav) years ? view.setFullYear(view.getFullYear() + +t.dataset.nav) : view.setMonth(view.getMonth() + +t.dataset.nav);
      else if (t.dataset.years !== undefined) years = !years;
      else if (t.dataset.month) { view.setMonth(+t.dataset.month); years = false; }
      else if (t.dataset.day) {
        const d = t.dataset.day;
        if (single) return close({ start: d, end: "" });
        if (phase === "start" || (s && d < s)) { s = d; if (e && e < s) e = ""; phase = "end"; }
        else { e = d; phase = "start"; }
      }
      draw();
    };
    draw();
  });
}
function setVisitMonth(code, value) {
  if (!state.c.has(code)) return;
  state.c.set(code, monthTs(value));
  save();
}
function setCountry(code, on, ts = 0) {
  if (on) { state.c.set(code, state.c.get(code) || ts); state.w.delete(code); }
  else { state.c.delete(code); for (const r of regionsBy.get(code) || []) state.r.delete(r.id); }
  save();
}
function toggleWish(id) {
  if (state.w.has(id)) { state.w.delete(id); toast(placeName(id) + " retiré de tes envies", 1400); }
  else { state.w.set(id, Date.now()); toast(placeName(id) + " ajouté à tes envies ★", 1400); }
  save();
}

/* ---------- Calculs ---------- */
function visitedIn(code) { return (regionsBy.get(code) || []).reduce((n, r) => n + state.r.has(r.id), 0); }
function exploredArea() { let a = 0; for (const id of state.r.keys()) { const r = regionById.get(id); if (r) a += r.area; } return a; }
function worldPct() { return worldArea ? exploredArea() / worldArea * 100 : 0; }
function stats() {
  const conts = new Set(), cont = {};
  let europe = 0, complete = 0;
  for (const id of state.c.keys()) {
    const f = byId.get(id); if (!f) continue;
    const c = f.properties.c;
    if (c !== OCEAN_ISLANDS) conts.add(c);
    cont[c] = (cont[c] || 0) + 1;
    if (c === "Europe") europe++;
    if (f.nreg > 1 && visitedIn(id) === f.nreg) complete++;
  }
  return { n: state.c.size, regions: state.r.size, continents: conts.size, cont, europe, complete, pct: worldPct(), plans: state.plans.length, wish: state.w.size, sites: state.u.size,
    wonders: WONDERS.filter(w => !w.hon && state.u.has(w.id)).length };
}

/* ---------- Badges ---------- */
const BADGES = [
  { m: "1", name: "Premier pas", desc: "1 pays visité", ok: s => s.n >= 1 },
  { m: "5", name: "Voyageur", desc: "5 pays", ok: s => s.n >= 5 },
  { m: "10", name: "Globe-trotter", desc: "10 pays", ok: s => s.n >= 10 },
  { m: "25", name: "Aventurier", desc: "25 pays", ok: s => s.n >= 25 },
  { m: "50", name: "Grand explorateur", desc: "50 pays", ok: s => s.n >= 50 },
  { m: "100", name: "Légende", desc: "100 pays", ok: s => s.n >= 100 },
  { m: "3C", name: "Trois continents", desc: "Pays sur 3 continents", ok: s => s.continents >= 3 },
  { m: "6C", name: "Tour des continents", desc: "Les 6 continents habités", ok: s => s.continents >= 6 },
  { m: "EU", name: "Européen", desc: "10 pays d'Europe", ok: s => s.europe >= 10 },
  { m: "AF", name: "Africain", desc: "5 pays d'Afrique", ok: s => (s.cont.Africa || 0) >= 5 },
  { m: "AS", name: "Asiatique", desc: "5 pays d'Asie", ok: s => (s.cont.Asia || 0) >= 5 },
  { m: "AM", name: "Américain", desc: "5 pays des Amériques", ok: s => (s.cont["North America"] || 0) + (s.cont["South America"] || 0) >= 5 },
  { m: "50R", name: "Arpenteur", desc: "50 régions visitées", ok: s => s.regions >= 50 },
  { m: "200", name: "Cartographe", desc: "200 régions visitées", ok: s => s.regions >= 200 },
  { m: "100%", name: "Grand chelem", desc: "Toutes les régions d'un pays", ok: s => s.complete >= 1 },
  { m: "1%", name: "Un pour cent", desc: "1 % du monde", ok: s => s.pct >= 1 },
  { m: "5%", name: "Bourlingueur", desc: "5 % du monde", ok: s => s.pct >= 5 },
  { m: "10%", name: "Conquérant", desc: "10 % du monde", ok: s => s.pct >= 10 },
  { m: "★", name: "Rêveur", desc: "5 envies notées", ok: s => s.wish >= 5 },
  { m: "✈", name: "Organisateur", desc: "Un projet de voyage", ok: s => s.plans >= 1 },
  { m: "◆", name: "Patrimoine", desc: "1 site UNESCO", ok: s => s.sites >= 1 },
  { m: "◆10", name: "Gardien du patrimoine", desc: "10 sites UNESCO", ok: s => s.sites >= 10 },
  { m: "◆50", name: "Collectionneur", desc: "50 sites UNESCO", ok: s => s.sites >= 50 },
  { m: "★7", name: "Les 7 merveilles", desc: "Les 7 merveilles du monde", ok: s => s.wonders >= 7 }
];

/* ---------- Mise à jour de l'écran ---------- */
function update() {
  if (!countries.length) return;
  drawMap();
  $("m-pct").textContent = fmtPct(worldPct()) + " %";
  $("m-countries").textContent = state.c.size;
  renderSheet();
  if (tab === "progress") renderProgress();
  if (tab === "trips") renderTrips();
  if (tab === "plans") renderPlans();
}

let colorOpen = false; // palette de couleurs ouverte dans la fiche du pays
function renderSheet() {
  const sheet = $("sheet");
  const plan = routePlan && state.plans.find(p => p.id === routePlan);
  if (current) {
    const f = byId.get(current), n = f.nreg, v = visitedIn(current), been = state.c.has(current), wish = state.w.has(current);
    const sel = selected && regionById.get(selected), site = selSite && siteById.get(selSite);
    const selOn = sel && state.r.has(sel.id), selWish = sel && state.w.has(sel.id);
    const one = SINGULAR[f.kind] || "endroit", fem = FEMININE.has(f.kind);
    const un = (fem ? "une " : "un ") + one, le = fem ? "la" : "le";
    // panneau compact : émoticônes ✅ / ⭐ en un appui, date facultative juste en dessous
    sheet.innerHTML = `
      <div class="row cmp">
        <button class="back-ic" id="s-back" aria-label="Retour au monde">←</button>
        <div class="cname grow"><b>${flag(current)} ${esc(f.properties.n)}</b><small>${been && n > 1 ? `<span class="ok">✓ Visité</span> · ` : ""}${v} / ${n} ${esc(n > 1 ? f.kind : one)} visit${fem ? "ée" : "é"}${n > 1 ? "s" : ""}</small></div>
        <button class="qk ${been ? "on" : ""}" id="s-been" aria-pressed="${been}" aria-label="${been ? "Visité (toucher pour retirer)" : "Marquer visité"}"><span>✅</span><small>Visité</small></button>
        ${been ? "" : `<button class="qk wish ${wish ? "on" : ""}" id="s-wish" aria-pressed="${wish}" aria-label="Envie d'y aller"><span>⭐</span><small>Envie</small></button>`}
        ${been || v ? `<button class="kdot" id="s-color" style="--c:${countryColor(current)}" aria-expanded="${colorOpen}" aria-label="Changer la couleur du pays"></button>` : ""}
        <button class="btn small more" id="s-addph" aria-label="Ajouter des photos sur la carte">📷</button>
        <button class="btn small more jr-btn" id="s-journal" aria-label="Photos et journal de voyage">📖${state.j[current]?.entries.length ? `<i>${state.j[current].entries.length}</i>` : ""}</button>
      </div>
      <div class="bar thin"><i style="width:${n ? v / n * 100 : 0}%"></i></div>
      ${current === "GBR" ? `<div class="nations">${["ENG", "SCT", "WLS", "NIR"].map(k => { const rs = (regionsBy.get("GBR") || []).filter(r => nationOf(r.id) === k), vv = rs.filter(r => state.r.has(r.id)).length;
        return `<button class="nation ${vv ? "on" : ""}" data-nation="${k}">${UK_NATIONS[k].f} ${esc(UK_NATIONS[k].n)} <b>${vv}/${rs.length}</b></button>`; }).join("")}</div>` : ""}
      ${colorOpen && (been || v) ? `<div class="kcolors"><span>Choisis sa couleur sur ta carte</span><div class="swatches">${PALETTE.map(c => `<button type="button" class="swatch" data-kc="${c}" style="--c:${c}" aria-label="Couleur ${c}" aria-pressed="${countryColor(current) === c}"></button>`).join("")}</div></div>` : ""}
      ${site ? `
      <div class="pick">
        <div class="name"><b>${esc(site.n)}</b><small>${site.wonder ? (site.hon ? "Merveille honoraire du monde" : "Une des 7 merveilles du monde") : `Patrimoine mondial · ${CAT_IC[site.cat]} ${CAT[site.cat]} · ${site.year}`}${state.u.has(site.id) ? " · visité" : ""}</small></div>
        <button class="btn small ${state.u.has(site.id) ? "done" : "primary"}" id="s-site">${state.u.has(site.id) ? "Retirer" : "Marquer visité"}</button>
      </div>
      <div class="photo" id="s-photo" hidden></div>` : sel ? `
      <div class="pick">
        <div class="name"><b>${esc(sel.properties.n)}</b><small>${nationOf(sel.id) ? esc(UK_NATIONS[nationOf(sel.id)].n) + " · " : ""}${selOn ? (fem ? "Visitée" : "Visité") : selWish ? "Dans tes envies" : (fem ? "Pas encore visitée" : "Pas encore visité")}</small></div>
        ${!selOn ? `<button class="btn small wishbtn" id="s-swish" aria-pressed="${selWish}" aria-label="Envie">${selWish ? "★" : "☆"}</button>` : ""}
        <button class="btn small ${selOn ? "done" : "primary"}" id="s-mark">${selOn ? "Retirer" : "Marquer " + (fem ? "visitée" : "visité")}</button>
      </div>` : askRegions === current && n > 1 && !v && !site ? `
      <div class="pick ask">
        <div class="name"><b>Quel${fem ? "les" : "s"} ${esc(f.kind)} ?</b><small>Touche sur la carte ${fem ? "celles" : "ceux"} où tu es allé.</small></div>
        <button class="btn small" id="s-later">Plus tard</button>
      </div>` : ""}
      <div class="when sm">${been ? "Date de visite" : "Quand ?"} <small>(facultatif)</small> ${monthBtn('id="s-date"', been ? monthValue(state.c.get(current)) : sheetMonth)}</div>`;
    $("s-back").onclick = openWorld;
    sheet.querySelectorAll("[data-nation]").forEach(b => b.onclick = () => zoomNation(b.dataset.nation));
    $("s-journal").onclick = () => journalSheet(current);
    $("s-addph").onclick = addMapPhotos;
    sheet.querySelectorAll("[data-kc]").forEach(b => b.onclick = () => { state.k[current] = b.dataset.kc; colorOpen = false; save(); update(); });
    if ($("s-color")) $("s-color").onclick = () => { colorOpen = !colorOpen; renderSheet(); };
    // la date choisie avant d'appuyer sur « J'y suis allé » est enregistrée avec la visite
    if ($("s-been")) $("s-been").onclick = e => {
      // retirer un pays dont des régions sont cochées : un second toucher confirme
      if (been && v) {
        const b = e.currentTarget;
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.classList.add("armed"); toast(`Touche encore ✅ pour retirer ${f.properties.n} et ses ${v} ${f.kind}`, 2200); setTimeout(() => { delete b.dataset.armed; b.classList.remove("armed"); }, 2500); return; }
      }
      setCountry(current, !been, $("s-date") ? monthTs($("s-date").dataset.v) : 0);
      // une fois le pays marqué, on propose de préciser les régions
      askRegions = !been && n > 1 ? current : null;
      update();
    };
    if ($("s-later")) $("s-later").onclick = () => { askRegions = null; renderSheet(); };
    if ($("s-unbeen")) $("s-unbeen").onclick = () => { if (confirm(`Retirer ${f.properties.n} et toutes ses régions de ta carte ?`)) { setCountry(current, false); update(); } };
    if ($("s-date")) $("s-date").onclick = async () => {
      const v = await pickMonth($("s-date").dataset.v, been ? "Date de visite" : "Quand ?");
      if (v === null) return;
      if (been) setVisitMonth(current, v); else sheetMonth = v;
      renderSheet();
    };
    if ($("s-wish")) $("s-wish").onclick = () => { toggleWish(current); update(); toast(state.w.has(current) ? `⭐ ${f.properties.n} ajouté à tes envies` : "Retiré de tes envies", 1400); };
    if (site) {
      $("s-site").onclick = () => { toggleSite(site.id); update(); };
      showPhoto(site);
    }
    if (sel) $("s-mark").onclick = () => {
      const month = $("s-date") && $("s-date").dataset.v;
      toggleRegion(sel.id);
      if (!been && month && state.c.has(current)) setVisitMonth(current, month);
      update();
    };
    if ($("s-swish")) $("s-swish").onclick = () => { toggleWish(sel.id); update(); };
  } else if (plan) {
    sheet.innerHTML = `
      <div class="row"><h2 class="grow">${esc(plan.name)}</h2><button class="btn small" id="s-close">Fermer</button></div>
      <p class="hint" style="margin-top:4px">${planDates(plan) || plural(plan.stops.length, "étape", "étapes")}</p>
      <ol class="stops">${plan.stops.filter(place).map((id, i) => `
        <li><span class="n">${i + 1}</span><span class="t">${esc(placeName(id))} <small>${esc(placeSub(id))}</small></span>
        ${isVisited(id) ? `<span class="chip new">déjà fait</span>` : ""}</li>`).join("") || `<li class="muted">Aucune étape pour l'instant.</li>`}
      </ol>
      <div class="btns"><button class="btn small" id="s-edit">Modifier le projet</button></div>`;
    $("s-close").onclick = () => { routePlan = null; openWorld(); };
    $("s-edit").onclick = () => { editPlan = copyPlan(plan); tripAdd = null; showTab("plans"); };
  } else if (!state.c.size && !state.w.size) {
    sheet.innerHTML = `
      <h2>Remplis ta carte</h2>
      <p class="hint">Touche un pays pour zoomer dedans, puis choisis les départements, états ou régions où tu es allé.</p>
      <div class="legend"><span><b style="background:var(--fog)"></b>Pas visité</span><span><b style="background:conic-gradient(#ff6b6b, #fcc419, #51cf66, #339af0, #cc5de8, #ff6b6b)"></b>Visité</span><span><b style="background:var(--wish-soft)"></b>Envie</span></div>`;
  } else {
    const n = state.c.size, next = MILESTONES.find(m => m > n) || 195, prev = [...MILESTONES].reverse().find(m => m <= n) || 0;
    sheet.innerHTML = `<div class="welcome">
      <div class="row between"><p class="w-big"><b>${n}</b> pays sur 195</p><p class="w-next">${n < 195 ? `Prochain palier : ${next}` : "Le monde entier !"}</p></div>
      <div class="bar w-bar"><i style="width:${n >= 195 ? 100 : (n - prev) / (next - prev) * 100}%"></i></div>
      <div class="row between"><p class="hint" style="margin:0">Touche un pays pour zoomer dedans.</p>
      <div class="legend" style="margin:0"><span><b style="background:conic-gradient(#ff6b6b, #fcc419, #51cf66, #339af0, #cc5de8, #ff6b6b)"></b>Visité</span><span><b style="background:var(--wish-soft)"></b>Envie</span></div></div></div>`;
  }
  document.documentElement.style.setProperty("--sheet-h", document.querySelector(".sheet .card").offsetHeight + 12 + "px");
}

/* ---------- Onglet Progrès ---------- */
function renderProgress() {
  const s = stats();
  const conts = new Map();
  for (const f of countries) {
    const key = f.properties.c;
    if (!conts.has(key)) conts.set(key, { name: CONTINENT[key] || key, total: 0, seen: 0, countries: 0 });
    const c = conts.get(key);
    c.total += f.area;
    if (state.c.has(f.id)) c.countries++;
  }
  for (const id of state.r.keys()) {
    const r = regionById.get(id), f = r && byId.get(r.code);
    if (f) conts.get(f.properties.c).seen += r.area;
  }
  const contList = [...conts.values()].sort((a, b) => b.seen / b.total - a.seen / a.total || b.countries - a.countries);
  const next = MILESTONES.find(m => m > s.n);
  const top = [...state.c.keys()].map(id => byId.get(id)).filter(f => f && f.nreg > 1)
    .map(f => ({ f, v: visitedIn(f.id) })).sort((a, b) => b.v / b.f.nreg - a.v / a.f.nreg).slice(0, 6);
  const C = 2 * Math.PI * 52, ring = Math.max(s.n > 0 ? 2 : 0, Math.min(100, s.n / WORLD_COUNTRIES * 100) / 100 * C);
  const got = BADGES.filter(b => b.ok(s));
  // badges débloqués d'abord, puis les suivants à viser
  const badges = [...got, ...BADGES.filter(b => !b.ok(s))];

  $("progress").innerHTML = `
    <div class="row between"><h1>Mon exploration</h1><span class="row" style="gap:6px"><button class="btn small primary" id="btn-link">🔗 Ma carte</button><button class="btn small" id="btn-share">Image</button></span></div>
    <div class="block hero">
      <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" r="52"/>
        <circle class="val" cx="60" cy="60" r="52" stroke-dasharray="${ring} ${C}"/>
        <text x="60" y="54">${Math.round(s.n / WORLD_COUNTRIES * 100)} %</text><text class="sub" x="60" y="78">des pays</text>
      </svg>
      <div>
        <div class="big">${fmtPct(s.pct)}<small> %</small></div>
        <div class="muted">du monde visité</div>
      </div>
    </div>
    <div class="tiles">
      <div class="tile"><b>${s.n}</b><span>pays sur ${WORLD_COUNTRIES}</span></div>
      <div class="tile"><b>${s.regions}</b><span>régions</span></div>
      <div class="tile"><b>${s.continents}</b><span>continents sur 6</span></div>
    </div>
    ${sites.length ? `
    <div class="block">
      <h3>Les 7 merveilles du monde</h3>
      <div class="wonders">${WONDERS.map(w => `
        <button class="wonder-row ${state.u.has(w.id) ? "on" : ""}" data-site="${w.id}">
          <span class="st">${state.u.has(w.id) ? "★" : "☆"}</span>
          <span class="t"><b>${esc(w.n)}</b><small>${flag(w.codes[0])} ${esc(byId.get(w.codes[0])?.properties.n || "")}${w.hon ? " · honoraire" : ""}</small></span>
        </button>`).join("")}
      </div>
    </div>` : ""}
    ${sites.length ? (() => {
      const seen = sites.filter(st => state.u.has(st.id) && !st.wonder);
      const all = sites.filter(st => !st.wonder);
      const byCat = ["c", "n", "m"].map(c => [c, seen.filter(st => st.cat === c).length, all.filter(st => st.cat === c).length]);
      return `
    <div class="block">
      <h3>Patrimoine mondial UNESCO</h3>
      <div class="row between" style="margin-bottom:6px"><span><b class="num">${seen.length}</b> sites visités</span><span class="num muted">sur ${all.length}</span></div>
      <div class="bar"><i style="width:${Math.max(seen.length ? 1 : 0, seen.length / all.length * 100)}%"></i></div>
      <div class="tiles" style="margin-top:12px">${byCat.map(([c, v, t]) => `<div class="tile cat-${c}"><b>${v}<small> / ${t}</small></b><span>${CAT_IC[c]} ${cap(CAT[c])}${v > 1 ? "s" : ""}</span></div>`).join("")}</div>
      ${seen.length ? byCat.filter(([, v]) => v).map(([c, v]) => `
      <h4 class="cat-h cat-${c}">${CAT_IC[c]} ${cap(CAT[c])}${v > 1 ? "s" : ""} · ${v}</h4>
      <ul class="sites">${seen.filter(st => st.cat === c).map(st => `<li><button data-site="${st.id}">${flag(siteHome(st))} ${esc(st.n)}</button></li>`).join("")}</ul>`).join("")
        : `<p class="small" style="margin:10px 0 0">Ouvre un pays sur la carte : ses sites du patrimoine mondial apparaissent en losanges ◆. Touche-en un pour le marquer.</p>`}
    </div>`; })() : ""}
    <div class="block goal">
      <div class="medal">${next || "★"}</div>
      <p>${next ? `Prochain palier : <b>${next} pays</b>. Encore ${next - s.n} pays à découvrir.` : "Tu as visité tous les pays du monde. Chapeau !"}</p>
    </div>
    <div class="block">
      <h3>Badges · ${got.length} / ${BADGES.length}</h3>
      <div class="badges">${badges.map(b => `
        <div class="badge ${b.ok(s) ? "on" : ""}"><div class="medal">${esc(b.m)}</div><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join("")}
      </div>
    </div>
    <div class="block">
      <h3>Par continent</h3>
      <div class="rows">${contList.map(c => `
        <div class="r">
          <div class="row between"><span>${esc(c.name)}</span><span class="num">${c.countries} pays · ${fmtPct(c.total ? c.seen / c.total * 100 : 0)} %</span></div>
          <div class="bar"><i style="width:${c.total ? Math.min(100, c.seen / c.total * 100) : 0}%"></i></div>
        </div>`).join("")}
      </div>
    </div>
    ${top.length ? `
    <div class="block">
      <h3>Pays les plus complets</h3>
      <div class="rows">${top.map(({ f, v }) => `
        <button class="r" data-open="${f.id}">
          <div class="row between"><span>${flag(f.id)} ${esc(f.properties.n)}</span><span class="num">${v} / ${f.nreg} ${esc(f.kind)}</span></div>
          <div class="bar"><i style="width:${v / f.nreg * 100}%"></i></div>
        </button>`).join("")}
      </div>
    </div>` : ""}`;
  $("progress").querySelectorAll("[data-open]").forEach(b => b.onclick = () => { showTab("map"); openCountry(b.dataset.open); });
  $("progress").querySelectorAll("[data-site]").forEach(b => b.onclick = () => {
    const st = siteById.get(b.dataset.site);
    showTab("map"); openCountry(siteHome(st)); selSite = st.id; update();
  });
  $("btn-share").onclick = shareImage;
  $("btn-link").onclick = shareLink;
}

/* ---------- Photo d'un site (Wikipédia) ---------- */
// Chargée au besoin depuis Wikipédia, puis gardée en mémoire. Sans connexion, la carte reste sans photo.
const photos = new Map();
async function fetchPhoto(site) {
  if (photos.has(site.id)) return photos.get(site.id);
  const p = (async () => {
    const lang = site.lang || (site.wiki ? "fr" : "en");
    const api = params => fetch(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", ...params })}`).then(r => r.json());
    const want = { action: "query", prop: "pageimages|info", piprop: "thumbnail", pithumbsize: "800", inprop: "url" };
    let d = site.wiki ? await api({ ...want, titles: site.wiki }) : await api({ ...want, generator: "search", gsrsearch: site.q || site.en || site.n, gsrlimit: "1" });
    let page = Object.values(d.query?.pages || {})[0];
    if (!page?.thumbnail && !site.wiki) { // repli : recherche sur le début du nom
      d = await api({ ...want, generator: "search", gsrsearch: (site.en || site.n).split(/[,(:–]/)[0], gsrlimit: "1" });
      page = Object.values(d.query?.pages || {})[0];
    }
    if (!page || page.missing !== undefined) return null;
    // les autres photos de l'article : seulement des JPEG assez grands (pas de logos, cartes ni drapeaux)
    const imgs = await api({ action: "query", titles: page.title, generator: "images", gimlimit: "40",
      prop: "imageinfo", iiprop: "url|mime|size", iiurlwidth: "800" }).catch(() => ({}));
    const list = Object.values(imgs.query?.pages || {})
      .map(x => x.imageinfo?.[0]).filter(i => i && i.mime === "image/jpeg" && i.width >= 600 && i.height >= 400)
      .map(i => i.thumburl);
    const first = page.thumbnail?.source;
    const all = [...new Set([first, ...list].filter(Boolean))].slice(0, 10);
    return all.length ? { list: all, url: page.fullurl, title: page.title } : null;
  })().catch(() => null);
  photos.set(site.id, p);
  return p;
}
async function showPhoto(site) {
  const box = $("s-photo");
  if (!box) return;
  const photo = await fetchPhoto(site);
  if (!photo || selSite !== site.id || $("s-photo") !== box) return;
  const many = photo.list.length > 1;
  box.innerHTML = `<div class="slides">${photo.list.map((src, i) => `<img src="${esc(src)}" alt="${esc(site.n)} (${i + 1})" loading="${i ? "lazy" : "eager"}">`).join("")}</div>
    ${many ? `<div class="dots">${photo.list.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
    <a href="${esc(photo.url)}" target="_blank" rel="noopener">Photos : Wikipédia · ${esc(photo.title)}</a>`;
  box.hidden = false;
  const slides = box.querySelector(".slides");
  slides.querySelectorAll("img").forEach(img => img.onerror = () => { img.remove(); if (!slides.children.length) box.hidden = true; });
  if (many) slides.onscroll = () => {
    const i = Math.round(slides.scrollLeft / slides.clientWidth);
    box.querySelectorAll(".dots i").forEach((d, j) => d.classList.toggle("on", i === j));
  };
  document.documentElement.style.setProperty("--sheet-h", document.querySelector(".sheet .card").offsetHeight + 12 + "px");
}

/* ---------- Journal de voyage (un par pays) ---------- */
// Photos personnelles : réduites puis gardées sur l'appareil (IndexedDB), jamais envoyées ailleurs
const photoDB = (() => {
  let p = null;
  return () => p ||= new Promise((res, rej) => {
    const r = indexedDB.open("explora-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("p");
    r.onsuccess = () => res(r.result);
    r.onerror = () => { p = null; rej(r.error); };
  });
})();
const idb = async (mode, fn) => {
  const db = await photoDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("p", mode), req = fn(tx.objectStore("p"));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = () => rej(tx.error);
  });
};
const photoURLs = new Map();
async function photoURL(id) {
  if (photoURLs.has(id)) return photoURLs.get(id);
  const blob = await idb("readonly", st => st.get(id)).catch(() => null);
  const url = blob ? URL.createObjectURL(blob) : "";
  photoURLs.set(id, url);
  return url;
}
async function shrinkPhoto(file, max = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(res, "image/jpeg", .82));
  } finally { URL.revokeObjectURL(url); }
}
async function addPhotos(files) {
  try { navigator.storage?.persist?.(); } catch (e) {}
  const ids = [];
  for (const f of files) {
    const blob = await shrinkPhoto(f).catch(() => null);
    if (!blob) continue;
    const id = "ph" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await idb("readwrite", st => st.put(blob, id));
    ids.push(id);
  }
  return ids;
}
const dropPhotos = ids => ids.forEach(id => { idb("readwrite", st => st.delete(id)).catch(() => {}); const u = photoURLs.get(id); if (u) URL.revokeObjectURL(u); photoURLs.delete(id); });
// remplit les <img data-ph="id"> d'un bloc avec les photos de l'appareil
function fillPhotos(box) {
  box.querySelectorAll("img[data-ph]").forEach(async img => { const u = await photoURL(img.dataset.ph); if (u) img.src = u; else img.remove(); });
}
const journalOf = code => state.j[code] || { cover: "", entries: [] };
// souvenirs et photos de la carte, c'est la même chose : chaque photo d'un souvenir est aussi posée sur la carte
function pinJournalPhotos(code, phs, loc, day) {
  const have = new Set(state.p.map(p => p.ph)), add = [];
  for (const ph of phs) {
    if (have.has(ph)) continue;
    const at = loc?.[ph];
    let lon, lat;
    if (at) ({ lon, lat } = at);
    else {
      const r = selected && regionById.get(selected), spot = r && placeCountry(selected) === code ? r : byId.get(code).main;
      [lon, lat] = d3.geoCentroid(spot);
    }
    add.push({ id: ph, ph, lon, lat, d: at?.d || day || "", c: code });
  }
  if (add.length) { state.p.push(...cleanPins(add)); drawPins(); }
  return add.length > 0;
}
// retirer une photo l'enlève partout : carte, souvenirs et téléphone
function unpinPhotos(phs) {
  if (!phs.length) return;
  const gone = new Set(phs);
  state.p = state.p.filter(p => !gone.has(p.ph));
  for (const j of Object.values(state.j)) {
    for (const e of j.entries) e.ph = e.ph.filter(x => !gone.has(x));
    if (gone.has(j.cover)) j.cover = "";
  }
  dropPhotos(phs);
  drawPins();
}
function journalSheet(code) {
  document.querySelector(".ss-back")?.remove();
  const f = byId.get(code), name = f.properties.n;
  const back = document.createElement("div");
  back.className = "mp-back ss-back";
  back.style.setProperty("--trip", countryColor(code) || "var(--found)");
  document.body.append(back);
  let edit = null; // entrée en cours d'écriture (copie)
  const persist = () => {
    const j = journalOf(code);
    if (j.entries.length || j.cover) state.j[code] = j; else delete state.j[code];
    save();
  };
  const close = () => { if (edit) dropPhotos(edit.added || []); back.remove(); update(); };
  if (journalOf(code).entries.some(e => pinJournalPhotos(code, e.ph, null, e.d))) { save(); drawPins(); }
  const draw = () => {
    const j = journalOf(code);
    const mine = j.entries.flatMap(e => e.ph);
    // les photos posées sur la carte dans ce pays font aussi partie du journal
    const onMap = state.p.filter(p => pinIn(p) === code).sort((a, b) => (b.d || "").localeCompare(a.d || ""));
    const allPh = [...new Set([...mine, ...onMap.map(p => p.ph)])];
    const cover = j.cover && allPh.includes(j.cover) ? j.cover : allPh[0];
    const been = state.c.get(code), n = f.nreg, v = visitedIn(code);
    const list = [...j.entries].sort((a, b) => (b.d || "").localeCompare(a.d || ""));
    back.innerHTML = `<div class="card ss jr" role="dialog" aria-label="Journal : ${esc(name)}">
      <button class="icon-btn ss-x" data-j="close" aria-label="Fermer">✕</button>
      ${cover ? `<div class="jr-cover"><img data-ph="${cover}" alt=""><div class="jr-title"><b>${flag(code)} ${esc(name)}</b><small>Mon journal de voyage</small></div></div>`
        : ""}
      <div class="ss-in">
        ${cover ? "" : `<div class="ss-head"><span class="n">${flag(code) || "•"}</span><span class="t"><b>${esc(name)}</b><small>Mon journal de voyage</small></span></div>`}
        <div class="jr-stats">
          <span><b>${been !== undefined ? (been ? esc(monthLabel(monthValue(been))) || "Visité" : "Visité") : "Pas encore visité"}</b><small>${been !== undefined ? "visite" : "à découvrir"}</small></span>
          ${n > 1 ? `<span><b>${v} / ${n}</b><small>${esc(f.kind)}</small></span>` : ""}
          <span><b>${j.entries.length}</b><small>${j.entries.length > 1 ? "souvenirs" : "souvenir"}</small></span>
          <span><b>${allPh.length}</b><small>photo${allPh.length > 1 ? "s" : ""}</small></span>
        </div>
        ${onMap.length && !edit ? `<div class="jr-map"><small>📷 Toutes mes photos dans ce pays</small><div class="jr-strip">${onMap.map((p, i) => `<button type="button" data-mapph="${i}"><img data-ph="${p.ph}" alt=""></button>`).join("")}</div></div>` : ""}
        ${edit ? editor(edit) : `<button class="btn primary jr-new" data-j="new">＋ Écrire un souvenir</button>`}
        ${!edit && !list.length ? `<p class="small jr-empty">Raconte ton voyage : un moment fort, une adresse, une rencontre… avec tes photos. Tout reste sur ton téléphone.</p>` : ""}
        <div class="jr-list">${edit ? "" : list.map(e => `
          <article class="jr-entry" data-id="${e.id}">
            ${e.ph.length ? `<div class="jr-photos n${Math.min(e.ph.length, 3)}">${e.ph.slice(0, 3).map(id => `<img data-ph="${id}" alt="">`).join("")}${e.ph.length > 3 ? `<span class="more">+${e.ph.length - 3}</span>` : ""}</div>` : ""}
            <div class="jr-meta">${e.e ? `<span class="mood">${e.e}</span>` : ""}<span>${e.d ? esc(fmtDate(e.d)) : "Sans date"}</span><button class="linkish" data-j="edit" data-id="${e.id}">Modifier</button></div>
            ${e.t ? `<h4>${esc(e.t)}</h4>` : ""}
            ${e.x ? `<p>${esc(e.x).replace(/\n/g, "<br>")}</p>` : ""}
          </article>`).join("")}</div>
      </div></div>`;
    fillPhotos(back);
    back.querySelector('[data-j="close"]').onclick = close;
    back.querySelectorAll("[data-mapph]").forEach(b => b.onclick = () => pinViewer(onMap, +b.dataset.mapph));
    const nw = back.querySelector('[data-j="new"]');
    if (nw) nw.onclick = () => { edit = { id: "e" + Date.now().toString(36), d: isoDay(new Date()), t: "", x: "", e: "", ph: [], added: [], isNew: true }; draw(); };
    back.querySelectorAll('[data-j="edit"]').forEach(b => b.onclick = () => { const e = journalOf(code).entries.find(x => x.id === b.dataset.id); edit = { ...e, ph: [...e.ph], added: [] }; draw(); });
    if (edit) bindEditor();
  };
  const editor = e => `<div class="jr-edit">
    <div class="row between"><button type="button" class="date-btn" data-j="date">📅 ${e.d ? esc(fmtDate(e.d)) : "Choisir la date"}</button></div>
    <div class="jr-moods">${MOODS.map(m => `<button type="button" data-mood="${m}" aria-pressed="${e.e === m}">${m}</button>`).join("")}</div>
    <input id="jr-t" placeholder="Titre (facultatif)" maxlength="120" value="${esc(e.t)}">
    <textarea id="jr-x" placeholder="Qu'est-ce qui t'a marqué aujourd'hui ?">${esc(e.x)}</textarea>
    <div class="jr-grid">${e.ph.map(id => `<div class="jr-th"><img data-ph="${id}" alt=""><button type="button" data-rmph="${id}" aria-label="Retirer la photo">✕</button>${journalOf(code).cover === id ? `<span class="cov">★ Couverture</span>` : `<button type="button" class="setcov" data-cov="${id}">☆ Couverture</button>`}</div>`).join("")}
      <label class="jr-addph">＋<small>Photos</small><input type="file" accept="image/*" multiple id="jr-files" hidden></label></div>
    <div class="btns"><button class="btn primary" data-j="save">Enregistrer</button><button class="btn" data-j="cancel">Annuler</button>${e.isNew ? "" : `<button class="btn danger" data-j="del">Supprimer</button>`}</div>
  </div>`;
  const keepText = () => { edit.t = $("jr-t").value; edit.x = $("jr-x").value; };
  const bindEditor = () => {
    back.querySelector('[data-j="date"]').onclick = async () => { keepText(); const r = await pickDates(edit.d, "", false, 0, true); if (r && r.start) edit.d = r.start; draw(); };
    back.querySelectorAll("[data-mood]").forEach(b => b.onclick = () => { keepText(); edit.e = edit.e === b.dataset.mood ? "" : b.dataset.mood; draw(); });
    $("jr-files").onchange = async ev => {
      keepText();
      const files = [...ev.target.files].slice(0, 30 - edit.ph.length);
      if (!files.length) return;
      toast("Ajout des photos…", 1200);
      const ids = [];
      for (const f of files) {
        const ex = readExif(await f.slice(0, 256 * 1024).arrayBuffer().catch(() => new ArrayBuffer(0)));
        const [ph] = await addPhotos([f]).catch(() => []);
        if (!ph) continue;
        ids.push(ph);
        if (ex.lat !== undefined) (edit.loc ||= {})[ph] = { lon: ex.lon, lat: ex.lat, d: ex.day || "" };
      }
      if (!ids.length) { toast("Impossible d'ajouter ces photos"); return; }
      edit.ph.push(...ids); edit.added.push(...ids); draw();
    };
    back.querySelectorAll("[data-rmph]").forEach(b => b.onclick = () => { keepText(); edit.ph = edit.ph.filter(x => x !== b.dataset.rmph); draw(); });
    back.querySelectorAll("[data-cov]").forEach(b => b.onclick = () => { keepText(); const j = journalOf(code); j.cover = b.dataset.cov; state.j[code] = j; draw(); });
    back.querySelector('[data-j="cancel"]').onclick = () => { dropPhotos(edit.added); edit = null; draw(); };
    back.querySelector('[data-j="save"]').onclick = () => {
      keepText();
      const j = journalOf(code), old = j.entries.find(x => x.id === edit.id);
      if (!edit.t.trim() && !edit.x.trim() && !edit.ph.length && !edit.e) { toast("Écris quelques mots ou ajoute une photo", 1600); return; }
      if (old) unpinPhotos(old.ph.filter(id => !edit.ph.includes(id)));
      pinJournalPhotos(code, edit.ph, edit.loc, edit.d);
      const clean = { id: edit.id, d: edit.d, t: edit.t.trim(), x: edit.x.trim(), e: edit.e, ph: edit.ph };
      j.entries = old ? j.entries.map(x => x.id === edit.id ? clean : x) : [...j.entries, clean];
      state.j[code] = j; edit = null; persist(); draw();
      toast("Souvenir enregistré ✓", 1200);
    };
    const del = back.querySelector('[data-j="del"]');
    if (del) del.onclick = () => {
      if (!del.dataset.armed) { del.dataset.armed = "1"; del.textContent = "Confirmer"; return; }
      const j = journalOf(code), old = j.entries.find(x => x.id === edit.id);
      unpinPhotos([...(old ? old.ph : []), ...edit.added]);
      j.entries = j.entries.filter(x => x.id !== edit.id);
      if (old && old.ph.includes(j.cover)) j.cover = "";
      state.j[code] = j; edit = null; persist(); draw();
    };
  };
  back.onclick = e => { if (e.target === back && !edit) close(); };
  back._draw = () => { if (!edit) draw(); }; // après un changement dans la galerie
  draw();
}
// photos Wikipédia du pays, quand le journal n'a pas encore de photo à soi
async function showPhotoInto(code) {
  const box = $("ss-photo");
  if (!box) return;
  const name = byId.get(code).properties.n;
  const photo = await fetchPhoto({ id: "c:" + code, n: name, lang: "fr", q: name });
  if (!photo || $("ss-photo") !== box) return;
  const many = photo.list.length > 1;
  box.innerHTML = `<div class="slides">${photo.list.map((src, i) => `<img src="${esc(src)}" alt="${esc(name)} (${i + 1})" loading="${i ? "lazy" : "eager"}">`).join("")}</div>
    ${many ? `<div class="dots">${photo.list.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
    <a href="${esc(photo.url)}" target="_blank" rel="noopener">Photos : Wikipédia · ${esc(photo.title)}</a>`;
  box.hidden = false;
  const slides = box.querySelector(".slides");
  slides.querySelectorAll("img").forEach(img => img.onerror = () => { img.remove(); if (!slides.children.length) box.hidden = true; });
  if (many) slides.onscroll = () => {
    const k = Math.round(slides.scrollLeft / slides.clientWidth);
    box.querySelectorAll(".dots i").forEach((d, j) => d.classList.toggle("on", k === j));
  };
}

/* ---------- Mur de photos : les photos accrochées sur la carte ---------- */
// Lieu et date lus dans la photo (EXIF) quand le téléphone les a gardés ; sinon on touche la carte pour la poser.
function readExif(buf) {
  try {
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return {};
    for (let o = 2; o + 10 < v.byteLength;) {
      const m = v.getUint16(o), len = v.getUint16(o + 2);
      if (m === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) return parseTiff(v, o + 10);
      if ((m & 0xFF00) !== 0xFF00 || m === 0xFFDA) break;
      o += 2 + len;
    }
  } catch (e) {}
  return {};
}
function parseTiff(v, t) {
  const le = v.getUint16(t) === 0x4949;
  const u16 = p => v.getUint16(p, le), u32 = p => v.getUint32(p, le);
  const ifd = p => { const n = u16(p), out = {}; for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; out[u16(e)] = e; } return out; };
  const rat = p => u32(p) / (u32(p + 4) || 1);
  const ascii = e => { const cnt = u32(e + 4), off = cnt > 4 ? t + u32(e + 8) : e + 8; let r = ""; for (let i = 0; i < cnt - 1; i++) r += String.fromCharCode(v.getUint8(off + i)); return r; };
  const res = {}, i0 = ifd(t + u32(t + 4));
  if (i0[0x8769]) { const ex = ifd(t + u32(i0[0x8769] + 8)); if (ex[0x9003]) res.date = ascii(ex[0x9003]); }
  if (!res.date && i0[0x0132]) res.date = ascii(i0[0x0132]);
  if (i0[0x8825]) {
    const g = ifd(t + u32(i0[0x8825] + 8));
    const dms = e => { const off = t + u32(e + 8); return rat(off) + rat(off + 8) / 60 + rat(off + 16) / 3600; };
    if (g[2] && g[4]) {
      let lat = dms(g[2]), lon = dms(g[4]);
      if (g[1] && String.fromCharCode(v.getUint8(g[1] + 8)) === "S") lat = -lat;
      if (g[3] && String.fromCharCode(v.getUint8(g[3] + 8)) === "W") lon = -lon;
      if (isFinite(lat) && isFinite(lon) && (lat || lon) && Math.abs(lat) <= 90) { res.lat = lat; res.lon = lon; }
    }
  }
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(res.date || "");
  res.day = m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  return res;
}
let placing = null; // photos qui attendent qu'on touche la carte pour les poser
const pinsShown = () => store.get("explora-pins") !== "off";
const pinTransform = d => `translate(${d.x},${d.y}) scale(${1 / k})`;
const tilt = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 101; return (h % 15) - 7; };
async function pickPinPhotos() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
  inp.onchange = async () => {
    const files = [...inp.files].slice(0, 60);
    if (!files.length) return;
    toast(`Préparation de ${plural(files.length, "photo", "photos")}…`, 1500);
    const got = [], waiting = [];
    for (const f of files) {
      const ex = readExif(await f.slice(0, 256 * 1024).arrayBuffer().catch(() => new ArrayBuffer(0)));
      const [ph] = await addPhotos([f]).catch(() => []);
      if (!ph) continue;
      const pin = { id: ph, ph, lon: ex.lon, lat: ex.lat, d: ex.day || "" };
      (ex.lat !== undefined ? got : waiting).push(pin);
    }
    if (got.length) { state.p.push(...cleanPins(got)); save(); drawPins(); }
    if (waiting.length) {
      placing = waiting;
      showPlacing();
    } else if (got.length) {
      toast(`${plural(got.length, "photo placée", "photos placées")} à l'endroit où ${got.length > 1 ? "elles ont été prises" : "elle a été prise"} 📍`, 2600);
      fitPins(got);
    } else toast("Impossible d'ajouter ces photos");
  };
  inp.click();
}
function showPlacing() {
  document.querySelector(".place-bar")?.remove();
  const b = document.createElement("div");
  b.className = "place-bar card";
  b.innerHTML = `<b>📍 Touche la carte</b><span>là où ${placing.length > 1 ? `tu as pris ces ${placing.length} photos` : "tu as pris cette photo"}</span><button class="btn small" id="pl-cancel">Annuler</button>`;
  document.body.append(b);
  $("pl-cancel").onclick = () => { dropPhotos(placing.map(p => p.ph)); placing = null; b.remove(); };
}
function fitPins(list) {
  const P = list.map(p => projection([p.lon, p.lat]));
  const m = 2.5; // marge, et zoom assez près pour voir les photos
  const cx = (d3.min(P, d => d[0]) + d3.max(P, d => d[0])) / 2, cy = (d3.min(P, d => d[1]) + d3.max(P, d => d[1])) / 2;
  const hw = Math.max((d3.max(P, d => d[0]) - d3.min(P, d => d[0])) / 2 + m, W * .9 / 12), hh = (d3.max(P, d => d[1]) - d3.min(P, d => d[1])) / 2 + m;
  fitBounds([[cx - hw, cy - hh], [cx + hw, cy + hh]], 700);
}
// en capture : poser les photos en attente avant les autres actions de la carte
svg.node().addEventListener("click", e => {
  if (placing) {
    e.stopPropagation(); e.preventDefault();
    const t = d3.zoomTransform(svg.node()), [x, y] = d3.pointer(e, svg.node());
    const ll = projection.invert(t.invert([x, y]));
    if (!ll || !isFinite(ll[0])) return;
    state.p.push(...cleanPins(placing.map(p => ({ ...p, lon: ll[0], lat: ll[1], c: "" }))));
    const n = placing.length;
    placing = null; document.querySelector(".place-bar")?.remove();
    save(); drawPins();
    toast(`${plural(n, "photo ajoutée", "photos ajoutées")} ✓`, 1800);
    return;
  }
}, true);
// photos : cachées quand la carte est dézoomée, petites vignettes de près, plus grandes dans le pays ouvert
const pinHome = new Map();
const pinIn = p => { if (p.c) return p.c; const key = p.id + "@" + p.lon + "," + p.lat; if (!pinHome.has(key)) pinHome.set(key, countryAt(p.lon, p.lat)?.id || ""); return pinHome.get(key); };
// largeur visible de la carte en degrés de longitude : les photos n'apparaissent qu'à l'échelle d'une région (≈ la Méditerranée)
const PIN_MAX_SPAN = 28;
function viewSpan() {
  const t = d3.zoomTransform(svg.node()), a = projection.invert(t.invert([0, H / 2])), b = projection.invert(t.invert([W, H / 2]));
  return a && b && isFinite(a[0]) && isFinite(b[0]) ? Math.abs(b[0] - a[0]) : 360;
}
function drawPins() {
  const list = pinsShown() && !VIEW ? state.p : [], groups = [], far = viewSpan() > PIN_MAX_SPAN;
  for (const p of list) {
    const open = !!current && pinIn(p) === current, r = (open ? 34 : 22) / k;
    if (!open && far) continue;
    const [x, y] = projection([p.lon, p.lat]);
    const g = groups.find(o => o.open === open && Math.abs(o.x - x) < r && Math.abs(o.y - y) < r);
    if (g) g.items.push(p); else groups.push({ x, y, open, items: [p] });
  }
  for (const g of groups) { g.items.sort((a, b) => (b.d || "").localeCompare(a.d || "")); g.n = g.items.length; g.id = g.items[0].id + ":" + g.n + (g.open ? ":o" : ""); }
  if (!svg.select("#pin-clip").size()) {
    const defs = svg.append("defs");
    defs.append("clipPath").attr("id", "pin-clip").append("rect").attr("x", -17).attr("y", -17).attr("width", 34).attr("height", 34).attr("rx", 8);
    defs.append("clipPath").attr("id", "pin-clip-s").append("rect").attr("x", -9).attr("y", -9).attr("width", 18).attr("height", 18).attr("rx", 5);
  }
  const thumb = (sel, big, ph) => {
    const h = big ? 17 : 9;
    sel.append("rect").attr("class", "pv-frame").attr("x", -h - 2).attr("y", -h - 2).attr("width", 2 * h + 4).attr("height", 2 * h + 4).attr("rx", big ? 10 : 6);
    sel.append("image").attr("x", -h).attr("y", -h).attr("width", 2 * h).attr("height", 2 * h).attr("preserveAspectRatio", "xMidYMid slice").attr("clip-path", `url(#pin-clip${big ? "" : "-s"})`)
      .each(function () { photoURL(ph).then(u => { if (u) this.setAttribute("href", u); }); });
  };
  const badge = (sel, n, x, y, small) => {
    const b = sel.append("g").attr("class", "pv-count").attr("transform", `translate(${x},${y})${small ? " scale(.8)" : ""}`);
    const t = String(n), w = 10 + 6 * t.length;
    b.append("rect").attr("x", -w / 2).attr("y", -8).attr("width", w).attr("height", 16).attr("rx", 8);
    b.append("text").attr("dy", "0.35em").text(t);
  };
  gPins.selectAll(".pin-g").data(groups, d => d.id).join(enter => {
    const m = enter.append("g").attr("class", d => "pin-g" + (d.open ? " web" : " mini"));
    m.each(function (d) {
      const el = d3.select(this);
      if (!d.open) {
        thumb(el, false, d.items[0].ph);
        if (d.n > 1) badge(el, d.n, 10, 10, true);
        el.on("click", e => { e.stopPropagation(); const c = pinIn(d.items[0]); c ? openCountry(c) : pinViewer(d.items); });
        return;
      }
      // une pile : une vignette avec le nombre, qui ouvre la galerie
      thumb(el, true, d.items[0].ph);
      if (d.n > 1) badge(el, d.n, 15, 15);
      el.on("click", e => { e.stopPropagation(); pinViewer(d.items); });
    });
    return m;
  }).attr("transform", pinTransform);
}
function pinViewer(items, start = 0) {
  let list = [...items], i = start;
  const back = document.createElement("div");
  back.className = "mp-back pv-back";
  document.body.append(back);
  const close = () => { back.remove(); document.querySelector(".ss-back")?._draw?.(); };
  const draw = () => {
    if (!list.length) return close();
    i = Math.min(i, list.length - 1);
    back.innerHTML = `<div class="pv" role="dialog" aria-label="Photos">
      <div class="pv-slides">${list.map((p, j) => `<img data-ph="${p.ph}" data-j="${j}" alt="">`).join("")}</div>
      ${list.length > 1 ? `<div class="pv-dots">${list.map((_, j) => `<i class="${j === i ? "on" : ""}"></i>`).join("")}</div>` : ""}
      <div class="pv-bar"><div id="pv-info"></div>
        <button class="btn small" data-pv="move">Déplacer</button><button class="btn small danger" data-pv="del">Retirer</button><button class="icon-btn" data-pv="close" aria-label="Fermer">✕</button></div>
    </div>`;
    fillPhotos(back);
    const slides = back.querySelector(".pv-slides");
    const info = () => {
      const pin = list[i], c = countryAt(pin.lon, pin.lat), r = c && regionIn(c.id, pin.lon, pin.lat);
      $("pv-info").innerHTML = `<b>${c ? flag(c.id) + " " + esc(c.properties.n) : "Photo"}</b><small>${esc([r && r.properties.n, pin.d && fmtDate(pin.d), list.length > 1 ? `${i + 1} / ${list.length}` : ""].filter(Boolean).join(" · "))}</small>`;
      back.querySelectorAll(".pv-dots i").forEach((d, j) => d.classList.toggle("on", j === i));
    };
    requestAnimationFrame(() => { slides.scrollLeft = i * slides.clientWidth; });
    slides.onscroll = () => { const j = Math.round(slides.scrollLeft / slides.clientWidth); if (j !== i) { i = j; info(); } };
    info();
    back.querySelector('[data-pv="close"]').onclick = close;
    back.querySelector('[data-pv="move"]').onclick = () => {
      const pin = list[i];
      close(); document.querySelector(".ss-back")?.remove();
      state.p = state.p.filter(x => x.id !== pin.id); drawPins();
      placing = [pin]; showPlacing();
    };
    back.querySelector('[data-pv="del"]').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirmer"; return; }
      const pin = list[i];
      unpinPhotos([pin.ph]);
      save();
      list.splice(i, 1); draw();
    };
  };
  back.onclick = e => { if (e.target === back) close(); };
  draw();
}
const addMapPhotos = () => { if (!pinsShown()) { store.set("explora-pins", "on"); drawPins(); } pickPinPhotos(); };

/* ---------- Mes vols : départs et arrivées reliés sur la carte ---------- */
const flightsShown = () => store.get("explora-flights") !== "off";
const flKm = f => d3.geoDistance([f.a.lon, f.a.lat], [f.b.lon, f.b.lat]) * 6371;
function drawFlights() {
  const list = flightsShown() && !routePlan ? state.f : [];
  gFlights.selectAll(".fl-arc").data(list, d => d.id).join("path").attr("class", "fl-arc")
    .attr("d", d => path({ type: "LineString", coordinates: [[d.a.lon, d.a.lat], [d.b.lon, d.b.lat]] }));
  // chaque ville une seule fois ; plus le point est gros, plus on y est passé souvent
  const ends = new Map();
  for (const f of list) for (const e of [f.a, f.b]) {
    const key = e.n + "|" + e.c, o = ends.get(key) || { ...e, key, n2: 0 };
    o.n2++; ends.set(key, o);
  }
  const pts = [...ends.values()].map(e => { const [x, y] = projection([e.lon, e.lat]); return { ...e, x, y }; });
  gFlights.selectAll(".fl-end").data(pts, d => d.key).join(enter => {
    const g = enter.append("g").attr("class", "fl-end");
    g.append("circle"); g.append("text").attr("x", 7).attr("dy", "0.35em");
    return g;
  }).attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / k})`)
    .call(g => g.select("circle").attr("r", d => Math.min(7, 3 + d.n2 * .6)))
    .call(g => g.select("text").text(d => d.n));
}
let flDraft = { a: null, b: null, d: "" };
function endFromHit(c, r, h) {
  if (h?.city) return { n: h.city.n, lon: h.city.lon, lat: h.city.lat, c: h.city.code };
  const id = r || c, [lon, lat] = centroid(id);
  return { n: placeName(id), lon, lat, c };
}
function renderFlights(box) {
  const list = [...state.f].sort((x, y) => (y.d || "").localeCompare(x.d || ""));
  const km = d3.sum(state.f, flKm), cities = new Set(state.f.flatMap(f => [f.a.n + f.a.c, f.b.n + f.b.c])).size;
  const longest = d3.greatest(state.f, flKm);
  box.innerHTML = `
    ${state.f.length ? `<div class="fl-stats">
      <span><b>${state.f.length}</b><small>vol${state.f.length > 1 ? "s" : ""}</small></span>
      <span><b>${Math.round(km).toLocaleString("fr-FR")}</b><small>km en avion</small></span>
      <span><b>${(km / 40075).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</b><small>tours de la Terre</small></span>
      <span><b>${cities}</b><small>villes</small></span>
    </div>` : ""}
    <div class="fl-form block">
      <h3 style="margin-top:0">✈️ Ajouter un vol</h3>
      <div class="add"><input id="fl-a" type="search" autocomplete="off" placeholder="Départ : ville ou pays…" value="${esc(flDraft.a?.n || "")}"><ul id="fl-ar" class="card results" hidden></ul></div>
      <div class="add" style="margin-top:8px"><input id="fl-b" type="search" autocomplete="off" placeholder="Arrivée : ville ou pays…" value="${esc(flDraft.b?.n || "")}"><ul id="fl-br" class="card results" hidden></ul></div>
      <div class="btns"><button type="button" class="date-btn ${flDraft.d ? "" : "empty"}" id="fl-d">📅 ${flDraft.d ? esc(fmtDate(flDraft.d)) : "Date (facultatif)"}</button>
        <button class="btn primary" id="fl-add" ${flDraft.a && flDraft.b ? "" : "disabled"}>Ajouter</button></div>
    </div>
    ${list.length ? `<div class="block">
      <div class="row between"><h3 style="margin:0">Mes vols</h3><button class="btn small" id="fl-map">Voir sur la carte</button></div>
      <label class="switch" style="margin:10px 0 4px"><input type="checkbox" id="fl-on" ${flightsShown() ? "checked" : ""}>Afficher mes vols sur la carte</label>
      <ul class="fl-list">${list.map(f => `<li>
        <span class="t"><b>${esc(f.a.n)} → ${esc(f.b.n)}</b><small>${[f.d && esc(fmtDate(f.d)), fmtKm(flKm(f))].filter(Boolean).join(" · ")}${longest === f && state.f.length > 1 ? " · 🏆 le plus long" : ""}</small></span>
        <button class="icon-btn" data-rmfl="${f.id}" aria-label="Retirer ce vol">✕</button></li>`).join("")}</ul>
    </div>` : `<p class="small" style="text-align:center">Ajoute tes vols : ils se dessinent sur la carte, reliés comme une toile d'araignée.</p>`}`;
  const pick = key => (c, r, city, site, h) => { flDraft[key] = endFromHit(c, r, h); renderFlights(box); };
  bindSearch($("fl-a"), $("fl-ar"), true, h => h.k, pick("a"));
  bindSearch($("fl-b"), $("fl-br"), true, h => h.k, pick("b"));
  for (const key of ["a", "b"]) $("fl-" + key).addEventListener("input", () => { if (flDraft[key]) { flDraft[key] = null; $("fl-add").disabled = true; } });
  $("fl-d").onclick = async () => { const r = await pickDates(flDraft.d, "", false, 0, true); if (r && r.start) { flDraft.d = r.start; renderFlights(box); } };
  $("fl-add").onclick = () => {
    if (!flDraft.a || !flDraft.b) return;
    state.f.push({ id: "f" + Date.now().toString(36), a: flDraft.a, b: flDraft.b, d: flDraft.d });
    // retour possible : le départ suivant part de l'arrivée
    flDraft = { a: flDraft.b, b: null, d: "" };
    save(); drawFlights(); renderFlights(box);
    toast("Vol ajouté ✈️", 1200);
  };
  box.querySelectorAll("[data-rmfl]").forEach(b => b.onclick = () => { state.f = state.f.filter(f => f.id !== b.dataset.rmfl); save(); drawFlights(); renderFlights(box); });
  if ($("fl-on")) $("fl-on").onchange = e => { store.set("explora-flights", e.target.checked ? "on" : "off"); drawFlights(); };
  if ($("fl-map")) $("fl-map").onclick = () => {
    store.set("explora-flights", "on");
    showTab("map"); openWorld();
    setTimeout(() => {
      const P = state.f.flatMap(f => [projection([f.a.lon, f.a.lat]), projection([f.b.lon, f.b.lat])]);
      fitBounds([[d3.min(P, d => d[0]) - 20, d3.min(P, d => d[1]) - 20], [d3.max(P, d => d[0]) + 20, d3.max(P, d => d[1]) + 20]], 800);
    }, 60);
  };
}

/* ---------- Carte à partager (lien) ---------- */
// Le lien contient la carte elle-même (pays, régions, couleurs), compressée : pas de compte ni de serveur.
const b64url = bytes => { let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const pipeBytes = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
async function packMap(name) {
  const bytes = new TextEncoder().encode(JSON.stringify({ n: name, c: [...state.c.keys()], r: [...state.r.keys()], k: state.k, f: state.f.map(({ id, ...x }) => x) }));
  if (window.CompressionStream) try { return "z" + b64url(await pipeBytes(bytes, new CompressionStream("deflate-raw"))); } catch (e) {}
  return "u" + b64url(bytes);
}
async function unpackMap(s) {
  const bytes = Uint8Array.from(atob(s.slice(1).replace(/-/g, "+").replace(/_/g, "/")), ch => ch.charCodeAt(0));
  const raw = s[0] === "z" ? await pipeBytes(bytes, new DecompressionStream("deflate-raw")) : bytes;
  const d = JSON.parse(new TextDecoder().decode(raw));
  return { f: cleanFlights(d.f), n: String(d.n || "").slice(0, 40), c: (Array.isArray(d.c) ? d.c : []).map(String).slice(0, 400), r: (Array.isArray(d.r) ? d.r : []).map(String).slice(0, 6000), k: cleanColors(d.k) };
}
function shareLink() {
  const back = document.createElement("div");
  back.className = "mp-back";
  back.innerHTML = `<div class="card mp" role="dialog" aria-label="Partager ma carte">
    <h3>Partager ma carte</h3>
    <p class="small" style="margin-top:0">Tes amis verront tes pays et tes régions en couleur, avec ton % du monde. Ton journal et tes projets restent privés.</p>
    <label class="field">Ton prénom<input id="sh-name" maxlength="40" value="${esc(store.get("explora-name") || "")}" placeholder="Ex. : Tommy" enterkeyhint="done"></label>
    <div class="btns"><button class="btn primary" data-sh="go">Envoyer le lien</button><button class="btn" data-sh="cancel">Annuler</button></div>
  </div>`;
  document.body.append(back);
  const close = () => back.remove();
  back.onclick = e => { if (e.target === back) close(); };
  back.querySelector('[data-sh="cancel"]').onclick = close;
  back.querySelector('[data-sh="go"]').onclick = async () => {
    const name = $("sh-name").value.trim();
    store.set("explora-name", name);
    const url = location.origin + location.pathname + "#carte=" + await packMap(name);
    close();
    const text = `${name ? name + " a" : "J'ai"} exploré ${fmtPct(worldPct())} % du monde et ${plural(state.c.size, "pays", "pays")} 🌍`;
    try {
      if (navigator.share) { await navigator.share({ title: "Explora World", text, url }); return; }
    } catch (e) { if (e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); toast("Lien copié ✓ Colle-le dans un message", 2400); }
    catch (e) { prompt("Copie ce lien :", url); }
  };
}
function showViewBanner() {
  const b = document.createElement("div");
  b.className = "view-banner card";
  b.innerHTML = `<div><b>🌍 Carte de ${esc(VIEW.n || "ton ami")}</b><small>${plural(state.c.size, "pays", "pays")} · ${fmtPct(worldPct())} % du monde</small></div>
    <button class="btn small primary" id="vb-home">Ma carte</button>`;
  document.body.classList.add("viewing");
  document.body.append(b);
  $("vb-home").onclick = () => { history.replaceState(null, "", location.pathname); location.reload(); };
}

/* ---------- Image à partager ---------- */
async function shareImage() {
  const btn = $("btn-share");
  btn.textContent = "Préparation…";
  try { await document.fonts.ready; } catch (e) {}
  const css = getComputedStyle(document.documentElement);
  const v = n => css.getPropertyValue(n).trim();
  const Wc = 1080, Hc = 1350;
  const cv = document.createElement("canvas"); cv.width = Wc; cv.height = Hc;
  const ctx = cv.getContext("2d");
  const proj = d3.geoNaturalEarth1().fitExtent([[50, 380], [Wc - 50, 1060]], { type: "Sphere" });
  const p = d3.geoPath(proj, ctx);
  const s = stats();
  ctx.fillStyle = v("--bg"); ctx.fillRect(0, 0, Wc, Hc);
  ctx.beginPath(); p({ type: "Sphere" }); ctx.fillStyle = v("--ocean"); ctx.fill();
  for (const f of countries) {
    ctx.beginPath(); p(f);
    ctx.fillStyle = state.c.has(f.id) ? v("--found-soft") : state.w.has(f.id) ? v("--wish-soft") : v("--fog");
    ctx.fill();
  }
  ctx.fillStyle = v("--found");
  for (const id of state.r.keys()) { const r = regionById.get(id); if (r) { ctx.beginPath(); p(r); ctx.fill(); } }
  ctx.strokeStyle = v("--fog-line"); ctx.lineWidth = .6;
  for (const f of countries) { ctx.beginPath(); p(f); ctx.stroke(); }
  const display = "'Bricolage Grotesque', 'Avenir Next', system-ui, sans-serif", body = "'IBM Plex Sans', system-ui, sans-serif";
  ctx.fillStyle = v("--ink-2"); ctx.font = `700 34px ${display}`; ctx.fillText("EXPLORA WORLD", 70, 110);
  ctx.fillStyle = v("--ink"); ctx.font = `800 150px ${display}`;
  const big = fmtPct(s.pct) + " %";
  ctx.fillText(big, 64, 260);
  const bw = ctx.measureText(big).width;
  ctx.fillStyle = v("--ink-2"); ctx.font = `500 40px ${body}`; ctx.fillText("du monde", 84 + bw, 258);
  ctx.fillStyle = v("--ink"); ctx.font = `600 44px ${body}`;
  ctx.fillText(`${plural(s.n, "pays", "pays")} · ${plural(s.regions, "région", "régions")} · ${plural(s.continents, "continent", "continents")}`, 70, 330);
  ctx.fillStyle = v("--ink-2"); ctx.font = `500 34px ${body}`;
  const got = BADGES.filter(b => b.ok(s)).length;
  ctx.fillText(`${got} badge${got > 1 ? "s" : ""} débloqué${got > 1 ? "s" : ""}`, 70, 1150);
  const d = new Date();
  ctx.fillText(`${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, 70, 1200);
  ctx.fillStyle = v("--found"); ctx.fillRect(70, 1250, 140, 10);

  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  btn.textContent = "Partager";
  const file = new File([blob], "ma-carte-explora.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Ma carte Explora" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- Onglet Voyages ---------- */
const openTrips = new Set();
function tripItem(f) {
  const v = visitedIn(f.id), n = f.nreg, open = openTrips.has(f.id);
  return `
    <div class="trip ${open ? "open" : ""}" data-trip="${f.id}">
      <button aria-expanded="${open}">
        <span><b>${flag(f.id)} ${esc(f.properties.n)}</b></span>
        <span class="num muted">${v} / ${n} ${esc(f.kind)} <span class="chev">›</span></span>
        <span class="bar"><i style="width:${n ? v / n * 100 : 0}%"></i></span>
      </button>
      ${open ? `
      <div class="trip-body">
        <div class="when">Date de visite (facultatif) ${monthBtn("data-when", monthValue(state.c.get(f.id)))}</div>
        <div class="trip-actions">
          <button class="btn small primary" data-act="journal">📖 Journal${state.j[f.id]?.entries.length ? ` (${state.j[f.id].entries.length})` : ""}</button>
          <button class="btn small" data-act="map">Voir sur la carte</button>
          <button class="btn small danger" data-act="remove">Retirer ce pays</button>
        </div>
        <ul class="checks">${(regionsBy.get(f.id) || []).map(r => `
          <li><label><input type="checkbox" data-r="${r.id}" ${state.r.has(r.id) ? "checked" : ""}><span>${esc(r.properties.n)}</span></label></li>`).join("")}
        </ul>
      </div>` : ""}
    </div>`;
}
function refreshCounters() {
  drawMap();
  $("m-pct").textContent = fmtPct(worldPct()) + " %";
  $("m-countries").textContent = state.c.size;
}
function bindTrip(el) {
  const code = el.dataset.trip, f = byId.get(code);
  el.querySelector(":scope > button").onclick = () => {
    openTrips.has(code) ? openTrips.delete(code) : openTrips.add(code);
    el.outerHTML = tripItem(f);
    bindTrip(document.querySelector(`[data-trip="${code}"]`));
  };
  const act = a => el.querySelector(`[data-act="${a}"]`);
  if (act("map")) act("map").onclick = () => { showTab("map"); openCountry(code); };
  if (act("journal")) act("journal").onclick = () => journalSheet(code);
  if (act("remove")) act("remove").onclick = e => {
    const b = e.currentTarget;
    if (b.dataset.armed) { setCountry(code, false); openTrips.delete(code); update(); toast(f.properties.n + " retiré de tes voyages"); return; }
    b.dataset.armed = "1"; b.textContent = "Confirmer le retrait";
    setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Retirer ce pays"; } }, 3500);
  };
  const when = el.querySelector("[data-when]");
  if (when) when.onclick = async () => {
    const v = await pickMonth(when.dataset.v);
    if (v === null) return;
    setVisitMonth(code, v); renderTrips();
  };
  el.querySelectorAll("[data-r]").forEach(cb => cb.onchange = () => {
    setRegion(cb.dataset.r, cb.checked);
    const v = visitedIn(code);
    el.querySelector(":scope > button .num").firstChild.textContent = `${v} / ${f.nreg} ${f.kind} `;
    el.querySelector(":scope > button .bar i").style.width = (f.nreg ? v / f.nreg * 100 : 0) + "%";
    refreshCounters();
  });
}
function renderTrips() {
  document.querySelectorAll("[data-tv]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tv === tripView));
  $("add-q").placeholder = tripView === "wish" ? "Ajouter une envie (pays ou région)…" : "Ajouter un pays visité…";
  $("add-q").closest(".add").hidden = tripView === "timeline" || tripView === "flights";
  const box = $("trips");
  if (tripView === "flights") return renderFlights(box);
  if (tripView === "visited") {
    const list = [...state.c.keys()].map(id => byId.get(id)).filter(Boolean)
      .sort((a, b) => a.properties.n.localeCompare(b.properties.n, "fr"));
    box.innerHTML = list.length ? list.map(tripItem).join("")
      : `<div class="empty-state">Aucun voyage pour l'instant.<br>Ajoute un pays ci-dessus ou depuis la carte.</div>`;
    box.querySelectorAll("[data-trip]").forEach(bindTrip);
  } else if (tripView === "wish") {
    const list = [...state.w.keys()].filter(place).sort((a, b) => placeName(a).localeCompare(placeName(b), "fr"));
    box.innerHTML = list.length ? list.map(id => `
      <div class="wish-row" data-w="${id}">
        <div class="t"><b>${esc(placeName(id))}</b><small>${esc(placeSub(id))}</small></div>
        <button class="btn small" data-act="map">Voir</button>
        <button class="btn small primary" data-act="done">J'y suis allé</button>
        <button class="icon-btn" data-act="del" aria-label="Retirer">✕</button>
      </div>`).join("")
      : `<div class="empty-state">Pas encore d'envies.<br>Ajoute les pays et régions qui te font rêver, ils apparaîtront en bleu sur la carte.</div>`;
    box.querySelectorAll("[data-w]").forEach(el => {
      const id = el.dataset.w;
      el.querySelector('[data-act="map"]').onclick = () => { showTab("map"); isCountry(id) ? openCountry(id) : openCountry(placeCountry(id), id); };
      el.querySelector('[data-act="done"]').onclick = () => { isCountry(id) ? setCountry(id, true) : setRegion(id, true); toast(placeName(id) + " ajouté à ta carte ✓"); update(); };
      el.querySelector('[data-act="del"]').onclick = () => { toggleWish(id); update(); };
    });
  } else {
    const items = [...state.c.entries()].filter(([id]) => byId.has(id)).sort((a, b) => b[1] - a[1]);
    const groups = d3.groups(items, ([, t]) => t ? new Date(t).getFullYear() : "Date inconnue");
    box.innerHTML = items.length ? groups.map(([year, list]) => `
      <div class="year">${year}</div>
      <ul class="tl">${list.map(([id, t]) => `
        <li><button class="btn small" style="border:0;padding:4px 0" data-open="${id}">${esc(byId.get(id).properties.n)}</button>
        ${monthBtn(`class="tl-date" data-tl="${id}" aria-label="Date de visite"`, monthValue(t))}</li>`).join("")}
      </ul>`).join("") + `<p class="small">La date est facultative : touche le mois à côté d'un pays pour la choisir ou la changer.</p>`
      : `<div class="empty-state">Ta frise se remplira avec tes voyages.</div>`;
    box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { showTab("map"); openCountry(b.dataset.open); });
    box.querySelectorAll("[data-tl]").forEach(b => b.onclick = async () => {
      const v = await pickMonth(b.dataset.v, byId.get(b.dataset.tl).properties.n);
      if (v !== null) { setVisitMonth(b.dataset.tl, v); renderTrips(); }
    });
  }
}
document.querySelectorAll("[data-tv]").forEach(b => b.onclick = () => { tripView = b.dataset.tv; renderTrips(); });

/* ---------- Onglet Projets ---------- */
let editPlan = null;
function planDates(p) {
  if (!p.start) return "";
  let s = p.end && p.end !== p.start ? `Du ${fmtDate(p.start)} au ${fmtDate(p.end)}` : `Le ${fmtDate(p.start)}`;
  if (!p.done) {
    const days = Math.round((new Date(p.start + "T12:00") - today()) / 864e5);
    if (days > 1) s += ` · dans ${days} jours`;
    else if (days === 1) s += " · demain";
    else if (days === 0) s += " · aujourd'hui";
  }
  return s;
}
function newCountries(p) {
  return new Set(p.stops.map(placeCountry).filter(c => c && !state.c.has(c))).size;
}
function renderPlans() {
  const box = $("plans");
  if (editPlan) return renderTrip(box);
  box.style.removeProperty("--trip");
  document.body.classList.remove("trip-open");
  const list = [...state.plans].sort((a, b) => a.done - b.done || (a.start || "9999").localeCompare(b.start || "9999"));
  box.innerHTML = `
    <div class="row between"><h1>Mes projets</h1>${list.length ? `<button class="btn small primary" id="p-new">Nouveau</button>` : ""}</div>
    ${list.length ? `<div class="block">${list.map(p => {
      const nc = newCountries(p), stops = p.stops.filter(place), t = tripTotals(p);
      return `
      <div class="plan" data-plan="${p.id}">
        <div class="row between"><h4><i class="tdot" style="background:${p.color}"></i>${esc(p.name)}</h4>${p.done ? `<span class="chip new">Fait ✓</span>` : ""}</div>
        ${planDates(p) ? `<div class="small">${esc(planDates(p))}</div>` : ""}
        <div class="small">${plural(stops.length, "étape", "étapes")}${t.nights ? " · " + plural(t.nights, "nuit", "nuits") : ""}${t.km ? " · " + fmtKm(t.km) : ""}${!p.done && nc ? ` · <b>${plural(nc, "nouveau pays", "nouveaux pays")}</b> à découvrir` : ""}</div>
        ${stops.length ? `<div class="chips">${stops.slice(0, 8).map(id => `<span class="chip ${isVisited(id) ? "" : "blue"}">${esc(placeName(id))}</span>`).join("")}${stops.length > 8 ? `<span class="chip">+${stops.length - 8}</span>` : ""}</div>` : ""}
        <div class="btns" style="margin-top:4px">
          <button class="btn small primary" data-act="open">Ouvrir le trip</button>
          ${!p.done && stops.length ? `<button class="btn small" data-act="done">C'est fait ✓</button>` : ""}
        </div>
      </div>`; }).join("")}</div>` : `
    <div class="block empty-state">
      <p style="margin-top:0">Organise ton prochain voyage, en avion ou en road trip : les villes étape par étape, les nuits, le trajet entre chaque étape, et ton itinéraire sur une carte. Une fois rentré, un appui suffit pour tout ajouter à ta carte.</p>
      <div class="btns" style="justify-content:center">
        <button class="btn primary" data-start="Mon prochain trip">Créer un trip</button>
      </div>
    </div>`}`;
  const start = name => { editPlan = { id: Date.now().toString(36), name, color: TRIP_COLORS[state.plans.length % TRIP_COLORS.length], setup: true, start: "", end: "", stops: [], nights: [], modes: [], snotes: [], spots: [], notes: "", done: false, isNew: true }; renderPlans(); };
  if ($("p-new")) $("p-new").onclick = () => start("Mon prochain trip");
  box.querySelectorAll("[data-start]").forEach(b => b.onclick = () => start(b.dataset.start));
  box.querySelectorAll("[data-plan]").forEach(el => {
    const p = state.plans.find(x => x.id === el.dataset.plan);
    el.querySelector('[data-act="open"]').onclick = () => { editPlan = copyPlan(p); tripCam = null; tripFocus = null; tripAdd = null; tripPanel = false; renderPlans(); $("view-plans").scrollTo(0, 0); };
    const done = el.querySelector('[data-act="done"]');
    if (done) done.onclick = () => {
      if (!done.dataset.armed) {
        done.dataset.armed = "1"; done.textContent = "Ajouter les étapes à ma carte ?";
        setTimeout(() => { if (done.isConnected) { delete done.dataset.armed; done.textContent = "C'est fait ✓"; } }, 4000);
        return;
      }
      const ts = p.start ? new Date(p.start + "T12:00").getTime() : 0;
      for (const id of p.stops.filter(place)) {
        if (isSite(id)) state.u.set(siteOfStop(id).id, ts);
        isCountry(id) ? setCountry(id, true, ts) : regionById.has(placeRegion(id)) ? setRegion(placeRegion(id), true, ts) : setCountry(placeCountry(id), true, ts);
      }
      p.done = true; save(); update();
      toast(`${p.name} : ${plural(p.stops.length, "étape ajoutée", "étapes ajoutées")} à ta carte ✓`, 3000);
    };
  });
}
const copyPlan = p => ({ ...p, stops: [...p.stops], nights: [...p.nights], modes: [...p.modes], snotes: [...(p.snotes || p.stops.map(() => ""))], spots: (p.spots || p.stops.map(() => [])).map(l => l.map(x => ({ ...x }))) });
function tripTotals(p) {
  let km = 0, h = 0, flights = 0;
  for (let i = 1; i < p.stops.length; i++) {
    if (!place(p.stops[i]) || !place(p.stops[i - 1])) continue;
    const l = legInfo(p, i);
    km += l.km; h += l.h; if (l.m === "plane") flights++;
  }
  return { km, h, flights, nights: d3.sum(p.nights) };
}
// dates de chaque étape, à partir du départ et des nuits
function stopDates(p, i) {
  if (!p.start) return "";
  const day = new Date(p.start + "T12:00");
  day.setDate(day.getDate() + d3.sum(p.nights.slice(0, i)));
  const f = d => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  if (!p.nights[i]) return "le " + f(day);
  const out = new Date(day); out.setDate(out.getDate() + p.nights[i]);
  return f(day) + " → " + f(out);
}
// La page d'un trip : sa carte, les étapes avec les nuits, et le trajet entre deux étapes.
// Chaque changement est enregistré tout de suite.
function commitTrip() {
  const p = editPlan;
  const clean = cleanPlans([{ ...p, name: p.name.trim() || "Mon projet", notes: p.notes.trim() }])[0];
  const i = state.plans.findIndex(x => x.id === p.id);
  if (i >= 0) state.plans[i] = clean; else state.plans.push(clean);
  p.isNew = false;
  save();
}
// Un trip se fait en deux temps : d'abord le nom, la couleur et les dates (« Valider »),
// puis la carte en plein écran où l'on ajoute les étapes.
let tripPanel = false; // liste des étapes dépliée sous la carte
function renderTrip(box) {
  const p = editPlan;
  p.color = p.color || TRIP_COLORS[0];
  box.style.setProperty("--trip", p.color);
  document.body.classList.toggle("trip-open", !p.setup);
  return p.setup ? renderTripSetup(box) : renderTripMap(box);
}
function renderTripSetup(box) {
  const p = editPlan;
  box.innerHTML = `
    <div class="row trip-top"><button class="icon-btn" id="e-back" aria-label="Retour">‹</button>
      <h1 class="grow" id="e-title">${p.isNew ? "Nouveau trip" : esc(p.name)}</h1></div>
    <div class="block">
      <div class="two">
        <label class="field" style="grid-column: 1 / -1">Nom du trip<input id="e-name" value="${esc(p.name)}" maxlength="60" placeholder="Ex. : Road trip en Italie" enterkeyhint="done"></label>
        <div class="field" style="grid-column: 1 / -1">Couleur du trip<div class="swatches">${TRIP_COLORS.map(c =>
          `<button type="button" class="swatch" data-color="${c}" style="--c:${c}" aria-label="Couleur ${c}" aria-pressed="${p.color === c}"></button>`).join("")}</div></div>
        <div class="field">Départ<button type="button" class="date-btn ${p.start ? "" : "empty"}" id="e-start">${p.start ? fmtDate(p.start) : "Choisir"}</button></div>
        <div class="field">Retour<button type="button" class="date-btn ${p.end ? "" : "empty"}" id="e-end">${p.end ? fmtDate(p.end) : "Choisir"}</button></div>
      </div>
      <p class="small" style="margin:10px 0 0">Les dates sont facultatives, tu pourras les changer plus tard.</p>
    </div>
    <div class="block">
      <label class="field">Notes<textarea id="e-notes" placeholder="Hébergements, budget, choses à voir…">${esc(p.notes)}</textarea></label>
    </div>
    <div class="btns" style="margin-top:0">
      <button class="btn primary" id="e-ok">${p.isNew ? "Valider et ouvrir la carte" : "Valider"}</button>
      ${!p.isNew ? `<button class="btn danger" id="e-del">Supprimer le trip</button>` : ""}
    </div>`;
  $("e-back").onclick = () => {
    if (p.isNew) { editPlan = null; renderPlans(); return; }
    p.setup = false; renderPlans();
  };
  $("e-name").oninput = e => { p.name = e.target.value; };
  $("e-name").onkeydown = e => { if (e.key === "Enter") e.target.blur(); };
  $("e-notes").oninput = e => { p.notes = e.target.value; };
  const dates = async toEnd => {
    const r = await pickDates(p.start, p.end, toEnd, d3.sum(p.nights));
    if (!r) return;
    p.start = r.start; p.end = r.end;
    renderPlans();
  };
  $("e-start").onclick = () => dates(false);
  $("e-end").onclick = () => dates(true);
  box.querySelectorAll("[data-color]").forEach(b => b.onclick = () => { p.color = b.dataset.color; renderPlans(); });
  $("e-ok").onclick = () => { p.setup = false; commitTrip(); tripCam = null; tripAdd = p.stops.length ? null : { id: "", nights: 1, mode: "" }; renderPlans(); };
  if ($("e-del")) $("e-del").onclick = e => {
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirmer la suppression"; return; }
    state.plans = state.plans.filter(x => x.id !== p.id);
    if (routePlan === p.id) routePlan = null;
    save(); editPlan = null; update(); renderPlans();
    toast("Trip supprimé", 1400);
  };
}
function renderTripMap(box) {
  const p = editPlan, t = tripTotals(p);
  const modeSel = (i, pl = p) => `<select data-leg="${i}" aria-label="Trajet vers l'étape ${i + 1}">${Object.entries(MODES).map(([k, [ic, n]]) =>
    `<option value="${k}" ${legMode(pl, i) === k ? "selected" : ""}>${ic} ${n}</option>`).join("")}</select>`;
  const sum = p.stops.length ? [plural(p.stops.length, "étape", "étapes"), t.nights ? plural(t.nights, "nuit", "nuits") : "", t.km ? fmtKm(t.km, true) : "", t.flights ? plural(t.flights, "vol", "vols") : ""].filter(Boolean).join(" · ") : "Aucune étape pour l'instant";
  // choix de la prochaine étape : le lieu, ses nuits et le trajet, puis « Valider l'étape »
  const n = p.stops.length, q = pendingPlan(p), ql = tripAdd?.id && n ? legInfo(q, n) : null;
  const addBox = !tripAdd ? "" : `<div class="tf-add-box">
    <div class="tf-add-head"><span class="n">${n + 1}</span><span class="t">${tripAdd.id
      ? `<b>${esc(placeName(tripAdd.id))}</b><small>${esc(placeSub(tripAdd.id) || "")}</small>`
      : `<b>Étape ${n + 1}</b><small>Touche un lieu sur la carte ou cherche-le en haut</small>`}</span></div>
    ${tripAdd.id ? `<div class="tf-add-opts">
      ${n ? `<span class="leg">${modeSel(n, q)}<span>${fmtKm(ql.km, ql.real)} · ${fmtDur(ql.h, ql.real)}</span></span>` : ""}
      <span class="nights"><button data-ant="-1" aria-label="Une nuit de moins" ${tripAdd.nights ? "" : "disabled"}>−</button><span>${tripAdd.nights ? plural(tripAdd.nights, "nuit", "nuits") : "0 nuit"}</span><button data-ant="1" aria-label="Une nuit de plus">+</button></span>
    </div>` : ""}
    <div class="btns"><button class="btn primary" id="e-ok-stop" ${tripAdd.id ? "" : "disabled"}>Valider l'étape</button><button class="btn" id="e-cancel-stop">Annuler</button></div>
    ${!n && state.w.size ? `<button class="linkish" id="e-wishes">ou reprendre mes ${plural(state.w.size, "envie", "envies")}</button>` : ""}
  </div>`;
  box.innerHTML = `
    <div class="trip-full">
      <svg id="trip-map" aria-label="Carte du trip"></svg>
      <div class="tf-top">
        <button class="icon-btn tf-btn" id="e-back" aria-label="Retour à mes projets">‹</button>
        <button class="tf-title" id="e-edit" aria-label="Modifier le nom, la couleur et les dates"><b>${esc(p.name)}</b><small>${esc(planDates(p) || "Sans dates")}</small><span>✎</span></button>
        <button class="icon-btn tf-btn" id="tm-fit" aria-label="Recentrer la carte">◎</button>
        ${tripAdd ? `<div class="add tf-search">
          <input id="e-q" type="search" placeholder="🔍 Chercher une ville, une région, un pays…" autocomplete="off" aria-label="Chercher une étape">
          <ul id="e-results" class="card results" hidden></ul>
        </div>` : ""}
      </div>
      <div class="tf-panel ${tripPanel ? "open" : ""}">
        ${tripAdd ? `<span class="tm-hint">${tripFocus ? "Touche une région, une ville ou un site ◆" : "Touche une ville ou un pays, ou cherche en haut"}</span>` : ""}
        ${p.stops.some((_, i) => i && ROAD[legMode(p, i)]) ? `<span class="tm-credit">Routes © OpenStreetMap</span>` : ""}
        ${tripAdd ? addBox : `
        ${p.stops.length ? `<button class="tf-handle" id="tf-toggle" aria-expanded="${tripPanel}"><i></i><span>${esc(sum)}</span><span class="chev">${tripPanel ? "▾" : "▴"}</span></button>` : ""}
        ${tripPanel && p.stops.length ? `<div class="tf-list">
          <ol class="itin">${p.stops.map((id, i) => {
            const l = i && legInfo(p, i);
            return `${i ? `<li class="leg">${modeSel(i)}<span>${fmtKm(l.km, l.real)} · ${fmtDur(l.h, l.real)}</span></li>` : ""}
            <li class="istop" data-i="${i}">
              <span class="n">${i + 1}</span>
              <span class="t"><b>${esc(placeName(id))}</b><small>${esc([placeSub(id), stopDates(p, i), p.spots[i].length ? plural(p.spots[i].length, "spot", "spots") : "", p.snotes[i] ? "📝" : ""].filter(Boolean).join(" · "))}</small><em class="open-hint">Notes, spots, hébergement ›</em></span>
              <span class="nights"><button data-nt="-1" aria-label="Une nuit de moins" ${p.nights[i] ? "" : "disabled"}>−</button><span>${p.nights[i] ? plural(p.nights[i], "nuit", "nuits") : "0 nuit"}</span><button data-nt="1" aria-label="Une nuit de plus">+</button></span>
              <span class="moves"><button class="icon-btn" data-rm aria-label="Retirer ${esc(placeName(id))}">✕</button>${p.stops.length > 1 ? `<span class="grip" aria-label="Glisser pour changer l'ordre" title="Glisser pour changer l'ordre">≡</span>` : ""}</span>
            </li>`; }).join("")}
          </ol>
          <div class="btns"><button class="btn small" id="e-big">Voir sur ma carte</button></div>
        </div>` : ""}
        <button class="btn primary tf-add" id="e-add">＋ Ajouter une étape</button>`}
      </div>
    </div>`;
  const redo = () => { commitTrip(); renderPlans(); };
  $("e-back").onclick = () => { if (!p.isNew || p.stops.length) commitTrip(); editPlan = null; document.body.classList.remove("trip-open"); update(); renderPlans(); };
  $("e-edit").onclick = () => { p.setup = true; renderPlans(); $("view-plans").scrollTo(0, 0); };
  if ($("tf-toggle")) $("tf-toggle").onclick = () => { tripPanel = !tripPanel; renderPlans(); };
  if ($("e-add")) $("e-add").onclick = () => { tripAdd = { id: "", nights: 1, mode: "" }; tripPanel = false; renderPlans(); };
  if (tripAdd) {
    bindSearch($("e-q"), $("e-results"), true, h => h.k, (c, r, city, site, h) => {
      const id = city && h?.city ? cityId(h.city, r) : r || c;
      if (p.stops[p.stops.length - 1] === id) { toast("C'est déjà ta dernière étape", 1400); return; }
      tripAdd = { id, nights: tripAdd.nights, mode: "" };
      tripCam = null; // la carte se recadre sur l'étape proposée
      renderPlans();
    });
    box.querySelectorAll("[data-ant]").forEach(b => b.onclick = () => { tripAdd.nights = Math.max(0, Math.min(99, tripAdd.nights + +b.dataset.ant)); renderPlans(); });
    const ls = box.querySelector(".tf-add-box [data-leg]");
    if (ls) ls.onchange = () => { tripAdd.mode = ls.value; renderPlans(); };
    $("e-cancel-stop").onclick = () => { tripAdd = null; renderPlans(); };
    $("e-ok-stop").onclick = () => {
      if (!tripAdd.id || !addTripStop(p, tripAdd.id)) return;
      p.nights[p.nights.length - 1] = tripAdd.nights;
      p.modes[p.modes.length - 1] = tripAdd.mode;
      tripAdd = null; tripPanel = false;
      tripCam = null; // carte en plein écran sur tout le trip
      commitTrip(); renderPlans();
      toast(`Étape ${p.stops.length} ajoutée ✓`, 1400);
    };
  }
  if ($("e-wishes")) $("e-wishes").onclick = () => {
    for (const id of state.w.keys()) if (place(id) && !p.stops.includes(id)) { p.stops.push(id); p.nights.push(1); p.modes.push(""); p.snotes.push(""); p.spots.push([]); }
    tripAdd = null; tripCam = null; redo();
  };
  box.querySelectorAll(".tf-list [data-leg]").forEach(sel => sel.onchange = () => { p.modes[+sel.dataset.leg] = sel.value; redo(); });
  box.querySelectorAll(".istop").forEach(li => {
    const i = +li.dataset.i;
    li.querySelectorAll("[data-nt]").forEach(b => b.onclick = () => { p.nights[i] = Math.max(0, Math.min(99, p.nights[i] + +b.dataset.nt)); redo(); });
    li.querySelector("[data-rm]").onclick = () => { removeTripStop(p, i); redo(); };
    li.querySelector(".t").onclick = () => stopSheet(p, i);
    // glisser la poignée pour changer l'ordre
    const handle = li.querySelector(".grip");
    if (handle) handle.onpointerdown = e => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const items = [...box.querySelectorAll(".istop")], y0 = e.clientY;
      const mids = items.map(x => { const r = x.getBoundingClientRect(); return r.top + r.height / 2; });
      let to = i;
      li.classList.add("dragging");
      handle.onpointermove = ev => {
        const dy = ev.clientY - y0;
        li.style.transform = `translateY(${dy}px)`;
        const y = mids[i] + dy;
        to = mids.filter(m => m < y).length - (mids[i] < y ? 1 : 0);
        to = Math.max(0, Math.min(items.length - 1, to));
        items.forEach((x, k) => x.classList.toggle("drop-here", k === to && k !== i));
      };
      handle.onpointerup = handle.onpointercancel = () => {
        handle.onpointermove = handle.onpointerup = handle.onpointercancel = null;
        li.classList.remove("dragging"); li.style.transform = "";
        if (to !== i) { moveTripStop(p, i, to); redo(); }
        else items.forEach(x => x.classList.remove("drop-here"));
      };
    };
  });
  if ($("e-big")) $("e-big").onclick = () => { commitTrip(); const id = p.id; editPlan = null; document.body.classList.remove("trip-open"); renderPlans(); showRoute(id); };
  $("tm-fit").onclick = () => { tripCam = null; drawTripMap(p); };
  drawTripMap(p);
}
// régions traversées par un trajet routier (calcul gardé en mémoire)
const featBounds = new Map(), routeRegions = new Map();
const inBounds = (f, [x, y]) => {
  if (!featBounds.has(f)) featBounds.set(f, d3.geoBounds(f));
  const [[x0, y0], [x1, y1]] = featBounds.get(f);
  return y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);
};
function regionsOnRoute(coords) {
  const key = coords[0] + ";" + coords[coords.length - 1] + ";" + coords.length;
  if (routeRegions.has(key)) return routeRegions.get(key);
  const out = new Set(), step = Math.max(1, Math.floor(coords.length / 150));
  let last = null;
  for (let i = 0; i < coords.length; i += step) {
    const pt = coords[i];
    if (last && inBounds(last, pt) && d3.geoContains(last, pt)) continue;
    const c = countries.find(f => inBounds(f, pt) && d3.geoContains(f, pt));
    const r = c && (regionsBy.get(c.id) || []).find(f => inBounds(f, pt) && d3.geoContains(f, pt));
    if (r) { out.add(r.id); last = r; }
  }
  const list = [...out];
  routeRegions.set(key, list);
  return list;
}
// Vue de la carte du trip : gardée tant qu'on modifie le même trip, pour que la carte ne saute pas
let tripCam = null, tripBig = false;
let tripFocus = null, tripFocusGo = false; // pays ouvert sur la carte du trip (ses régions et ses sites)
// étape en train d'être choisie : { id, nights, mode } (id vide tant qu'aucun lieu n'est touché)
let tripAdd = null;
const pendingPlan = p => !tripAdd?.id ? p : { ...p, stops: [...p.stops, tripAdd.id], nights: [...p.nights, tripAdd.nights], modes: [...p.modes, tripAdd.mode], snotes: [...p.snotes, ""], spots: [...p.spots, []] };
function addTripStop(p, id) {
  if (p.stops[p.stops.length - 1] === id) return false;
  p.stops.push(id); p.nights.push(1); p.modes.push(""); p.snotes.push(""); p.spots.push([]);
  return true;
}
function moveTripStop(p, i, j) {
  if (i === j) return;
  for (const a of [p.stops, p.nights, p.modes, p.snotes, p.spots]) a.splice(j, 0, a.splice(i, 1)[0]);
  // les trajets autour des étapes déplacées sont recalculés
  for (const k of [i, i + 1, j, j + 1]) if (k < p.modes.length) p.modes[k] = "";
}
function removeTripStop(p, i) {
  for (const a of [p.stops, p.nights, p.modes, p.snotes, p.spots]) a.splice(i, 1);
  if (i < p.modes.length) p.modes[i] = "";
}
// jours d'arrivée et de départ d'une étape (AAAA-MM-JJ), quand le trip a une date de départ
function stopDays(p, i) {
  if (!p.start) return null;
  const d = new Date(p.start + "T12:00");
  d.setDate(d.getDate() + d3.sum(p.nights.slice(0, i)));
  const out = new Date(d); out.setDate(out.getDate() + Math.max(1, p.nights[i] || 0));
  return { in: isoDay(d), out: isoDay(out) };
}
// liens de recherche d'hébergement, préremplis avec le lieu et les dates de l'étape
function stayLinks(p, i) {
  const id = p.stops[i], c = placeCountry(id);
  const q = [placeName(id), c && !isCountry(id) ? byId.get(c)?.properties.n : ""].filter(Boolean).join(", ");
  const d = stopDays(p, i), e = encodeURIComponent;
  return [
    ["Booking.com", "booking", `https://www.booking.com/searchresults.fr.html?ss=${e(q)}${d ? `&checkin=${d.in}&checkout=${d.out}` : ""}&group_adults=2&no_rooms=1`],
    ["Airbnb", "airbnb", `https://www.airbnb.fr/s/${e(q)}/homes?adults=2${d ? `&checkin=${d.in}&checkout=${d.out}` : ""}`],
    ["Google Hôtels", "google", `https://www.google.com/travel/search?q=${e("hôtels " + q)}${d ? `&checkin=${d.in}&checkout=${d.out}` : ""}`]
  ];
}
// photos d'une étape : celles du site, sinon l'article Wikipédia de la ville, de la région ou du pays
function stopPhotoKey(id) {
  if (isSite(id)) return siteOfStop(id);
  const c = placeCountry(id), cn = byId.get(c)?.properties.n || "";
  return { id: "stop:" + id, n: placeName(id), lang: "fr", q: isCountry(id) ? placeName(id) : placeName(id) + " " + cn };
}
// Fiche d'une étape : photos, dates et nuits, notes, hébergement
function stopSheet(p, i) {
  document.querySelector(".ss-back")?.remove();
  const back = document.createElement("div");
  back.className = "mp-back ss-back";
  back.style.setProperty("--trip", p.color || TRIP_COLORS[0]);
  document.body.append(back);
  const id = p.stops[i];
  let saveT = 0;
  const close = () => { clearTimeout(saveT); commitTrip(); back.remove(); renderPlans(); };
  const draw = () => {
    const d = stopDays(p, i);
    back.innerHTML = `<div class="card ss" role="dialog" aria-label="Étape ${i + 1} : ${esc(placeName(id))}">
      <button class="icon-btn ss-x" data-ss="close" aria-label="Fermer">✕</button>
      <div class="ss-photo" id="ss-photo" hidden></div>
      <div class="ss-in">
        <div class="ss-head"><span class="n">${i + 1}</span><span class="t"><b>${esc(placeName(id))}</b><small>${esc(placeSub(id) || "")}</small></span></div>
        <div class="ss-when">
          <span>📅 ${d ? esc(stopDates(p, i)) : "Ajoute une date de départ au trip pour voir les dates"}</span>
          <span class="nights"><button data-ss="nt-" aria-label="Une nuit de moins" ${p.nights[i] ? "" : "disabled"}>−</button><span>${p.nights[i] ? plural(p.nights[i], "nuit", "nuits") : "0 nuit"}</span><button data-ss="nt+" aria-label="Une nuit de plus">+</button></span>
        </div>
        <label class="field">Notes<textarea id="ss-notes" placeholder="À faire, adresses, idées…">${esc(p.snotes[i] || "")}</textarea></label>
        <h4>Spots et activités</h4>
        <ul class="ss-spots">${p.spots[i].map((x, k) => `<li class="${x.done ? "done" : ""}">
          <button class="ss-check" data-sp-done="${k}" aria-pressed="${x.done}" aria-label="${x.done ? "Pas encore fait" : "Fait"}">${x.done ? "✓" : ""}</button>
          ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.n)}</a>` : `<span>${esc(x.n)}</span>`}
          <button class="icon-btn" data-sp-rm="${k}" aria-label="Retirer ${esc(x.n)}">✕</button></li>`).join("")}</ul>
        <div class="ss-sugg" id="ss-sugg" hidden></div>
        <p class="ss-sub">Ajouter mon spot ou mon activité</p>
        <form class="ss-add" id="ss-add"><input id="ss-spot" placeholder="Ex. : resto, rooftop, balade…" maxlength="140" enterkeyhint="done"><button class="btn small primary">Ajouter</button></form>
        ${p.nights[i] ? `<h4>Trouver un hébergement</h4>
        <div class="ss-stays">${stayLinks(p, i).map(([n, k, url]) => `<a class="ss-stay ${k}" href="${esc(url)}" target="_blank" rel="noopener"><b>${n}</b><span>${esc(placeName(id))}${d ? " · " + esc(stopDates(p, i)) : ""}</span><i>›</i></a>`).join("")}</div>` : ""}
        <div class="btns"><button class="btn danger" data-ss="rm">Retirer cette étape</button></div>
      </div></div>`;
    back.querySelector('[data-ss="close"]').onclick = close;
    back.querySelectorAll('[data-ss^="nt"]').forEach(b => b.onclick = () => {
      p.nights[i] = Math.max(0, Math.min(99, p.nights[i] + (b.dataset.ss === "nt+" ? 1 : -1)));
      p.snotes[i] = $("ss-notes").value; commitTrip(); draw();
    });
    const keep = () => { p.snotes[i] = $("ss-notes").value; commitTrip(); const y = back.querySelector(".ss").scrollTop; draw(); back.querySelector(".ss").scrollTop = y; };
    $("ss-add").onsubmit = e => {
      e.preventDefault();
      const n = $("ss-spot").value.trim();
      if (!n) return;
      p.spots[i].push({ n, done: false, url: "", img: "" }); keep();
      $("ss-spot").focus();
    };
    back.querySelectorAll("[data-sp-done]").forEach(b => b.onclick = () => { const x = p.spots[i][+b.dataset.spDone]; x.done = !x.done; keep(); });
    back.querySelectorAll("[data-sp-rm]").forEach(b => b.onclick = () => { p.spots[i].splice(+b.dataset.spRm, 1); keep(); });
    showSuggestions(p, i, keep);
    $("ss-notes").oninput = e => { p.snotes[i] = e.target.value; clearTimeout(saveT); saveT = setTimeout(commitTrip, 600); };
    back.querySelector('[data-ss="rm"]').onclick = e => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirmer : retirer l'étape"; return; }
      back.remove(); removeTripStop(p, i); commitTrip(); renderPlans(); toast("Étape retirée", 1200);
    };
    showStopPhoto(id);
  };
  back.onclick = e => { if (e.target === back) close(); };
  // glisser vers le bas depuis le haut de la fiche la ferme
  let y0 = null;
  back.addEventListener("touchstart", e => { const ss = back.querySelector(".ss"); y0 = ss && ss.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  back.addEventListener("touchend", e => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 110) close(); y0 = null; });
  draw();
}
// Idées autour de l'étape : les sites UNESCO proches, puis les lieux les plus connus alentour
// (Wikidata, classés par nombre d'articles Wikipédia), et en dernier recours les articles géolocalisés proches
const suggCache = new Map();
// types Wikidata qui ne sont pas des choses à voir : villes, quartiers, gares, écoles, routes, entreprises…
const NOT_SPOTS = "Q515 Q1549591 Q3957 Q532 Q5084 Q123705 Q2983893 Q15284 Q484170 Q747074 Q1637706 Q200250 Q5119 Q6256 Q3624078 Q55488 Q1248784 Q644371 Q3914 Q3918 Q9842 Q159334 Q16917 Q34442 Q79007 Q4830453 Q43229 Q476028 Q1093829 Q10864048 Q13220204 Q1907114 Q2221906 Q15640612 Q1195098 Q6881511 Q891723 Q7930989 Q50330360 Q17343829 Q928830 Q4022 Q2085381 Q23058 Q15925165 Q484652 Q163740 Q31855 Q327333 Q7210356 Q2659904 Q245065 Q1194093";
// ce qui se visite : monuments protégés, ou un type « à voir » (musée, église, château, parc, lac, plage…)
const SPOT_TYPES = "Q570116 Q33506 Q207694 Q16970 Q2977 Q32815 Q23413 Q16560 Q4989906 Q174782 Q483453 Q23397 Q40080 Q8502 Q1107656 Q167346 Q676050 Q15243209 Q6017969 Q12280 Q12518 Q37654 Q43501 Q34038 Q44539 Q34627 Q839954 Q194195 Q153562 Q24354 Q46169 Q23442 Q25391 Q43483 Q8514 Q22698 Q1785071 Q57821 Q35509 Q4421";
async function wikidataSpots(lon, lat, km, strict) {
  const q = `SELECT ?item ?label ?labelEn ?desc ?img ?art ?links WHERE {
  SERVICE wikibase:around { ?item wdt:P625 ?loc . bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral ; wikibase:radius "${km}" . }
  ?item wikibase:sitelinks ?links . FILTER(?links >= 4)
  FILTER NOT EXISTS { ?item wdt:P31 ?t . VALUES ?t { ${NOT_SPOTS.split(" ").map(x => "wd:" + x).join(" ")} } }
  ${strict ? `FILTER EXISTS { { ?item wdt:P1435 [] } UNION { ?item wdt:P31/wdt:P279* ?tc . VALUES ?tc { ${SPOT_TYPES.split(" ").map(x => "wd:" + x).join(" ")} } } }` : ""}
  OPTIONAL { ?item wdt:P18 ?img }
  OPTIONAL { ?art schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> }
  OPTIONAL { ?item rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  OPTIONAL { ?item rdfs:label ?labelEn . FILTER(LANG(?labelEn) = "en") }
  OPTIONAL { ?item schema:description ?desc . FILTER(LANG(?desc) = "fr") }
} ORDER BY DESC(?links) LIMIT 40`;
  const d = await fetch("https://query.wikidata.org/sparql?" + new URLSearchParams({ format: "json", query: q })).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!d) return null;
  const out = [], seen = new Set();
  for (const b of d.results?.bindings || []) {
    const n = b.label?.value || b.labelEn?.value;
    if (!n || seen.has(b.item.value)) continue;
    seen.add(b.item.value);
    const img = b.img ? b.img.value.replace(/^http:/, "https:") + "?width=400" : "";
    out.push({ n, img, url: b.art?.value || b.item.value.replace(/^http:/, "https:"), kind: b.desc?.value || "" });
  }
  return out;
}
async function wikiNearby(lon, lat, home) {
  const d = await fetch("https://fr.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", action: "query",
    generator: "geosearch", ggscoord: lat + "|" + lon, ggsradius: "10000", ggslimit: "50",
    prop: "pageimages|description|info", piprop: "thumbnail", pithumbsize: "400", inprop: "url" })).then(r => r.json()).catch(() => null);
  const skip = /\b(commune|ville|village|douar|localité|municipalité|quartier|arrondissement|gare|aéroport|autoroute|école|lycée|université|hôpital|club|entreprise|circonscription|province|région|département|canton)\b/i;
  const out = [];
  for (const pg of Object.values(d?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0))) {
    if (norm(pg.title) === home || skip.test(pg.description || "")) continue;
    out.push({ n: pg.title, img: pg.thumbnail?.source || "", url: pg.fullurl, kind: pg.description || "" });
  }
  return out.sort((a, b) => !a.img - !b.img);
}
async function stopSuggestions(id) {
  if (suggCache.has(id)) return suggCache.get(id);
  const r = (async () => {
    const [lon, lat] = centroid(id), out = [];
    const near = isCity(id) || isSite(id);
    const home = norm(placeName(id));
    const add = x => { if (x.n && norm(x.n) !== home && !out.some(o => norm(o.n) === norm(x.n))) out.push(x); };
    const local = isCountry(id) ? sitesBy.get(id) || [] : sites.filter(st => d3.geoDistance([st.lon, st.lat], [lon, lat]) * 6371 < (near ? 40 : 120));
    for (const st of local) add({ n: st.n, img: "", url: st.wiki ? "https://fr.wikipedia.org/wiki/" + encodeURIComponent(st.wiki) : "", kind: st.wonder ? "7 merveilles du monde" : "Patrimoine mondial UNESCO", site: st });
    if (isCountry(id)) return out;
    const km = near ? 15 : 60;
    // seulement les lieux touristiques ; la liste large ne sert que si la recherche stricte n'a rien donné
    const tour = await wikidataSpots(lon, lat, km, true);
    (tour || []).forEach(add);
    if (!tour || tour.length < 3) (await wikidataSpots(lon, lat, km, false) || []).forEach(add);
    if (out.length < 6) (await wikiNearby(lon, lat, home)).forEach(add);
    // une photo pour les sites UNESCO, quand Wikipédia en a une
    await Promise.all(out.filter(x => x.site && !x.img).slice(0, 8).map(async x => { const ph = await fetchPhoto(x.site); if (ph) x.img = ph.list[0]; }));
    return out.slice(0, 20);
  })().catch(() => []);
  suggCache.set(id, r);
  r.then(l => { if (!l.length) suggCache.delete(id); }); // rien trouvé (hors ligne ?) : on réessaiera
  return r;
}
async function showSuggestions(p, i, keep) {
  const box = $("ss-sugg"), id = p.stops[i];
  if (!box) return;
  if (!suggCache.has(id)) { box.innerHTML = `<p class="small">Recherche des incontournables…</p>`; box.hidden = false; }
  const all = await stopSuggestions(id);
  if ($("ss-sugg") !== box) return;
  const have = new Set(p.spots[i].map(x => norm(x.n)));
  const list = all.filter(x => !have.has(norm(x.n)));
  if (!list.length) { box.innerHTML = all.length ? "" : `<p class="small">Pas d'idée trouvée ici pour l'instant (connexion ?). Ajoute tes propres spots ci-dessous.</p>`; box.hidden = !box.innerHTML; return; }
  box.innerHTML = `<p class="ss-sub">Incontournables à ${esc(placeName(id))} <span>touche ＋ pour l'ajouter</span></p><div class="ss-cards">${list.map((x, k) => `
    <div class="ss-card">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy">` : `<div class="ss-noimg">${x.site ? (x.site.wonder ? "★" : "◆") : "📍"}</div>`}
      <button class="ss-plus" data-sg="${k}" aria-label="Ajouter ${esc(x.n)}">＋</button>
      <small>${esc(x.kind)}</small>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.n)}</a>` : `<b>${esc(x.n)}</b>`}</div>`).join("")}</div>`;
  box.hidden = false;
  box.querySelectorAll("img").forEach(img => img.onerror = () => img.remove());
  box.querySelectorAll("[data-sg]").forEach(b => b.onclick = () => {
    const x = list[+b.dataset.sg];
    p.spots[i].push({ n: x.n, done: false, url: x.url || "", img: x.img || "" });
    keep(); toast(x.n + " ajouté ✓", 1200);
  });
}
async function showStopPhoto(id) {
  const box = $("ss-photo");
  if (!box) return;
  const photo = await fetchPhoto(stopPhotoKey(id));
  if (!photo || $("ss-photo") !== box) return;
  const many = photo.list.length > 1;
  box.innerHTML = `<div class="slides">${photo.list.map((src, i) => `<img src="${esc(src)}" alt="${esc(placeName(id))} (${i + 1})" loading="${i ? "lazy" : "eager"}">`).join("")}</div>
    ${many ? `<div class="dots">${photo.list.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
    <a href="${esc(photo.url)}" target="_blank" rel="noopener">Photos : Wikipédia · ${esc(photo.title)}</a>`;
  box.hidden = false;
  const slides = box.querySelector(".slides");
  slides.querySelectorAll("img").forEach(img => img.onerror = () => { img.remove(); if (!slides.children.length) box.hidden = true; });
  if (many) slides.onscroll = () => {
    const k = Math.round(slides.scrollLeft / slides.clientWidth);
    box.querySelectorAll(".dots i").forEach((d, j) => d.classList.toggle("on", k === j));
  };
}
function drawTripMap(p0) {
  // l'étape en cours de choix apparaît déjà sur la carte, avec son trajet
  const p = pendingPlan(p0), pend = p !== p0;
  const el = $("trip-map");
  if (!el) return;
  const W = el.clientWidth || 360, H = el.clientHeight || 260;
  // la barre du haut et le panneau du bas couvrent une partie de la carte
  const padT = (document.querySelector(".tf-top")?.offsetHeight || 80) + 16, padB = Math.min(H * .6, (document.querySelector(".tf-panel")?.offsetHeight || 0) + 24);
  const ids = p.stops.map((id, i) => i).filter(i => place(p.stops[i]));
  const pts = ids.map(i => centroid(p.stops[i]));
  // même carte que l'onglet Carte : même projection, même cadrage de départ
  const proj = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - 10]], { type: "Sphere" });
  const path = d3.geoPath(proj);
  const fitT = ([[x0, y0], [x1, y1]], maxK) => {
    const kk = Math.max(1, Math.min(maxK, .85 / Math.max((x1 - x0) / W, (y1 - y0) / (H - padT - padB), 1e-6)));
    return d3.zoomIdentity.translate(W / 2 - kk * (x0 + x1) / 2, (padT + H - padB) / 2 - kk * (y0 + y1) / 2).scale(kk);
  };
  let cam = tripCam && tripCam.id === p.id ? tripCam : null;
  if (!cam) {
    let t;
    if (pts.length) {
      const P0 = pts.map(d => proj(d));
      t = fitT([[d3.min(P0, d => d[0]), d3.min(P0, d => d[1])], [d3.max(P0, d => d[0]), d3.max(P0, d => d[1])]], pts.length < 2 ? 25 : 150);
    } else {
      const b = path.bounds({ type: "FeatureCollection", features: countries });
      const kk = Math.max(1, Math.min(1.9, (H - padT - padB) / (b[1][1] - b[0][1])));
      t = d3.zoomIdentity.translate(W / 2, (padT + H - padB) / 2).scale(kk).translate(-proj([2, 0])[0], -(b[0][1] + b[1][1]) / 2);
    }
    cam = tripCam = { id: p.id, t };
  }
  const svgT = d3.select(el);
  svgT.selectAll("*").remove();
  const g = svgT.append("g");
  g.selectAll(".ocean-name").data(OCEANS).join("text").attr("class", "ocean-name").attr("text-anchor", "middle")
    .call(t => { t.append("tspan").attr("x", 0).attr("dy", "-.2em").text("Océan"); t.append("tspan").attr("x", 0).attr("dy", "1.25em").text(d => d[0]); });
  g.selectAll(".tm-land").data(countries).join("path")
    .attr("class", "country tm-land").attr("d", path);
  // régions des étapes en couleur du trip, plus légères celles traversées par la route
  const legs = ids.slice(1).map(i => legInfo(p, i));
  const onIds = new Set(ids.map(i => placeRegion(p.stops[i])));
  const passIds = new Set(legs.flatMap(l => l.road ? regionsOnRoute(l.road) : []));
  const codes = new Set([...ids.map(i => placeCountry(p.stops[i])), ...[...passIds].map(id => regionById.get(id)?.code)].filter(Boolean));
  g.selectAll(".tm-land").classed("on", d => onIds.has(d.id) && !(regionsBy.get(d.id) || []).length);
  g.selectAll(".tm-reg").data([...codes].flatMap(c => regionsBy.get(c) || [])).join("path")
    .attr("class", d => "tm-reg" + (onIds.has(d.id) || onIds.has(d.code) ? " on" : passIds.has(d.id) ? " pass" : "")).attr("d", path);
  // pays touché : on l'ouvre comme sur la carte principale
  // toucher un lieu le propose comme prochaine étape, à valider en bas
  const addStop = id => {
    if (p0.stops[p0.stops.length - 1] === id) { toast("C'est déjà ta dernière étape", 1400); return; }
    tripAdd = { id, nights: tripAdd?.nights ?? 1, mode: "" };
    tripPanel = false;
    renderPlans();
  };
  g.selectAll(".tm-land").on("click", (e, d) => {
    e.stopPropagation();
    if (tripFocus === d.id) return;
    tripFocus = d.id; tripFocusGo = true;
    // on attend les contours détaillés (une seconde au plus) avant de zoomer
    Promise.race([ensureDetail(d.id), new Promise(r => setTimeout(r, 1200))]).then(() => { if (tripFocus === d.id && $("trip-map")) drawTripMap(p0); });
  });
  const hint = document.querySelector(".tm-hint");
  if (hint) hint.textContent = tripFocus ? "Touche une région, une ville ou un site ◆ pour l'ajouter" : "Touche un pays pour l'ouvrir, ou une ville";
  const det = tripFocus && details.get(tripFocus);
  const focusRegions = tripFocus ? (det && det.regions ? det.regions : regionsBy.get(tripFocus) || []) : [];
  g.selectAll(".tm-freg").data(focusRegions, d => d.id).join("path").attr("class", "tm-freg").attr("d", path)
    .on("click", (e, d) => { e.stopPropagation(); addStop(d.id, d.properties.n); });
  if (tripFocus) g.append("path").datum(det && det.outline ? det.outline : byId.get(tripFocus)).attr("class", "tm-focus").attr("d", path);
  const P = pts.map(d => proj(d));
  g.selectAll(".route").data(ids.slice(1).map((i, j) => [P[j], P[j + 1], legMode(p, i), legInfo(p, i).road])).join("path")
    .attr("class", d => "route m-" + d[2]).attr("d", d => d[3] ? d3.line()(d[3].map(c => proj(c))) : legPath(d[0], d[1], d[2]));
  // un petit avion au milieu de chaque vol, dans le sens du trajet
  const planes = g.selectAll(".tm-plane").data(ids.slice(1).map((i, j) => [P[j], P[j + 1], legMode(p, i)]).filter(d => d[2] === "plane").map(([a, b]) => {
    const c = legPath(a, b, "plane").split("Q")[1].split(" ")[0].split(",").map(Number);
    return { x: .25 * a[0] + .5 * c[0] + .25 * b[0], y: .25 * a[1] + .5 * c[1] + .25 * b[1], r: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  })).join("text").attr("class", "tm-plane").text("✈");
  // villes à toucher pour les ajouter : les plus grandes de la zone visible, assez espacées
  // villes à toucher pour les ajouter : comme sur l'onglet Carte, les plus grandes de loin, les petites en zoomant
  const gC = g.append("g");
  const drawCities = t => {
    const minPop = Math.max(10, 8000 / Math.pow(t.k, 1.3));
    const boxes = P.map(q => { const x = t.applyX(q[0]), y = t.applyY(q[1]); return [x - 16, y - 16, x + 140, y + 16]; });
    const picked = [];
    for (const c of cities) {
      if (c.pop < minPop) break;
      if (tripFocus && c.code !== tripFocus) continue;
      const q = proj([c.lon, c.lat]), x = t.applyX(q[0]), y = t.applyY(q[1]);
      if (x < 0 || y < padT || x > W || y > H - padB + 20) continue;
      const b = [x - 24, y - 18, x + c.n.length * 5.6 + 28, y + 18];
      if (boxes.some(o => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue;
      boxes.push(b);
      picked.push({ x: q[0], y: q[1], c });
      if (picked.length >= 20) break;
    }
    gC.selectAll(".tm-city").data(picked, d => d.c.n + d.c.lon).join(enter => {
      const m = enter.append("g").attr("class", "city tm-city");
      m.append("circle").attr("class", "hit").attr("r", 16);
      m.append("circle").attr("class", "dot").attr("r", 2.2);
      m.append("text").attr("x", 5).attr("dy", "0.35em").text(d => d.c.n);
      m.on("click", (e, d) => {
        e.stopPropagation();
        const r = regionIn(d.c.code, d.c.lon, d.c.lat);
        addStop(cityId(d.c, r ? r.id : d.c.code), d.c.n);
      });
      return m;
    }).attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / t.k})`);
  };
  const gS = g.append("g");
  const sitesT = (tripFocus ? sitesBy.get(tripFocus) || [] : []).map(st => { const [x, y] = proj([st.lon, st.lat]); return { x, y, st }; });
  gS.selectAll(".tm-site").data(sitesT).join(enter => {
    const m = enter.append("g").attr("class", d => "tm-site site" + (d.st.wonder ? " wonder" : ""));
    m.append("circle").attr("class", "hit").attr("r", 14);
    m.append("path").attr("d", d => d.st.wonder ? STAR : "M0,-7L7,0L0,7L-7,0Z");
    return m;
  }).on("click", (e, d) => {
    e.stopPropagation();
    const r = regionIn(siteHome(d.st), d.st.lon, d.st.lat);
    addStop(`#${d.st.id}|${r ? r.id : siteHome(d.st)}`, short(d.st.n));
  });
  const marks = g.selectAll(".tm-mark").data(P.map((xy, j) => ({ x: xy[0], y: xy[1], n: j + 1, i: ids[j], name: placeName(p.stops[ids[j]]) })))
    .join(enter => { const m = enter.append("g").attr("class", "tm-mark"); m.append("circle").attr("r", 11); m.append("text").attr("class", "num"); m.append("text").attr("class", "lbl").attr("x", 15).attr("dy", "0.35em"); return m; })
    .classed("pending", d => pend && d.i === p0.stops.length)
    .on("click", (e, d) => { e.stopPropagation(); if (d.i < p0.stops.length) stopSheet(p0, d.i); });
  marks.select(".num").text(d => d.n);
  marks.select(".lbl").text(d => d.name.length > 18 ? d.name.slice(0, 17) + "…" : d.name);
  const place2 = kk => {
    g.selectAll(".ocean-name").attr("transform", d => { const [x, y] = proj([d[1], d[2]]); return `translate(${x},${y}) scale(${1 / kk})`; }).style("opacity", kk > 5 ? 0 : null);
    marks.attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / kk})`);
    planes.attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / kk}) rotate(${d.r})`);
    gC.selectAll(".tm-city").attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / kk})`);
    gS.selectAll(".tm-site").attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / kk})`);
    // étiquette à gauche quand une autre étape est juste à droite
    const left = d => marks.data().some(o => o !== d && o.x > d.x && (o.x - d.x) * kk < 110 && Math.abs(o.y - d.y) * kk < 18);
    marks.select(".lbl").attr("x", d => left(d) ? -15 : 15).attr("text-anchor", d => left(d) ? "end" : "start");
  };
  const zoomT = d3.zoom().scaleExtent([.3, 600])
    .on("zoom", e => { g.attr("transform", e.transform); place2(e.transform.k); cam.t = e.transform; })
    .on("end", e => drawCities(e.transform));
  svgT.call(zoomT).on("dblclick.zoom", null);
  svgT.call(zoomT.transform, cam.t);
  drawCities(cam.t);
  // toucher la mer referme le pays ouvert
  svgT.on("click", () => { if (tripFocus) { tripFocus = null; drawTripMap(p0); } });
  if (tripFocusGo && tripFocus && byId.get(tripFocus)) {
    tripFocusGo = false;
    const t = fitT(path.bounds(mainParts(byId.get(tripFocus))), 600);
    svgT.transition().duration(reduceMotion() ? 0 : 650).call(zoomT.transform, t);
  }
}

/* ---------- Recherches ---------- */
function searchHits(s, withRegions, withSites = false, extra = []) {
  const hits = [];
  for (const f of countries) if (norm(f.properties.n).includes(s)) hits.push({ n: f.properties.n, k: "pays", c: f.id });
  for (const [key, nt] of Object.entries(UK_NATIONS)) if (key !== "OVS" && norm(nt.n).includes(s)) hits.push({ n: nt.n, k: "Royaume-Uni", c: "GBR", nation: key });
  hits.sort((a, b) => norm(a.n).indexOf(s) - norm(b.n).indexOf(s));
  if (withRegions && s.length >= 3) for (const r of regionById.values()) {
    if (hits.length > 30) break;
    if (norm(r.properties.n).includes(s)) hits.push({ n: r.properties.n, k: (nationOf(r.id) ? UK_NATIONS[nationOf(r.id)].n + " · " : "") + (byId.get(r.code)?.properties.n || ""), c: r.code, r: r.id });
  }
  if (s.length >= 3 && hits.length < 12) {
    const match = k => k && (k.startsWith(s) || (s.length >= 4 && k.includes(s)));
    const seen = new Set();
    for (const list of [cities, towns, extra]) for (const c of list) {
      if (hits.length >= 12) break;
      if (!match(c.key) && !match(c.alt)) continue; // nom français ou nom local
      const dup = c.key + "|" + c.code;
      if (list === extra && seen.has(dup)) continue; // déjà trouvé dans la liste locale
      const r = regionNear(c.code, c.lon, c.lat);
      if (!r) continue;
      seen.add(dup);
      hits.push({ n: c.n, k: r.properties.n + " · " + (nationOf(r.id) ? UK_NATIONS[nationOf(r.id)].n : byId.get(c.code)?.properties.n || ""), c: c.code, r: r.id, city: c });
    }
  }
  if (withSites && s.length >= 4) for (const st of sites) {
    if (hits.length >= 12) break;
    if (st.key.includes(s)) hits.push({ n: st.n, k: (st.wonder ? "7 merveilles · " : "Patrimoine mondial · ") + (byId.get(siteHome(st))?.properties.n || ""), c: siteHome(st), site: st.id });
  }
  // le nom exact d'abord, puis ceux qui commencent par la recherche
  const score = h => { const n = norm(h.n); return n === s ? 0 : n.startsWith(s) ? 1 : 2; };
  return hits.sort((a, b) => score(a) - score(b)).slice(0, 12);
}
function bindSearch(input, list, withRegions, label, pick, withSites = false) {
  const regions = typeof withRegions === "function" ? withRegions : () => withRegions;
  let timer = 0;
  const show = (extra, waiting) => {
    const raw = input.value.trim(), s = norm(raw);
    if (!s) { list.hidden = true; return; }
    const hits = searchHits(s, regions(), withSites, extra);
    // peu de résultats : on cherche aussi les villages et lieux-dits en ligne
    if (!extra && s.length >= 3 && hits.length < 6) {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const more = await onlinePlaces(raw);
        if (norm(input.value.trim()) === s) show(more);
      }, 350);
      waiting = true;
    }
    list.innerHTML = hits.map((h, i) => `<li><button data-i="${i}" data-c="${h.c}" data-r="${h.r || ""}" data-city="${h.city ? "1" : ""}" data-site="${h.site || ""}"><span>${esc(h.n)}</span><span class="k">${esc(label(h))}</span></button></li>`).join("")
      || `<li class="empty">${waiting ? "Recherche…" : "Aucun résultat"}</li>`;
    list.hidden = false;
    list.querySelectorAll("button").forEach(b => b.onclick = () => {
      input.value = ""; list.hidden = true; input.blur();
      pick(b.dataset.c, b.dataset.r || null, !!b.dataset.city, b.dataset.site || null, hits[+b.dataset.i]);
    });
  };
  input.addEventListener("input", () => {
    show();
    if (!towns.length) ensureTowns()?.then(() => { if (input.value.trim()) show(); });
  });
  input.addEventListener("keydown", e => { if (e.key === "Escape") { input.value = ""; list.hidden = true; } });
  input.addEventListener("blur", () => setTimeout(() => list.hidden = true, 200));
}
bindSearch($("q"), $("results"), true, h => h.k, (c, r, city, site, h) => {
  openCountry(c, r, city);
  if (h?.nation) setTimeout(() => zoomNation(h.nation), 50);
  if (site) { selSite = site; const st = siteById.get(site); update(); fitBounds([projection([st.lon - .6, st.lat + .4]), projection([st.lon + .6, st.lat - .4])]); }
}, true);
bindSearch($("add-q"), $("add-results"), () => tripView === "wish",
  h => tripView === "wish" ? (state.w.has(h.r || h.c) ? "déjà en envie" : h.k) : (state.c.has(h.c) ? "déjà ajouté" : "ajouter"),
  (c, r) => {
    if (tripView === "wish") {
      const id = r || c;
      if (!state.w.has(id)) toggleWish(id);
      update();
      return;
    }
    if (!state.c.has(c)) { setCountry(c, true); toast(byId.get(c).properties.n + " ajouté à tes voyages ✓"); }
    openTrips.add(c);
    update();
    document.querySelector(`[data-trip="${c}"]`)?.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
  });

/* ---------- Onglets ---------- */
function showTab(name) {
  tab = name;
  document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
  for (const v of ["map", "progress", "trips", "plans", "settings"]) $("view-" + v).hidden = v !== name;
  if (name === "map" && countries.length && resize()) {
    drawBase(); update(); svg.call(zoom.transform, homeTransform());
    if (current) zoomTo(byId.get(current).main, 0);
  }
  if (name === "map") drawCities();
  if (name === "progress") renderProgress();
  if (name === "trips") renderTrips();
  if (name === "plans") renderPlans();
  if (name === "settings") renderSettings();
  if (name !== "map") $("view-" + name).scrollTop = 0;
}
document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.onclick = () => showTab(b.dataset.tab));

/* ---------- Réglages ---------- */
function applyTheme(t) {
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const own = m.media.includes("dark") ? "#0b1820" : "#a8d4f0";
    m.content = t === "dark" ? "#0b1820" : t === "light" ? "#a8d4f0" : own;
  });
}
function renderSettings() {
  const t = store.get("explora-theme") || "light";
  document.querySelectorAll("[data-theme-opt]").forEach(b => b.setAttribute("aria-pressed", b.dataset.themeOpt === t));
  document.querySelectorAll("[data-mapstyle]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mapstyle === (REAL ? "real" : "classic")));
  $("set-pins").checked = pinsShown();
}
document.querySelectorAll("[data-theme-opt]").forEach(b => b.onclick = () => {
  store.set("explora-theme", b.dataset.themeOpt);
  applyTheme(b.dataset.themeOpt);
  renderSettings();
});
applyTheme(store.get("explora-theme") || "light"); // mode clair par défaut
$("set-pins").onchange = e => { store.set("explora-pins", e.target.checked ? "on" : "off"); drawPins(); };
// changer de style de carte change la projection : on recharge la page
document.querySelectorAll("[data-mapstyle]").forEach(b => b.onclick = () => {
  if ((b.dataset.mapstyle === "real") === REAL) return;
  store.set("explora-mapstyle", b.dataset.mapstyle);
  location.reload();
});

$("btn-export").onclick = async () => {
  const name = "explora-sauvegarde-" + new Date().toISOString().slice(0, 10) + ".json";
  const blob = new Blob([JSON.stringify(serialize())], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Sauvegarde Explora" }); return; }
  } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};
$("import-file").onchange = async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    let added = 0;
    for (const [id, t] of toMap(d.c)) if (byId.has(id) && !state.c.has(id)) { state.c.set(id, t); added++; }
    for (const [id, t] of toMap(d.r)) if (regionById.has(id) && !state.r.has(id)) state.r.set(id, t);
    for (const [id, t] of toMap(d.w)) if (place(id) && !state.w.has(id)) state.w.set(id, t);
    for (const [id, t] of toMap(d.u)) if (siteById.has(id) && !state.u.has(id)) state.u.set(id, t);
    for (const p of cleanPlans(d.plans)) if (!state.plans.some(x => x.id === p.id)) state.plans.push(p);
    state.k = { ...cleanColors(d.k), ...state.k };
    for (const fl of cleanFlights(d.f)) if (!state.f.some(x => x.id === fl.id)) state.f.push(fl);
    for (const pn of cleanPins(d.p)) if (!state.p.some(x => x.id === pn.id)) state.p.push(pn);
    for (const [c, jj] of Object.entries(cleanJournal(d.j))) if (!state.j[c]) state.j[c] = jj;
    save(); update();
    toast(`Sauvegarde importée : ${added} nouveau${added > 1 ? "x" : ""} pays`);
  } catch (err) { toast("Ce fichier n'est pas une sauvegarde Explora."); }
};
$("btn-reset").onclick = e => {
  const b = e.currentTarget;
  if (b.dataset.armed) {
    state = { c: new Map(), r: new Map(), w: new Map(), u: new Map(), plans: [], k: {}, j: {}, p: [], f: [] }; save();
    openTrips.clear(); current = null; selected = null; routePlan = null; editPlan = null;
    update(); svg.call(zoom.transform, homeTransform());
    b.textContent = "Tout effacer"; delete b.dataset.armed; toast("Tous tes voyages ont été effacés."); return;
  }
  b.dataset.armed = "1"; b.textContent = "Appuie encore pour tout effacer";
  setTimeout(() => { delete b.dataset.armed; b.textContent = "Tout effacer"; }, 4000);
};

/* ---------- Messages ---------- */
let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, ms);
}

/* ---------- Position en direct ---------- */
const btnLoc = $("btn-locate");
function regionAt(lon, lat) {
  // d'abord le pays, puis ses régions (plus rapide que de tester les 10 000 régions)
  const f = countries.find(f => d3.geoContains(f, [lon, lat]));
  if (f) { const r = regionIn(f.id, lon, lat); if (r) return r; }
  for (const r of regionById.values()) if (d3.geoContains(r, [lon, lat])) return r;
  return null;
}
btnLoc.onclick = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId); watchId = null; me = null; drawMe();
    btnLoc.classList.remove("on"); toast("Position désactivée", 1400); return;
  }
  if (!navigator.geolocation) { toast("Ce navigateur ne donne pas accès à la position."); return; }
  let first = true;
  toast("Recherche de ta position…", 4000);
  watchId = navigator.geolocation.watchPosition(p => {
    me = { lon: p.coords.longitude, lat: p.coords.latitude };
    btnLoc.classList.add("on");
    drawMe();
    if (!first) return;
    first = false;
    const r = regionAt(me.lon, me.lat);
    if (!r) { toast("Position trouvée"); return; }
    openCountry(r.code, r.id);
    toast(state.r.has(r.id) ? "Tu es en " + r.properties.n + " (déjà visité)" : "Tu es en " + r.properties.n + ". Touche « Marquer » pour l'ajouter.", 3500);
  }, err => {
    navigator.geolocation.clearWatch(watchId); watchId = null; btnLoc.classList.remove("on");
    toast(err.code === 1 ? "Autorise l'accès à ta position dans les réglages pour te voir sur la carte." : "Impossible de trouver ta position pour le moment.", 5000);
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
};

/* ---------- À l'ouverture : proposer la région où l'on se trouve ---------- */
// Rien n'est coché automatiquement : une carte propose de marquer la région si elle n'est pas encore visitée.
// On ne demande la permission qu'une fois ; si elle est refusée, on ne redemande pas.
const autoOn = () => store.get("explora-autoloc") !== "0";
// Tant que l'appli est à l'écran, la position est suivie : en entrant dans une nouvelle région non visitée,
// la proposition s'affiche. iOS suspend les applis web en arrière-plan, donc le suivi s'arrête quand on la quitte.
let autoWatch = null, lastPt = null, lastRegion = null;
async function autoLocate() {
  if (!autoOn() || !navigator.geolocation || !regionById.size || autoWatch !== null || document.visibilityState !== "visible") return;
  try { if ((await navigator.permissions?.query({ name: "geolocation" }))?.state === "denied") return; } catch (e) {}
  autoWatch = navigator.geolocation.watchPosition(p => {
    const { longitude: lon, latitude: lat } = p.coords;
    if (lastPt && d3.geoDistance(lastPt, [lon, lat]) * 6371 < .3) return; // moins de 300 m : rien à refaire
    lastPt = [lon, lat];
    const r = regionAt(lon, lat);
    if (!r || r.id === lastRegion) return;
    lastRegion = r.id;
    proposeHere(r, lon, lat);
  }, err => { if (err.code === 1) stopAutoLocate(); }, { enableHighAccuracy: false, maximumAge: 60e3, timeout: 30000 });
}
function stopAutoLocate() {
  if (autoWatch !== null) navigator.geolocation.clearWatch(autoWatch);
  autoWatch = null;
}
function proposeHere(r, lon, lat) {
  if (state.r.has(r.id)) return;
  let skip = {};
  try { skip = JSON.parse(store.get("explora-skip") || "{}"); } catch (e) {}
  if (skip[r.id] && Date.now() - skip[r.id] < 3 * 864e5) return; // « Pas maintenant » : on attend 3 jours
  const city = cities.filter(c => c.code === r.code && Math.abs(c.lat - lat) < .3 && Math.abs(c.lon - lon) < .4)
    .sort((a, b) => d3.geoDistance([lon, lat], [a.lon, a.lat]) - d3.geoDistance([lon, lat], [b.lon, b.lat]))[0];
  const f = byId.get(r.code), fem = FEMININE.has(f.kind);
  const box = $("here");
  box.innerHTML = `<p><small>Tu es ici</small><b>${city && norm(city.n) !== norm(r.properties.n) ? esc(city.n) + " · " : ""}${esc(r.properties.n)}</b><small>${esc(f.properties.n)}</small></p>
    <div class="row"><button class="btn small" id="here-no">Pas maintenant</button><button class="btn small primary" id="here-yes">Marquer ${fem ? "visitée" : "visité"}</button></div>`;
  box.hidden = false;
  $("here-yes").onclick = () => {
    box.hidden = true;
    setRegion(r.id, true, monthTs(monthValue(Date.now())));
    showTab("map"); openCountry(r.code, r.id);
    toast(r.properties.n + " ajouté à ta carte ✓", 1800);
  };
  $("here-no").onclick = () => { box.hidden = true; skip[r.id] = Date.now(); store.set("explora-skip", JSON.stringify(skip)); };
}
document.addEventListener("visibilitychange", () => { document.visibilityState === "visible" ? autoLocate() : stopAutoLocate(); });
$("set-autoloc").checked = autoOn();
$("set-autoloc").onchange = e => { store.set("explora-autoloc", e.target.checked ? "1" : "0"); if (e.target.checked) { lastRegion = null; lastPt = null; autoLocate(); } else stopAutoLocate(); };

addEventListener("resize", () => {
  if (!countries.length || tab !== "map" || !resize()) return;
  drawBase(); update(); svg.call(zoom.transform, homeTransform());
  if (current) zoomTo(byId.get(current).main, 0);
});

load().catch(err => { console.error(err); $("loading").textContent = "La carte n'a pas pu se charger. Recharge la page."; });
})();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
