(() => {
const WORLD_COUNTRIES = 195; // membres de l'ONU + Vatican + Palestine
const EARTH_R = 6371; // km
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
const CONTINENT = {
  "Europe": "Europe", "Asia": "Asie", "Africa": "Afrique", "North America": "Amérique du Nord",
  "South America": "Amérique du Sud", "Oceania": "Océanie", "Seven seas (open ocean)": "Îles des océans"
};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cap = s => s[0].toUpperCase() + s.slice(1);
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmtPct = p => p === 0 ? "0" : p < .01 ? "<0,01" : (p < 10 ? p.toFixed(2) : p.toFixed(1)).replace(".", ",");
const fmtInt = n => Math.round(n).toLocaleString("fr-FR");

/* ---------- Données et état ---------- */
let countries = [], byId = new Map(), regionsBy = new Map(), regionById = new Map();
let worldArea = 0;
// pays et régions visités : id -> date du marquage (ms)
let state = { c: new Map(), r: new Map() };
let current = null, selected = null, tab = "map";
let quick = false;
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
function serialize() { return { v: 2, c: Object.fromEntries(state.c), r: Object.fromEntries(state.r), t: Date.now() }; }
function save() { store.set(LS, JSON.stringify(serialize())); }
try { const d = JSON.parse(store.get(LS) || "null"); if (d) state = { c: toMap(d.c), r: toMap(d.r) }; } catch (e) {}
quick = store.get("explora-quick") === "1";

/* ---------- Chargement ---------- */
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
  const [ct, rt] = await Promise.all([
    fetch("data/countries.json").then(r => r.json()),
    fetch("data/regions.json").then(r => r.json())
  ]);
  countries = topojson.feature(ct, ct.objects.a0).features;
  for (const f of countries) byId.set(f.id, f);
  for (const [code, obj] of Object.entries(rt.objects)) {
    const fs = topojson.feature(rt, obj).features;
    for (const r of fs) { r.area = d3.geoArea(r); r.code = code; regionById.set(r.id, r); worldArea += r.area; }
    fs.sort((a, b) => a.properties.n.localeCompare(b.properties.n, "fr"));
    regionsBy.set(code, fs);
  }
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
}

/* ---------- Carte ---------- */
const svg = d3.select("#map");
const root = svg.append("g");
const gBase = root.append("g");
const gOverlay = root.append("g");
const gDetail = root.append("g").attr("class", "detail");
const gOutline = root.append("g");
const gSel = root.append("g");
const gMe = root.append("g");
const projection = d3.geoNaturalEarth1();
const path = d3.geoPath(projection);
let W = 0, H = 0, k = 1;
const tip = $("tip");

const zoom = d3.zoom().scaleExtent([1, 600]).on("zoom", e => {
  k = e.transform.k;
  root.attr("transform", e.transform);
  if (me) drawMe();
  tip.hidden = true;
});
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
  gBase.selectAll("*").remove();
  gOverlay.selectAll("*").remove();
  gDetail.selectAll("*").remove();
  gBase.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" }));
  gBase.append("path").attr("class", "grat").attr("d", path(d3.geoGraticule10()));
  gBase.selectAll(".country").data(countries, d => d.id).join("path")
    .attr("class", "country").attr("d", path)
    .on("click", (e, d) => { e.stopPropagation(); if (d.id !== current) openCountry(d.id); })
    .on("pointermove", (e, d) => showTip(e, d.properties.n))
    .on("pointerleave", () => tip.hidden = true);
}

function drawMap() {
  gBase.selectAll(".country").classed("visited", d => state.c.has(d.id)).classed("active", d => d.id === current);
  const others = [...state.r.keys()].map(id => regionById.get(id)).filter(r => r && r.code !== current);
  gOverlay.selectAll(".region").data(others, d => d.id).join(enter => enter.append("path").attr("class", "region visited").attr("d", path));
  gDetail.selectAll(".region").data(current ? regionsBy.get(current) || [] : [], d => d.id).join(
    enter => enter.append("path").attr("class", "region").attr("d", path)
      .on("click", (e, d) => { e.stopPropagation(); tapRegion(d); })
      .on("pointermove", (e, d) => showTip(e, d.properties.n))
      .on("pointerleave", () => tip.hidden = true)
  ).classed("visited", d => state.r.has(d.id));
  gOutline.selectAll("path").data(current ? [byId.get(current)] : []).join("path").attr("class", "outline").attr("d", path);
  gSel.selectAll("path").data(selected ? [regionById.get(selected)] : [], d => d.id).join("path").attr("class", "selected").attr("d", path);
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

function zoomTo(feature, dur = 650) {
  const [[x0, y0], [x1, y1]] = path.bounds(feature);
  const topH = document.querySelector(".top").offsetHeight + 10;
  const sheetH = document.querySelector(".sheet .card").offsetHeight + 24;
  const availH = Math.max(140, H - sheetH - topH);
  const s = Math.min(600, .9 / Math.max((x1 - x0) / W, (y1 - y0) / availH));
  const t = d3.zoomIdentity.translate(W / 2, topH + availH / 2).scale(s).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  svg.interrupt().transition().duration(reduceMotion() ? 0 : dur).ease(d3.easeCubicOut).call(zoom.transform, t);
}

function openCountry(code, regionId = null) {
  current = code;
  selected = regionId;
  update();
  zoomTo(byId.get(code).main);
}
function openWorld() {
  current = null; selected = null;
  update();
  svg.interrupt().transition().duration(reduceMotion() ? 0 : 650).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity);
}
svg.on("click", () => { if (selected) { selected = null; update(); } else if (current) openWorld(); });
$("btn-world").onclick = openWorld;

/* ---------- Marquage ---------- */
function tapRegion(r) {
  if (quick) { toggleRegion(r.id); selected = r.id; update(); return; }
  selected = selected === r.id ? null : r.id;
  update();
}
function setRegion(id, on) {
  const r = regionById.get(id);
  if (!r) return;
  if (on) { state.r.set(id, state.r.get(id) || Date.now()); if (!state.c.has(r.code)) state.c.set(r.code, Date.now()); }
  else state.r.delete(id);
  save();
}
function toggleRegion(id) {
  const on = !state.r.has(id);
  setRegion(id, on);
  const r = regionById.get(id);
  toast(on ? r.properties.n + " exploré ✓" : r.properties.n + " retiré", 1300);
}
function setCountry(code, on) {
  if (on) state.c.set(code, state.c.get(code) || Date.now());
  else { state.c.delete(code); for (const r of regionsBy.get(code) || []) state.r.delete(r.id); }
  save();
}

/* ---------- Calculs ---------- */
function visitedIn(code) { return (regionsBy.get(code) || []).reduce((n, r) => n + state.r.has(r.id), 0); }
function exploredArea() { let a = 0; for (const id of state.r.keys()) { const r = regionById.get(id); if (r) a += r.area; } return a; }
function worldPct() { return worldArea ? exploredArea() / worldArea * 100 : 0; }

/* ---------- Mise à jour de l'écran ---------- */
function update() {
  if (!countries.length) return;
  drawMap();
  const pct = worldPct();
  $("m-pct").textContent = fmtPct(pct) + " %";
  $("m-countries").textContent = state.c.size;
  renderSheet();
  if (tab === "progress") renderProgress();
  if (tab === "trips") renderTrips();
}

function renderSheet() {
  const sheet = $("sheet");
  if (current) {
    const f = byId.get(current), n = f.nreg, v = visitedIn(current), been = state.c.has(current);
    const sel = selected && regionById.get(selected);
    const selOn = sel && state.r.has(sel.id);
    sheet.innerHTML = `
      <button class="back" id="s-back">← Monde</button>
      <div class="row">
        <h2 class="grow">${esc(f.properties.n)}</h2>
        <button class="btn ${been ? "done" : "primary"}" id="s-been">${been ? "✓ Visité" : "J'y suis allé"}</button>
      </div>
      <div class="prog">
        <div class="row between"><span>${esc(cap(f.kind))} explorés</span><span class="num">${v} / ${n}</span></div>
        <div class="bar"><i style="width:${n ? v / n * 100 : 0}%"></i></div>
      </div>
      ${sel ? `
      <div class="pick">
        <div class="name"><b>${esc(sel.properties.n)}</b><small>${selOn ? "Exploré" : "Pas encore exploré"}</small></div>
        <button class="btn ${selOn ? "done" : "primary"}" id="s-mark">${selOn ? "Retirer" : "Marquer exploré"}</button>
      </div>` : `<p class="hint">${quick ? "Touche un " + esc(SINGULAR[f.kind] || "endroit") + " pour le marquer ou le retirer." : "Touche un " + esc(SINGULAR[f.kind] || "endroit") + " pour le sélectionner."}</p>`}
      <label class="switch"><input type="checkbox" id="s-quick" ${quick ? "checked" : ""}>Marquage rapide : un appui marque directement</label>`;
    $("s-back").onclick = openWorld;
    $("s-been").onclick = () => { setCountry(current, !been); update(); };
    if (sel) $("s-mark").onclick = () => { toggleRegion(sel.id); update(); };
    $("s-quick").onchange = e => { quick = e.target.checked; store.set("explora-quick", quick ? "1" : "0"); renderSheet(); };
  } else if (!state.c.size) {
    sheet.innerHTML = `
      <h2>Remplis ta carte</h2>
      <p class="hint">Touche un pays pour zoomer dedans, puis choisis les départements, états ou régions où tu es allé.</p>
      <div class="legend"><span><b style="background:var(--fog)"></b>Inexploré</span><span><b style="background:var(--found-soft)"></b>Pays visité</span><span><b style="background:var(--found)"></b>Région explorée</span></div>`;
  } else {
    sheet.innerHTML = `<p class="hint" style="margin:0">Touche un pays pour l'explorer.</p>`;
  }
  document.documentElement.style.setProperty("--sheet-h", document.querySelector(".sheet .card").offsetHeight + 12 + "px");
}

/* ---------- Onglet Progrès ---------- */
function renderProgress() {
  const pct = worldPct();
  const area = exploredArea() * EARTH_R * EARTH_R;
  const n = state.c.size;
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
  const contVisited = contList.filter(c => c.countries > 0 && c.name !== CONTINENT["Seven seas (open ocean)"]).length;
  const next = MILESTONES.find(m => m > n);
  const top = [...state.c.keys()].map(id => byId.get(id)).filter(f => f && f.nreg > 1)
    .map(f => ({ f, v: visitedIn(f.id) })).sort((a, b) => b.v / b.f.nreg - a.v / a.f.nreg).slice(0, 6);
  const C = 2 * Math.PI * 52, ring = Math.max(pct > 0 ? 2 : 0, Math.min(100, pct) / 100 * C);

  $("progress").innerHTML = `
    <h1>Mon exploration</h1>
    <div class="block hero">
      <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" r="52"/>
        <circle class="val" cx="60" cy="60" r="52" stroke-dasharray="${ring} ${C}"/>
        <text x="60" y="54">${Math.round(n / WORLD_COUNTRIES * 100)} %</text><text class="sub" x="60" y="78">des pays</text>
      </svg>
      <div>
        <div class="big">${fmtPct(pct)}<small> %</small></div>
        <div class="muted">du monde exploré</div>
        <div class="small" style="margin-top:6px">${fmtInt(area)} km² parcourus</div>
      </div>
    </div>
    <div class="tiles">
      <div class="tile"><b>${n}</b><span>pays sur ${WORLD_COUNTRIES}</span></div>
      <div class="tile"><b>${state.r.size}</b><span>régions</span></div>
      <div class="tile"><b>${contVisited}</b><span>continents sur 6</span></div>
    </div>
    <div class="block goal">
      <div class="medal">${next || "★"}</div>
      <p>${next ? `Prochain palier : <b>${next} pays</b>. Encore ${next - n} pays à découvrir.` : "Tu as visité tous les pays du monde. Chapeau !"}</p>
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
      <h3>Pays les plus explorés</h3>
      <div class="rows">${top.map(({ f, v }) => `
        <button class="r" data-open="${f.id}">
          <div class="row between"><span>${esc(f.properties.n)}</span><span class="num">${v} / ${f.nreg} ${esc(f.kind)}</span></div>
          <div class="bar"><i style="width:${v / f.nreg * 100}%"></i></div>
        </button>`).join("")}
      </div>
    </div>` : ""}`;
  $("progress").querySelectorAll("[data-open]").forEach(b => b.onclick = () => { showTab("map"); openCountry(b.dataset.open); });
}

/* ---------- Onglet Voyages ---------- */
const openTrips = new Set();
function tripItem(f) {
  const v = visitedIn(f.id), n = f.nreg, open = openTrips.has(f.id);
  return `
    <div class="trip ${open ? "open" : ""}" data-trip="${f.id}">
      <button aria-expanded="${open}">
        <span><b>${esc(f.properties.n)}</b></span>
        <span class="num muted">${v} / ${n} ${esc(f.kind)} <span class="chev">›</span></span>
        <span class="bar"><i style="width:${n ? v / n * 100 : 0}%"></i></span>
      </button>
      ${open ? `
      <div class="trip-body">
        <div class="trip-actions">
          <button class="btn" data-act="map">Voir sur la carte</button>
          <button class="btn danger" data-act="remove">Retirer ce pays</button>
        </div>
        <ul class="checks">${(regionsBy.get(f.id) || []).map(r => `
          <li><label><input type="checkbox" data-r="${r.id}" ${state.r.has(r.id) ? "checked" : ""}><span>${esc(r.properties.n)}</span></label></li>`).join("")}
        </ul>
      </div>` : ""}
    </div>`;
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
  el.querySelectorAll("[data-r]").forEach(cb => cb.onchange = () => {
    setRegion(cb.dataset.r, cb.checked);
    const v = visitedIn(code);
    el.querySelector(":scope > button .num").firstChild.textContent = `${v} / ${f.nreg} ${f.kind} `;
    el.querySelector(":scope > button .bar i").style.width = (f.nreg ? v / f.nreg * 100 : 0) + "%";
    drawMap(); $("m-pct").textContent = fmtPct(worldPct()) + " %"; $("m-countries").textContent = state.c.size;
  });
}
function renderTrips() {
  const list = [...state.c.keys()].map(id => byId.get(id)).filter(Boolean)
    .sort((a, b) => a.properties.n.localeCompare(b.properties.n, "fr"));
  const box = $("trips");
  box.innerHTML = list.length ? list.map(tripItem).join("")
    : `<div class="empty-state">Aucun voyage pour l'instant.<br>Ajoute un pays ci-dessus ou depuis la carte.</div>`;
  box.querySelectorAll("[data-trip]").forEach(bindTrip);
}

/* ---------- Recherches ---------- */
function searchHits(s, withRegions) {
  const hits = [];
  for (const f of countries) if (norm(f.properties.n).includes(s)) hits.push({ n: f.properties.n, k: "pays", c: f.id });
  hits.sort((a, b) => norm(a.n).indexOf(s) - norm(b.n).indexOf(s));
  if (withRegions && s.length >= 3) for (const r of regionById.values()) {
    if (hits.length > 30) break;
    if (norm(r.properties.n).includes(s)) hits.push({ n: r.properties.n, k: byId.get(r.code)?.properties.n || "", c: r.code, r: r.id });
  }
  return hits.slice(0, 12);
}
function bindSearch(input, list, withRegions, label, pick) {
  input.addEventListener("input", () => {
    const s = norm(input.value.trim());
    if (!s) { list.hidden = true; return; }
    const hits = searchHits(s, withRegions);
    list.innerHTML = hits.map(h => `<li><button data-c="${h.c}" data-r="${h.r || ""}"><span>${esc(h.n)}</span><span class="k">${esc(label(h))}</span></button></li>`).join("")
      || `<li class="empty">Aucun résultat</li>`;
    list.hidden = false;
    list.querySelectorAll("button").forEach(b => b.onclick = () => {
      input.value = ""; list.hidden = true; input.blur();
      pick(b.dataset.c, b.dataset.r || null);
    });
  });
  input.addEventListener("keydown", e => { if (e.key === "Escape") { input.value = ""; list.hidden = true; } });
  input.addEventListener("blur", () => setTimeout(() => list.hidden = true, 200));
}
bindSearch($("q"), $("results"), true, h => h.k, (c, r) => openCountry(c, r));
bindSearch($("add-q"), $("add-results"), false, h => state.c.has(h.c) ? "déjà ajouté" : "ajouter", c => {
  if (!state.c.has(c)) { setCountry(c, true); toast(byId.get(c).properties.n + " ajouté à tes voyages ✓"); }
  openTrips.add(c);
  update();
  document.querySelector(`[data-trip="${c}"]`)?.scrollIntoView({ block: "center", behavior: reduceMotion() ? "auto" : "smooth" });
});

/* ---------- Onglets ---------- */
function showTab(name) {
  tab = name;
  document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
  for (const v of ["map", "progress", "trips", "settings"]) $("view-" + v).hidden = v !== name;
  if (name === "map" && countries.length && resize()) {
    svg.call(zoom.transform, d3.zoomIdentity); drawBase(); update();
    if (current) zoomTo(byId.get(current).main, 0);
  }
  if (name === "progress") renderProgress();
  if (name === "trips") renderTrips();
  if (name === "settings") renderSettings();
}
document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.onclick = () => showTab(b.dataset.tab));

/* ---------- Réglages ---------- */
function applyTheme(t) {
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  metas.forEach(m => {
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
    const c = toMap(d.c), r = toMap(d.r);
    let added = 0;
    for (const [id, t] of c) if (byId.has(id) && !state.c.has(id)) { state.c.set(id, t); added++; }
    for (const [id, t] of r) if (regionById.has(id) && !state.r.has(id)) state.r.set(id, t);
    save(); update();
    toast(`Sauvegarde importée : ${added} nouveau${added > 1 ? "x" : ""} pays`);
  } catch (err) { toast("Ce fichier n'est pas une sauvegarde Explora."); }
};
$("btn-reset").onclick = e => {
  const b = e.currentTarget;
  if (b.dataset.armed) { state = { c: new Map(), r: new Map() }; save(); openTrips.clear(); current = null; selected = null; update(); svg.call(zoom.transform, d3.zoomIdentity); b.textContent = "Tout effacer"; delete b.dataset.armed; toast("Tous tes voyages ont été effacés."); return; }
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
    toast(state.r.has(r.id) ? "Tu es en " + r.properties.n + " (déjà explorée)" : "Tu es en " + r.properties.n + ". Touche « Marquer exploré » pour l'ajouter.", 3500);
  }, err => {
    navigator.geolocation.clearWatch(watchId); watchId = null; btnLoc.classList.remove("on");
    toast(err.code === 1 ? "Autorise l'accès à ta position dans les réglages pour te voir sur la carte." : "Impossible de trouver ta position pour le moment.", 5000);
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
};

addEventListener("resize", () => {
  if (!countries.length || tab !== "map" || !resize()) return;
  svg.call(zoom.transform, d3.zoomIdentity); drawBase(); update();
  if (current) zoomTo(byId.get(current).main, 0);
});

load().catch(() => { $("loading").textContent = "La carte n'a pas pu se charger. Recharge la page."; });
})();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
