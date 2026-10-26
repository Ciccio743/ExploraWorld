(() => {
const WORLD_COUNTRIES = 195; // membres de l'ONU + Vatican + Palestine
const CAT = { c: "culturel", n: "naturel", m: "mixte" };
// moyens de transport : icône, nom, vitesse moyenne (km/h)
const MODES = { plane: ["✈️", "Avion", 750], car: ["🚗", "Voiture", 80], train: ["🚆", "Train", 110], bus: ["🚌", "Bus", 65], boat: ["⛴️", "Bateau", 30] };
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
let state = { c: new Map(), r: new Map(), w: new Map(), u: new Map(), plans: [] };
let current = null, selected = null, tab = "map", tripView = "visited";
let routePlan = null; // projet affiché sur la carte
let quick = false;
let sheetMore = false; // panneau du pays déplié
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
function cleanPlans(list) {
  return (Array.isArray(list) ? list : []).filter(p => p && p.id).map(p => {
    const stops = Array.isArray(p.stops) ? p.stops.map(String) : [];
    return {
      id: String(p.id), name: String(p.name || "Mon projet"), start: p.start || "", end: p.end || "",
      stops, notes: String(p.notes || ""), done: !!p.done,
      // nights[i] : nuits passées à l'étape i · modes[i] : transport pour y arriver ("" = choisi selon la distance)
      nights: stops.map((_, i) => Math.max(0, Math.min(99, Math.round(+(p.nights || [])[i]) || 0))),
      modes: stops.map((_, i) => MODES[(p.modes || [])[i]] ? p.modes[i] : "")
    };
  });
}
function serialize() {
  return { v: 3, c: Object.fromEntries(state.c), r: Object.fromEntries(state.r), w: Object.fromEntries(state.w), u: Object.fromEntries(state.u), plans: state.plans, t: Date.now() };
}
function save() { store.set(LS, JSON.stringify(serialize())); }
try {
  const d = JSON.parse(store.get(LS) || "null");
  if (d) state = { c: toMap(d.c), r: toMap(d.r), w: toMap(d.w), u: toMap(d.u), plans: cleanPlans(d.plans) };
} catch (e) {}
quick = store.get("explora-quick") === "1";
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

async function load() {
  // carte légère du monde : pays et régions tirés des mêmes contours, donc frontières identiques
  const [world, merged, split] = await Promise.all([
    fetch(dataUrl("world.json")).then(r => r.json()),
    fetch(dataUrl("merged.json")).then(r => r.json()).catch(() => ({})),
    fetch(dataUrl("split.json")).then(r => r.json()).catch(() => ({}))
  ]);
  migrate(merged, split);
  countries = topojson.feature(world, world.objects.countries).features;
  const nb = topojson.neighbors(world.objects.countries.geometries);
  countries.forEach((f, i) => neighbors.set(f.id, nb[i].map(j => countries[j].id)));
  for (const f of countries) byId.set(f.id, f);
  for (const r of topojson.feature(world, world.objects.regions).features) {
    r.area = d3.geoArea(r); r.code = r.properties.g;
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
    for (const r of regions) { r.detail = true; r.code = code; }
    const d = { regions, byId: new Map(regions.map(r => [r.id, r])), outline: topojson.merge(t, obj.geometries) };
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
const place = id => isCity(id) ? cityStop(id) : byId.get(id) || regionById.get(id);
const placeName = id => place(id)?.properties.n || id;
const placeRegion = id => isCity(id) ? cityStop(id).r : id;
const placeCountry = id => isCountry(id) ? id : regionById.get(placeRegion(id))?.code;
function placeSub(id) {
  if (isCountry(id)) return "";
  const r = regionById.get(placeRegion(id));
  if (!r) return "";
  const c = byId.get(r.code)?.properties.n || "";
  return isCity(id) && r.properties.n !== placeName(id) ? r.properties.n + " · " + c : c;
}
function centroid(id) {
  if (isCity(id)) { const c = cityStop(id); return [c.lon, c.lat]; }
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
const gBase = root.append("g");
const gOverlay = root.append("g");
const gNear = root.append("g").attr("class", "near");
const gDetail = root.append("g").attr("class", "detail");
const gOutline = root.append("g");
const gSel = root.append("g");
const gRoute = root.append("g");
const gSites = root.append("g");
const gCities = root.append("g");
const gMe = root.append("g");
const projection = d3.geoNaturalEarth1();
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
  gBase.selectAll(".ocean-name").attr("transform", oceanTransform).style("opacity", k > 5 ? 0 : null);
  tip.hidden = true;
}).on("end", drawCities);
svg.call(zoom).on("dblclick.zoom", null);

function resize() {
  const r = svg.node().getBoundingClientRect();
  if (!r.width) return false;
  if (r.width === W && r.height === H) return false;
  W = r.width; H = r.height;
  projection.fitExtent([[10, 10], [W - 10, H - 10]], { type: "Sphere" });
  zoom.translateExtent([[-W * .5, -H * .5], [W * 1.5, H * 1.5]]).extent([[0, 0], [W, H]]);
  return true;
}

function drawBase() {
  for (const g of [gBase, gOverlay, gDetail, gRoute]) g.selectAll("*").remove();
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
  // autour du pays ouvert, les voisins sont dessinés avec leurs contours détaillés : frontières jointives
  const near = new Set(current ? (neighbors.get(current) || []).filter(detailOf) : []);
  gBase.selectAll(".country")
    .classed("visited", d => state.c.has(d.id))
    .classed("wish", d => !state.c.has(d.id) && state.w.has(d.id))
    .classed("active", d => d.id === current || near.has(d.id));
  gNear.selectAll(".region").data([...near].flatMap(c => detailOf(c).regions), d => d.id).join(
    enter => enter.append("path").attr("d", path).on("click", (e, d) => { e.stopPropagation(); openCountry(d.code); })
  ).attr("class", d => "region " + (state.r.has(d.id) ? "visited" : state.c.has(d.code) ? "in-visited" : state.w.has(d.id) || state.w.has(d.code) ? "wish" : ""));
  gNear.selectAll(".near-line").data([...near].map(c => detailOf(c).outline)).join("path").attr("class", "near-line").attr("d", path);
  const marked = new Set([...state.r.keys(), ...[...state.w.keys()].filter(id => regionById.has(id))]);
  const others = [...marked].map(id => regionById.get(id)).filter(r => r && r.code !== current && !near.has(r.code));
  gOverlay.selectAll(".region").data(others, d => d.id)
    .join(enter => enter.append("path").attr("d", path))
    .attr("class", d => "region " + (state.r.has(d.id) ? "visited" : "wish"));
  const det = current && detailOf(current);
  gDetail.selectAll(".region").data(current ? (det ? det.regions : regionsBy.get(current) || []) : [], d => d.id + (d.detail ? "+" : "")).join(
    enter => enter.append("path").attr("class", "region").attr("d", path)
      .on("click", (e, d) => { e.stopPropagation(); tapRegion(d); })
      .on("pointermove", (e, d) => showTip(e, d.properties.n))
      .on("pointerleave", () => tip.hidden = true)
  ).classed("visited", d => state.r.has(d.id)).classed("wish", d => !state.r.has(d.id) && state.w.has(d.id));
  gOutline.selectAll("path").data(current ? [det ? det.outline : byId.get(current)] : []).join("path").attr("class", "outline").attr("d", path);
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
}

function drawRoute() {
  const plan = routePlan && state.plans.find(p => p.id === routePlan);
  const idx = plan ? plan.stops.map((id, i) => i).filter(i => place(plan.stops[i])) : [];
  const pts = idx.map(i => centroid(plan.stops[i]));
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

// Vue d'accueil : en portrait, le monde entier tient dans une bande trop fine.
// On agrandit pour remplir la hauteur libre, centré sur l'Europe et l'Afrique ; on peut toujours dézoomer.
let landY = null;
function homeTransform() {
  if (!landY) { const b = path.bounds({ type: "FeatureCollection", features: countries }); landY = [b[0][1], b[1][1]]; }
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
  if (code !== current) { sheetMore = false; selSite = null; sheetMonth = ""; }
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
  if (quick) { toggleRegion(r.id); selected = r.id; update(); return; }
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
function pickDay(v, title, clearable = !!v) {
  return new Promise(done => {
    const now = new Date(), d = v ? new Date(v + "T12:00") : now;
    const back = document.createElement("div");
    back.className = "mp-back";
    back.innerHTML = `<div class="card mp" role="dialog" aria-label="${esc(title)}">
      <h3>${esc(title)}</h3>
      <div class="three">
        <select id="mp-d" aria-label="Jour">${d3.range(1, 32).map(n => `<option ${n === d.getDate() ? "selected" : ""}>${n}</option>`).join("")}</select>
        <select id="mp-m" aria-label="Mois">${MONTHS.map((n, i) => `<option value="${i + 1}" ${i === d.getMonth() ? "selected" : ""}>${cap(n)}</option>`).join("")}</select>
        <select id="mp-y" aria-label="Année">${d3.range(Math.min(d.getFullYear(), now.getFullYear() - 1), now.getFullYear() + 5).map(y => `<option ${y === d.getFullYear() ? "selected" : ""}>${y}</option>`).join("")}</select>
      </div>
      <div class="btns">
        <button class="btn primary" data-mp="ok">Enregistrer</button>
        ${clearable ? `<button class="btn" data-mp="none">Effacer la date</button>` : ""}
        <button class="btn" data-mp="cancel">Annuler</button>
      </div></div>`;
    document.body.append(back);
    const close = r => { back.remove(); done(r); };
    back.onclick = e => { if (e.target === back) close(null); };
    back.querySelectorAll("[data-mp]").forEach(b => b.onclick = () => {
      if (b.dataset.mp === "cancel") return close(null);
      if (b.dataset.mp === "none") return close("");
      const y = +$("mp-y").value, m = +$("mp-m").value;
      const day = Math.min(+$("mp-d").value, new Date(y, m, 0).getDate()); // pas de 31 février
      close(isoDay(new Date(y, m - 1, day, 12)));
    });
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

function renderSheet() {
  const sheet = $("sheet");
  const plan = routePlan && state.plans.find(p => p.id === routePlan);
  if (current) {
    const f = byId.get(current), n = f.nreg, v = visitedIn(current), been = state.c.has(current), wish = state.w.has(current);
    const sel = selected && regionById.get(selected), site = selSite && siteById.get(selSite);
    const selOn = sel && state.r.has(sel.id), selWish = sel && state.w.has(sel.id);
    const one = SINGULAR[f.kind] || "endroit", fem = FEMININE.has(f.kind);
    const un = (fem ? "une " : "un ") + one, le = fem ? "la" : "le";
    // panneau compact par défaut pour laisser la carte visible ; « ⌃ » déplie la date, les envies et le marquage rapide
    sheet.innerHTML = `
      <div class="row cmp">
        <button class="back-ic" id="s-back" aria-label="Retour au monde">←</button>
        <div class="cname grow"><b>${flag(current)} ${esc(f.properties.n)}</b><small>${been && n > 1 ? `<span class="ok">✓ Visité</span> · ` : ""}${v} / ${n} ${esc(n > 1 ? f.kind : one)} visit${fem ? "ée" : "é"}${n > 1 ? "s" : ""}</small></div>
        ${n > 1 && (been || sel) ? "" : `<button class="btn small ${been ? "done" : "primary"}" id="s-been">${been ? "✓ Visité" : "Marquer visité"}</button>`}
        <button class="btn small more" id="s-more" aria-expanded="${sheetMore}" aria-label="${sheetMore ? "Réduire" : "Plus d'options"}">${sheetMore ? "⌄" : "⌃"}</button>
      </div>
      <div class="bar thin"><i style="width:${n ? v / n * 100 : 0}%"></i></div>
      ${site ? `
      <div class="pick">
        <div class="name"><b>${esc(site.n)}</b><small>${site.wonder ? (site.hon ? "Merveille honoraire du monde" : "Une des 7 merveilles du monde") : `Patrimoine mondial · ${CAT_IC[site.cat]} ${CAT[site.cat]} · ${site.year}`}${state.u.has(site.id) ? " · visité" : ""}</small></div>
        <button class="btn small ${state.u.has(site.id) ? "done" : "primary"}" id="s-site">${state.u.has(site.id) ? "Retirer" : "Marquer visité"}</button>
      </div>
      <div class="photo" id="s-photo" hidden></div>` : sel ? `
      <div class="pick">
        <div class="name"><b>${esc(sel.properties.n)}</b><small>${selOn ? (fem ? "Visitée" : "Visité") : selWish ? "Dans tes envies" : (fem ? "Pas encore visitée" : "Pas encore visité")}</small></div>
        ${!selOn ? `<button class="btn small wishbtn" id="s-swish" aria-pressed="${selWish}" aria-label="Envie">${selWish ? "★" : "☆"}</button>` : ""}
        <button class="btn small ${selOn ? "done" : "primary"}" id="s-mark">${selOn ? "Retirer" : "Marquer " + (fem ? "visitée" : "visité")}</button>
      </div>` : askRegions === current && n > 1 && !v && !site ? `
      <div class="pick ask">
        <div class="name"><b>Quel${fem ? "les" : "s"} ${esc(f.kind)} ?</b><small>Touche sur la carte ${fem ? "celles" : "ceux"} où tu es allé.</small></div>
        <button class="btn small" id="s-later">Plus tard</button>
      </div>` : ""}
      ${sheetMore ? `
      <div class="when" style="margin-top:12px">${been ? "Date de visite" : "Quand ?"} (facultatif) ${monthBtn('id="s-date"', been ? monthValue(state.c.get(current)) : sheetMonth)}</div>
      ${been && n > 1 ? `<div class="btns"><button class="btn small danger" id="s-unbeen">Retirer ce pays de ma carte</button></div>` : ""}
      ${!been ? `<div class="btns"><button class="btn small wishbtn" id="s-wish" aria-pressed="${wish}">${wish ? "★ Dans mes envies" : "☆ J'ai envie d'y aller"}</button></div>` : ""}
      ${sel ? "" : `<p class="hint">${quick ? `Touche ${esc(un)} pour ${le} marquer ou ${le} retirer.` : `Touche ${esc(un)} pour ${le} sélectionner.`}</p>`}
      ${(sitesBy.get(current) || []).length ? `<p class="hint">◆ Patrimoine mondial : ${(sitesBy.get(current) || []).filter(st => state.u.has(st.id)).length} / ${(sitesBy.get(current) || []).length} sites visités. Touche un losange sur la carte.</p>` : ""}
      <label class="switch"><input type="checkbox" id="s-quick" ${quick ? "checked" : ""}>Marquage rapide : un appui marque directement</label>` : ""}`;
    $("s-back").onclick = openWorld;
    // la date choisie avant d'appuyer sur « J'y suis allé » est enregistrée avec la visite
    if ($("s-been")) $("s-been").onclick = () => {
      setCountry(current, !been, $("s-date") ? monthTs($("s-date").dataset.v) : 0);
      // une fois le pays marqué, on propose de préciser les régions
      askRegions = !been && n > 1 ? current : null;
      update();
    };
    if ($("s-later")) $("s-later").onclick = () => { askRegions = null; renderSheet(); };
    if ($("s-unbeen")) $("s-unbeen").onclick = () => { if (confirm(`Retirer ${f.properties.n} et toutes ses régions de ta carte ?`)) { setCountry(current, false); update(); } };
    $("s-more").onclick = () => { sheetMore = !sheetMore; renderSheet(); };
    if ($("s-date")) $("s-date").onclick = async () => {
      const v = await pickMonth($("s-date").dataset.v, been ? "Date de visite" : "Quand ?");
      if (v === null) return;
      if (been) setVisitMonth(current, v); else sheetMonth = v;
      renderSheet();
    };
    if ($("s-wish")) $("s-wish").onclick = () => { toggleWish(current); update(); };
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
    if ($("s-quick")) $("s-quick").onchange = e => { quick = e.target.checked; store.set("explora-quick", quick ? "1" : "0"); renderSheet(); };
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
    $("s-edit").onclick = () => { editPlan = copyPlan(plan); showTab("plans"); };
  } else if (!state.c.size && !state.w.size) {
    sheet.innerHTML = `
      <h2>Remplis ta carte</h2>
      <p class="hint">Touche un pays pour zoomer dedans, puis choisis les départements, états ou régions où tu es allé.</p>
      <div class="legend"><span><b style="background:var(--fog)"></b>Pas visité</span><span><b style="background:var(--found)"></b>Visité</span><span><b style="background:var(--wish-soft)"></b>Envie</span></div>`;
  } else {
    const n = state.c.size, next = MILESTONES.find(m => m > n) || 195, prev = [...MILESTONES].reverse().find(m => m <= n) || 0;
    sheet.innerHTML = `<div class="welcome">
      <div class="row between"><p class="w-big"><b>${n}</b> pays sur 195</p><p class="w-next">${n < 195 ? `Prochain palier : ${next}` : "Le monde entier !"}</p></div>
      <div class="bar w-bar"><i style="width:${n >= 195 ? 100 : (n - prev) / (next - prev) * 100}%"></i></div>
      <div class="row between"><p class="hint" style="margin:0">Touche un pays pour zoomer dedans.</p>
      <div class="legend" style="margin:0"><span><b style="background:var(--found)"></b>Visité</span><span><b style="background:var(--wish-soft)"></b>Envie</span></div></div></div>`;
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
    <div class="row between"><h1>Mon exploration</h1><button class="btn small" id="btn-share">Partager</button></div>
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
}

/* ---------- Photo d'un site (Wikipédia) ---------- */
// Chargée au besoin depuis Wikipédia, puis gardée en mémoire. Sans connexion, la carte reste sans photo.
const photos = new Map();
async function fetchPhoto(site) {
  if (photos.has(site.id)) return photos.get(site.id);
  const p = (async () => {
    const lang = site.wiki ? "fr" : "en";
    const api = params => fetch(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", ...params })}`).then(r => r.json());
    const want = { action: "query", prop: "pageimages|info", piprop: "thumbnail", pithumbsize: "800", inprop: "url" };
    let d = site.wiki ? await api({ ...want, titles: site.wiki }) : await api({ ...want, generator: "search", gsrsearch: site.en || site.n, gsrlimit: "1" });
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
  $("add-q").closest(".add").hidden = tripView === "timeline";
  const box = $("trips");
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
  const list = [...state.plans].sort((a, b) => a.done - b.done || (a.start || "9999").localeCompare(b.start || "9999"));
  box.innerHTML = `
    <div class="row between"><h1>Mes projets</h1>${list.length ? `<button class="btn small primary" id="p-new">Nouveau</button>` : ""}</div>
    ${list.length ? `<div class="block">${list.map(p => {
      const nc = newCountries(p), stops = p.stops.filter(place), t = tripTotals(p);
      return `
      <div class="plan" data-plan="${p.id}">
        <div class="row between"><h4>${esc(p.name)}</h4>${p.done ? `<span class="chip new">Fait ✓</span>` : ""}</div>
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
  const start = name => { editPlan = { id: Date.now().toString(36), name, start: "", end: "", stops: [], nights: [], modes: [], notes: "", done: false, isNew: true }; renderPlans(); };
  if ($("p-new")) $("p-new").onclick = () => start("Mon prochain trip");
  box.querySelectorAll("[data-start]").forEach(b => b.onclick = () => start(b.dataset.start));
  box.querySelectorAll("[data-plan]").forEach(el => {
    const p = state.plans.find(x => x.id === el.dataset.plan);
    el.querySelector('[data-act="open"]').onclick = () => { editPlan = copyPlan(p); renderPlans(); $("view-plans").scrollTo(0, 0); };
    const done = el.querySelector('[data-act="done"]');
    if (done) done.onclick = () => {
      if (!done.dataset.armed) {
        done.dataset.armed = "1"; done.textContent = "Ajouter les étapes à ma carte ?";
        setTimeout(() => { if (done.isConnected) { delete done.dataset.armed; done.textContent = "C'est fait ✓"; } }, 4000);
        return;
      }
      const ts = p.start ? new Date(p.start + "T12:00").getTime() : 0;
      for (const id of p.stops.filter(place)) isCountry(id) ? setCountry(id, true, ts) : setRegion(placeRegion(id), true, ts);
      p.done = true; save(); update();
      toast(`${p.name} : ${plural(p.stops.length, "étape ajoutée", "étapes ajoutées")} à ta carte ✓`, 3000);
    };
  });
}
const copyPlan = p => ({ ...p, stops: [...p.stops], nights: [...p.nights], modes: [...p.modes] });
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
function renderTrip(box) {
  const p = editPlan, t = tripTotals(p);
  const modeSel = i => `<select data-leg="${i}" aria-label="Trajet vers l'étape ${i + 1}">${Object.entries(MODES).map(([k, [ic, n]]) =>
    `<option value="${k}" ${legMode(p, i) === k ? "selected" : ""}>${ic} ${n}</option>`).join("")}</select>`;
  box.innerHTML = `
    <div class="row trip-top"><button class="icon-btn" id="e-back" aria-label="Retour à mes projets">‹</button>
      <h1 class="grow" id="e-title">${esc(p.name)}</h1></div>
    <div class="trip-map"><svg id="trip-map" aria-label="Carte du trip"></svg>
      ${p.stops.length ? "" : `<p>Ajoute tes étapes : l'itinéraire s'affichera ici.</p>`}
      ${p.stops.some((_, i) => i && ROAD[legMode(p, i)]) ? `<span class="tm-credit">Routes © OpenStreetMap</span>` : ""}</div>
    ${p.stops.length > 1 ? `<div class="trip-sum">
      <span><b>${p.stops.length}</b> étapes</span><span><b>${t.nights}</b> ${t.nights > 1 ? "nuits" : "nuit"}</span>
      <span><b>${fmtKm(t.km, true)}</b> au total</span>${t.flights ? `<span><b>${t.flights}</b> ${t.flights > 1 ? "vols" : "vol"}</span>` : ""}</div>` : ""}
    <div class="block">
      <div class="two">
        <label class="field" style="grid-column: 1 / -1">Nom du trip<input id="e-name" value="${esc(p.name)}" maxlength="60" placeholder="Ex. : Road trip en Italie" enterkeyhint="done"></label>
        <div class="field">Départ<button type="button" class="date-btn ${p.start ? "" : "empty"}" id="e-start">${p.start ? fmtDate(p.start) : "Choisir"}</button></div>
        <div class="field">Retour<button type="button" class="date-btn ${p.end ? "" : "empty"}" id="e-end">${p.end ? fmtDate(p.end) : "Choisir"}</button></div>
      </div>
    </div>
    <div class="block">
      <h3>Itinéraire</h3>
      <ol class="itin">${p.stops.map((id, i) => {
        const l = i && legInfo(p, i);
        return `${i ? `<li class="leg">${modeSel(i)}<span>${fmtKm(l.km, l.real)} · ${fmtDur(l.h, l.real)}</span></li>` : ""}
        <li class="istop" data-i="${i}">
          <span class="n">${i + 1}</span>
          <span class="t"><b>${esc(placeName(id))}</b><small>${esc([placeSub(id), stopDates(p, i)].filter(Boolean).join(" · "))}</small></span>
          <span class="nights"><button data-nt="-1" aria-label="Une nuit de moins" ${p.nights[i] ? "" : "disabled"}>−</button><span>${p.nights[i] ? plural(p.nights[i], "nuit", "nuits") : "0 nuit"}</span><button data-nt="1" aria-label="Une nuit de plus">+</button></span>
          <span class="moves"><button class="icon-btn" data-mv="-1" aria-label="Monter" ${i ? "" : "disabled"}>↑</button><button class="icon-btn" data-mv="1" aria-label="Descendre" ${i < p.stops.length - 1 ? "" : "disabled"}>↓</button><button class="icon-btn" data-rm aria-label="Retirer">✕</button></span>
        </li>`; }).join("")}
      </ol>
      <div class="add" style="margin-top:12px">
        <input id="e-q" type="search" placeholder="${p.stops.length ? "Étape suivante" : "Première étape"} : ville, région ou pays…" autocomplete="off" aria-label="Ajouter une étape">
        <ul id="e-results" class="card results" hidden></ul>
      </div>
      ${!p.stops.length && state.w.size ? `<div class="btns"><button class="btn small" id="e-wishes">Reprendre mes ${plural(state.w.size, "envie", "envies")}</button></div>` : ""}
    </div>
    <div class="block">
      <label class="field">Notes<textarea id="e-notes" placeholder="Hébergements, budget, choses à voir…">${esc(p.notes)}</textarea></label>
    </div>
    <div class="btns" style="margin-top:0">
      ${p.stops.length ? `<button class="btn" id="e-big">Voir sur ma carte</button>` : ""}
      ${!p.isNew ? `<button class="btn danger" id="e-del">Supprimer le trip</button>` : ""}
    </div>`;
  const redo = () => { commitTrip(); renderPlans(); };
  $("e-back").onclick = () => { if (!p.isNew || p.stops.length) commitTrip(); editPlan = null; update(); renderPlans(); };
  $("e-name").oninput = e => { p.name = e.target.value; $("e-title").textContent = p.name.trim() || "Mon projet"; };
  $("e-name").onchange = () => commitTrip();
  $("e-name").onkeydown = e => { if (e.key === "Enter") e.target.blur(); };
  $("e-start").onclick = async () => {
    const v = await pickDay(p.start, "Départ");
    if (v === null) return;
    p.start = v; if (p.end && v && p.end < v) p.end = v;
    redo();
  };
  $("e-end").onclick = async () => {
    // par défaut : le départ plus toutes les nuits prévues
    let def = p.end;
    if (!def && p.start) { const d = new Date(p.start + "T12:00"); d.setDate(d.getDate() + d3.sum(p.nights)); def = isoDay(d); }
    const v = await pickDay(def, "Retour", p.end ? true : false);
    if (v === null) return;
    p.end = v && p.start && v < p.start ? p.start : v;
    redo();
  };
  $("e-notes").onchange = e => { p.notes = e.target.value; commitTrip(); };
  bindSearch($("e-q"), $("e-results"), true, h => h.k, (c, r, city, site, h) => {
    const id = city && h?.city ? cityId(h.city, r) : r || c;
    if (p.stops[p.stops.length - 1] === id) return;
    p.stops.push(id); p.nights.push(1); p.modes.push("");
    redo();
    $("e-q").focus();
  });
  if ($("e-wishes")) $("e-wishes").onclick = () => {
    for (const id of state.w.keys()) if (place(id) && !p.stops.includes(id)) { p.stops.push(id); p.nights.push(1); p.modes.push(""); }
    redo();
  };
  box.querySelectorAll("[data-leg]").forEach(sel => sel.onchange = () => { p.modes[+sel.dataset.leg] = sel.value; redo(); });
  box.querySelectorAll(".istop").forEach(li => {
    const i = +li.dataset.i;
    li.querySelectorAll("[data-nt]").forEach(b => b.onclick = () => { p.nights[i] = Math.max(0, Math.min(99, p.nights[i] + +b.dataset.nt)); redo(); });
    li.querySelectorAll("[data-mv]").forEach(b => b.onclick = () => {
      const j = i + +b.dataset.mv;
      for (const a of [p.stops, p.nights]) [a[i], a[j]] = [a[j], a[i]];
      // les trajets autour des étapes déplacées sont recalculés
      for (const k of [i, j, i + 1, j + 1]) if (k < p.modes.length) p.modes[k] = "";
      redo();
    });
    li.querySelector("[data-rm]").onclick = () => {
      for (const a of [p.stops, p.nights, p.modes]) a.splice(i, 1);
      if (i < p.modes.length) p.modes[i] = "";
      redo();
    };
  });
  if ($("e-big")) $("e-big").onclick = () => { commitTrip(); const id = p.id; editPlan = null; renderPlans(); showRoute(id); };
  if ($("e-del")) $("e-del").onclick = e => {
    const b = e.currentTarget;
    if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Confirmer la suppression"; return; }
    state.plans = state.plans.filter(x => x.id !== p.id);
    if (routePlan === p.id) routePlan = null;
    save(); editPlan = null; update(); renderPlans();
    toast("Trip supprimé", 1400);
  };
  drawTripMap(p);
}
function drawTripMap(p) {
  const el = $("trip-map");
  if (!el) return;
  const W = el.clientWidth || 360, H = el.clientHeight || 260;
  const ids = p.stops.map((id, i) => i).filter(i => place(p.stops[i]));
  const pts = ids.map(i => centroid(p.stops[i]));
  let proj;
  if (!pts.length) proj = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: "Sphere" });
  else {
    proj = d3.geoMercator().fitExtent([[56, 44], [W - 56, H - 36]], { type: "MultiPoint", coordinates: pts.length > 1 ? pts : [pts[0], pts[0]] });
    // une seule étape ou des villes très proches : on garde un peu de recul
    if (pts.length < 2 || proj.scale() > 6000) proj.scale(pts.length < 2 ? 1500 : 6000).center(d3.geoCentroid({ type: "MultiPoint", coordinates: pts })).translate([W / 2, H / 2]);
  }
  const path = d3.geoPath(proj);
  const svgT = d3.select(el);
  svgT.selectAll("*").remove();
  const g = svgT.append("g");
  const near = f => { const [[x0, y0], [x1, y1]] = path.bounds(f); return x1 > -W && x0 < 2 * W && y1 > -H && y0 < 2 * H; };
  g.selectAll(".tm-land").data(countries.filter(near)).join("path")
    .attr("class", d => "tm-land" + (state.c.has(d.id) ? " been" : "")).attr("d", path);
  // limites des régions des pays traversés
  const codes = new Set(ids.map(i => placeCountry(p.stops[i])).filter(Boolean));
  g.selectAll(".tm-reg").data([...codes].flatMap(c => regionsBy.get(c) || [])).join("path").attr("class", "tm-reg").attr("d", path);
  const P = pts.map(d => proj(d));
  g.selectAll(".route").data(ids.slice(1).map((i, j) => [P[j], P[j + 1], legMode(p, i), legInfo(p, i).road])).join("path")
    .attr("class", d => "route m-" + d[2]).attr("d", d => d[3] ? d3.line()(d[3].map(c => proj(c))) : legPath(d[0], d[1], d[2]));
  // un petit avion au milieu de chaque vol, dans le sens du trajet
  const planes = g.selectAll(".tm-plane").data(ids.slice(1).map((i, j) => [P[j], P[j + 1], legMode(p, i)]).filter(d => d[2] === "plane").map(([a, b]) => {
    const c = legPath(a, b, "plane").split("Q")[1].split(" ")[0].split(",").map(Number);
    return { x: .25 * a[0] + .5 * c[0] + .25 * b[0], y: .25 * a[1] + .5 * c[1] + .25 * b[1], r: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  })).join("text").attr("class", "tm-plane").text("✈");
  const marks = g.selectAll(".tm-mark").data(P.map((xy, j) => ({ x: xy[0], y: xy[1], n: j + 1, name: placeName(p.stops[ids[j]]) })))
    .join(enter => { const m = enter.append("g").attr("class", "tm-mark"); m.append("circle").attr("r", 11); m.append("text").attr("class", "num"); m.append("text").attr("class", "lbl").attr("x", 15).attr("dy", "0.35em"); return m; });
  marks.select(".num").text(d => d.n);
  marks.select(".lbl").text(d => d.name.length > 18 ? d.name.slice(0, 17) + "…" : d.name);
  const place2 = kk => {
    marks.attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / kk})`);
    planes.attr("transform", d => `translate(${d.x},${d.y}) scale(${1 / kk}) rotate(${d.r})`);
    // étiquette à gauche quand une autre étape est juste à droite
    marks.select(".lbl").attr("x", d => marks.data().some(o => o !== d && o.x > d.x && (o.x - d.x) * kk < 110 && Math.abs(o.y - d.y) * kk < 18) ? -15 : 15)
      .attr("text-anchor", d => marks.data().some(o => o !== d && o.x > d.x && (o.x - d.x) * kk < 110 && Math.abs(o.y - d.y) * kk < 18) ? "end" : "start");
  };
  place2(1);
  svgT.call(d3.zoom().scaleExtent([.5, 16]).on("zoom", e => { g.attr("transform", e.transform); place2(e.transform.k); }));
}

/* ---------- Recherches ---------- */
function searchHits(s, withRegions, withSites = false) {
  const hits = [];
  for (const f of countries) if (norm(f.properties.n).includes(s)) hits.push({ n: f.properties.n, k: "pays", c: f.id });
  hits.sort((a, b) => norm(a.n).indexOf(s) - norm(b.n).indexOf(s));
  if (withRegions && s.length >= 3) for (const r of regionById.values()) {
    if (hits.length > 30) break;
    if (norm(r.properties.n).includes(s)) hits.push({ n: r.properties.n, k: byId.get(r.code)?.properties.n || "", c: r.code, r: r.id });
  }
  if (s.length >= 3 && hits.length < 12) {
    for (const c of cities) {
      if (hits.length >= 12) break;
      const match = k => k && (k.startsWith(s) || (s.length >= 4 && k.includes(s)));
      if (!match(c.key) && !match(c.alt)) continue; // nom français ou nom local
      const r = regionIn(c.code, c.lon, c.lat);
      if (r) hits.push({ n: c.n, k: r.properties.n + " · " + (byId.get(c.code)?.properties.n || ""), c: c.code, r: r.id, city: c });
    }
  }
  if (withSites && s.length >= 4) for (const st of sites) {
    if (hits.length >= 12) break;
    if (st.key.includes(s)) hits.push({ n: st.n, k: (st.wonder ? "7 merveilles · " : "Patrimoine mondial · ") + (byId.get(siteHome(st))?.properties.n || ""), c: siteHome(st), site: st.id });
  }
  return hits.slice(0, 12);
}
function bindSearch(input, list, withRegions, label, pick, withSites = false) {
  const regions = typeof withRegions === "function" ? withRegions : () => withRegions;
  input.addEventListener("input", () => {
    const s = norm(input.value.trim());
    if (!s) { list.hidden = true; return; }
    const hits = searchHits(s, regions(), withSites);
    list.innerHTML = hits.map((h, i) => `<li><button data-i="${i}" data-c="${h.c}" data-r="${h.r || ""}" data-city="${h.city ? "1" : ""}" data-site="${h.site || ""}"><span>${esc(h.n)}</span><span class="k">${esc(label(h))}</span></button></li>`).join("")
      || `<li class="empty">Aucun résultat</li>`;
    list.hidden = false;
    list.querySelectorAll("button").forEach(b => b.onclick = () => {
      input.value = ""; list.hidden = true; input.blur();
      pick(b.dataset.c, b.dataset.r || null, !!b.dataset.city, b.dataset.site || null, hits[+b.dataset.i]);
    });
  });
  input.addEventListener("keydown", e => { if (e.key === "Escape") { input.value = ""; list.hidden = true; } });
  input.addEventListener("blur", () => setTimeout(() => list.hidden = true, 200));
}
bindSearch($("q"), $("results"), true, h => h.k, (c, r, city, site) => {
  openCountry(c, r, city);
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
    const own = m.media.includes("dark") ? "#0b1820" : "#c9d9e0";
    m.content = t === "dark" ? "#0b1820" : t === "light" ? "#c9d9e0" : own;
  });
}
function renderSettings() {
  const t = store.get("explora-theme") || "auto";
  document.querySelectorAll("[data-theme-opt]").forEach(b => b.setAttribute("aria-pressed", b.dataset.themeOpt === t));
}
document.querySelectorAll("[data-theme-opt]").forEach(b => b.onclick = () => {
  store.set("explora-theme", b.dataset.themeOpt);
  applyTheme(b.dataset.themeOpt);
  renderSettings();
});
applyTheme(store.get("explora-theme") || "auto");

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
    save(); update();
    toast(`Sauvegarde importée : ${added} nouveau${added > 1 ? "x" : ""} pays`);
  } catch (err) { toast("Ce fichier n'est pas une sauvegarde Explora."); }
};
$("btn-reset").onclick = e => {
  const b = e.currentTarget;
  if (b.dataset.armed) {
    state = { c: new Map(), r: new Map(), w: new Map(), u: new Map(), plans: [] }; save();
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
