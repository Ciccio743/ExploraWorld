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
// Royaume-Uni : comtés cérémoniaux en Angleterre, grandes régions en Écosse, comtés historiques
// au Pays de Galles et en Irlande du Nord (taille comparable aux départements français)
const UK = {
  "Greater London": ["City"],
  "Cheshire": ["Cheshire West and Chester", "Cheshire East", "Halton", "Warrington"],
  "Shropshire": ["Shropshire", "Telford and Wrekin"],
  "Gloucestershire": ["Gloucestershire", "South Gloucestershire"],
  "Tyne and Wear": ["North Tyneside", "South Tyneside", "Sunderland", "Gateshead", "Newcastle upon Tyne"],
  "Durham": ["Durham", "Hartlepool", "Darlington", "Stockton-on-Tees"],
  "North Yorkshire": ["North Yorkshire", "York", "Redcar and Cleveland", "Middlesbrough"],
  "East Riding of Yorkshire": ["East Riding of Yorkshire", "Kingston upon Hull"],
  "Lincolnshire": ["Lincolnshire", "North Lincolnshire", "North East Lincolnshire"],
  "Essex": ["Essex", "Southend-on-Sea", "Thurrock"],
  "Kent": ["Kent", "Medway"],
  "East Sussex": ["East Sussex", "Brighton and Hove"],
  "Hampshire": ["Hampshire", "Portsmouth", "Southampton"],
  "Dorset": ["Dorset", "Bournemouth", "Poole"],
  "Devon": ["Devon", "Torbay", "Plymouth"],
  "Cornouailles": ["Cornwall", "Isles of Scilly"],
  "Somerset": ["Somerset", "North Somerset", "Bath and North East Somerset"],
  "Merseyside": ["Knowsley", "Liverpool", "Sefton", "Merseyside"],
  "Lancashire": ["Lancashire", "Blackpool", "Blackburn with Darwen"],
  "Cambridgeshire": ["Cambridgeshire", "Peterborough"],
  "Buckinghamshire": ["Buckinghamshire", "Milton Keynes"],
  "Bedfordshire": ["Luton", "Central Bedfordshire", "Bedford"],
  "Nottinghamshire": ["Nottinghamshire", "Nottingham"],
  "Leicestershire": ["Leicestershire", "Leicester"],
  "Derbyshire": ["Derbyshire", "Derby"],
  "South Yorkshire": ["Doncaster", "Rotherham", "Sheffield", "Barnsley"],
  "West Yorkshire": ["Calderdale", "Kirklees", "Leeds", "Bradford", "Wakefield"],
  "Grand Manchester": ["Wigan", "Stockport", "Salford", "Bolton", "Trafford", "Manchester", "Oldham", "Rochdale", "Tameside", "Bury"],
  "Birmingham et West Midlands": ["Solihull", "Coventry", "Birmingham", "Sandwell", "Dudley", "Walsall", "Wolverhampton"],
  "Staffordshire": ["Staffordshire", "Stoke-on-Trent"],
  "Berkshire": ["West Berkshire", "Wokingham", "Bracknell Forest", "Royal Borough of Windsor and Maidenhead", "Slough", "Reading"],
  "Wiltshire": ["Wiltshire", "Swindon"],
  "Île de Wight": ["Isle of Wight"],
  // Écosse
  "Highlands": ["Highland"],
  "Îles écossaises": ["Eilean Siar", "Orkney", "Shetland Islands"],
  "Aberdeen et Grampian": ["Moray", "Aberdeenshire", "Aberdeen"],
  "Tayside": ["Angus", "Dundee", "Perthshire and Kinross"],
  "Édimbourg et Lothian": ["Edinburgh", "West Lothian", "East Lothian", "Midlothian"],
  "Stirling et Forth": ["Clackmannanshire", "Stirling", "Falkirk"],
  "Glasgow et Clyde": ["Glasgow", "Inverclyde", "Renfrewshire", "East Renfrewshire", "West Dunbartonshire", "East Dunbartonshire", "North Lanarkshire", "South Lanarkshire"],
  "Ayrshire": ["South Ayrshire", "North Ayshire", "East Ayrshire"],
  "Argyll et Bute": ["Argyll and Bute"],
  "Scottish Borders": ["Scottish Borders"],
  "Dumfries et Galloway": ["Dumfries and Galloway"],
  // Pays de Galles
  "Gwynedd et Anglesey": ["Gwynedd", "Anglesey"],
  "Clwyd": ["Conwy", "Denbighshire", "Flintshire", "Wrexham"],
  "Dyfed": ["Ceredigion", "Carmarthenshire", "Pembrokeshire"],
  "Swansea et Glamorgan Ouest": ["Swansea", "Neath Port Talbot"],
  "Glamorgan central": ["Bridgend", "Rhondda, Cynon, Taff", "Merthyr Tydfil"],
  "Cardiff et Vale of Glamorgan": ["Cardiff", "Vale of Glamorgan"],
  "Gwent": ["Monmouthshire", "Newport", "Torfaen", "Blaenau Gwent", "Caerphilly"],
  // Irlande du Nord
  "Antrim et Belfast": ["Belfast", "Moyle", "Larne", "Carrickfergus", "Newtownabbey", "Antrim", "Ballymoney", "Ballymena", "Lisburn"],
  "Down": ["North Down", "Ards", "Down", "Banbridge", "Newry and Mourne", "Castlereagh"],
  "Armagh": ["Armagh", "Craigavon"],
  "Londonderry": ["Derry", "Limavady", "Coleraine", "Magherafelt"],
  "Tyrone": ["Strabane", "Dungannon", "Omagh", "Mid Ulster"],
  "Fermanagh": ["Fermanagh"]
};
const ukByName = {};
for (const [county, names] of Object.entries(UK)) for (const n of names) ukByName[n] = county;
const GROUP = {
  GBR: p => /London Borough|City Corporation/.test(p.type_en) && p.geonunit === "England" ? "Greater London" : ukByName[p.name] || p.name,
  SVN: p => p.region, LVA: p => p.region, UGA: p => p.region, AZE: p => p.region, MLT: p => p.region
};
const FR = {
  "England": "Angleterre", "Scotland": "Écosse", "Wales": "Pays de Galles", "Northern Ireland": "Irlande du Nord",
  "Greater London": "Grand Londres", "Grand Manchester": "Grand Manchester", "South East": "Sud-Est de l'Angleterre", "South West": "Sud-Ouest de l'Angleterre",
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
