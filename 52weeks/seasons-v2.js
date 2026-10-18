'use strict';
/* 52-week season chart, version 2 (#24). Reads the same data files as seasons.html (data.js, points-data.js, reference-data.js, geo-data.js, geo.js). */
(() => {
  const D = window.DIRECTORY, P = window.WEEKLY_POINTS, REF = (window.REFERENCE && window.REFERENCE.resorts) || [];
  const $ = id => document.getElementById(id);
  /* Cities and their map positions (geo-data.js, the largest download) load only when a place search needs them,
     and fill the search suggestions when the search box is first used (planning #36) */
  let GEO = window.ResortGeo || null, geoLoad = null, geoFailed = false;
  const loadScript = src => new Promise((ok, fail) => { const e = document.createElement('script'); e.src = src; e.onload = ok; e.onerror = fail; document.head.appendChild(e); });
  const loadGeo = () => geoLoad || (geoLoad = GEO ? Promise.resolve() : loadScript('geo-data.js').then(() => loadScript('geo.js')).then(() => {
    GEO = window.ResortGeo; $('places').insertAdjacentHTML('beforeend', GEO.options());
  }, () => { geoFailed = true; })); // without it, a search matches names as text, as before

  /* Official directory: the 2026/2027 edition, where CW search bar page = book page + 4 */
  const DIRECTORY_URL = 'https://media.travelandleisure.com/WD/email/2025/0625-2025/cw-directory/index.html';
  const PAGE_OFFSET = 4;
  const cite = n => '<a href="' + DIRECTORY_URL + '#p=' + n + '" target="_blank" rel="noopener">' + (n - PAGE_OFFSET) + '</a>'; // shows the printed page; the link keeps the CW search bar page n

  const SEASONS = ['Prime', 'High', 'Value', 'Quiet'];
  const CLS = { Prime: 's-p', High: 's-h', Value: 's-v', Quiet: 's-q', 'WorldMark High': 'w-h', 'WorldMark Medium': 'w-m', 'WorldMark Low': 'w-l' };
  /* WorldMark (Club Pass) charts don't name seasons; their week groups are ranked by points into three shades of purple */
  const WM_SEASONS = ['WorldMark High', 'WorldMark Medium', 'WorldMark Low'];
  const LETTER = { Prime: 'P', High: 'H', Value: 'V', Quiet: 'Q', 'WorldMark High': 'H', 'WorldMark Medium': 'M', 'WorldMark Low': 'L' };
  const NONE_LABEL = 'Not Offered';
  /* Charts that print week 53 themselves (2026/2027): Page 91 (CW search bar page 95) and Page 184 (CW search bar page 188).
     Every other resort's week 53 follows week 52 (slashed overlay) until Club Wyndham confirms. */
  const WEEK53 = { 'Club Wyndham Paniolo Greens': 'Prime', 'Little Sweden': 'Prime' };
  const COLLECTION_LABEL = { 'Club Pass': 'WorldMark / Club Pass', 'Margaritaville Vacation Club': 'Margaritaville', 'Associate': 'Associate (Australia & New Zealand)' };
  /* Resorts where some associations voted to close (Club Wyndham, "Your Resort Portfolio Is Getting A Refresh", 2025; bankruptcy tracking sites from Owner Services) */
  const NOTICES = {
    'Club Wyndham Star Island': { url: 'https://cases.omniagentsolutions.com/?clientId=3756', site: 'Star Island Vacation Ownership Association, Inc.' },
    'Club Wyndham Pagosa': { url: 'https://omniagentsolutions.com/Pagosa', site: 'The Pagosa Associations' }
  };
  const NOTICE_TEXT = 'Some associations at this resort voted to close, so its inventory is being consolidated.';
  const COLLECTION_ORDER = ['Club Wyndham', 'Affiliate', 'Club Pass', 'Margaritaville Vacation Club', 'Associate']; // owner's order (2026-10-12): Club Wyndham, Affiliate, a separator, then the rest
  const COLLECTION_AFTER_SEPARATOR = 'Club Pass';
  const RESET_COLLECTIONS = ['Club Wyndham', 'Affiliate'];
  const COLLECTION_OFF = ['Club Pass', 'Associate'];
  /* Countries and territories for search (owner, 2026-10-12): label shown, the country name used in the data; aliases are what people type */
  const COUNTRIES = [['Australia', 'Australia'], ['Canada', 'Canada'], ['Fiji', 'Fiji'], ['Mexico', 'Mexico'], ['New Zealand', 'New Zealand'], ['Puerto Rico', 'Puerto Rico'], ['United States', 'United States'], ['US Virgin Islands', 'U.S. Virgin Islands']];
  const COUNTRY_ALIASES = { 'pr': 'Puerto Rico', 'nz': 'New Zealand', 'usvi': 'U.S. Virgin Islands', 'us virgin islands': 'U.S. Virgin Islands', 'u s virgin islands': 'U.S. Virgin Islands', 'virgin islands': 'U.S. Virgin Islands',
    'us': 'United States', 'usa': 'United States', 'u s a': 'United States', 'united states': 'United States', 'united states of america': 'United States' };
  const GROUPS = ['Hotel', 'Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom', '5 Bedroom']; // smallest first
  const SPANS = [0, 1, 2, 5, 10, 15, -1]; // weeks before and after the chosen week; 0 = just that week, -1 = the whole year
  const RADII = [10, 25, 35, 50, 75, 100, 150, 200, 250, 350, 500, 750, 1000];
  const MAX_DAYS = 14;

  /* ---- Name corrections (planning #38, owner's list of 2026-10-11) ----
     Per resort: "types" maps a raw room type (as in points-data.js or the chart PDF column) to the room type and building to show,
     with "rank" to order room types of the same size the way the chart prints them (left to right, lowest to highest points);
     "charts" maps a raw chart name to the building it stands for ('' = none). BUILDING_LINES gives a building's lines where the
     general split would be wrong. Directory = Club Wyndham Member's Directory 2026/2027. */
  const NAME_FIX = {
    /* Chart: cw-club-pass-santa-fe-pc.pdf columns "Hotel Room, Compact Studio, 1 BR Compact, 1 BR". "Compact" is part of the room type, not a building. */
    'WorldMark Santa Fe': { types: {
      'Hotel Room': { type: 'Hotel Room', bldg: '', rank: 1 }, 'Compact Studio': { type: 'Compact Studio', bldg: '', rank: 2 },
      '1 BR Compact': { type: '1 BR Compact', bldg: '', rank: 3 }, '1 BR': { type: '1 BR', bldg: '', rank: 4 } } },
    /* Chart: cw-club-pass-scottsdale-pc.pdf, columns left to right (lowest to highest points within each size): Studio Hotel, 1 BR Suite, 1 BR Deluxe, 1 BR Penthouse, 2 BR, 3 BR, 1 BR Presidential, 2 BR Presidential, 4 BR Presidential */
    'WorldMark Scottsdale': { types: Object.fromEntries(['Studio Hotel', '1 BR Suite', '1 BR Deluxe', '1 BR Penthouse', '2 BR', '3 BR', '1 BR Presidential', '2 BR Presidential', '4 BR Presidential']
      .map((t, i) => [t, { type: t, bldg: '', rank: i + 1 }])) },
    /* Directory Page 18 (CW search bar page 22): the 2 BR Lockoff belongs to the "Tanglewood I & II, Ridgewood I, Ridgewood II – buildings 1A-15A" chart */
    'Club Wyndham Flagstaff': { types: {
      '2 Bedroom Lockoff — Tanglewood I & II, Ridgewood I, Ridgewood II buildings 1A–15A': { type: '2 BR Lockoff', bldg: 'Tanglewood I & II; Ridgewood I; Ridgewood II buildings 1A–15A' } } },
    /* Directory Page 45 (CW search bar page 49): columns "Teal Landing" and "Peregrine"; its notes call them "Teal Landing" and "Peregrine Townhomes" */
    'Club Wyndham Pagosa': { types: Object.fromEntries([
      ['Teal Landing', '1 Bedroom Suite'], ['Teal Landing', '1 Bedroom Deluxe'], ['Teal Landing', '2 Bedroom Deluxe'], ['Teal Landing', '3 Bedroom Deluxe'],
      ['Teal Landing', '4 Bedroom Presidential'], ['Teal Landing', '2 Bedroom Lockoff'], ['Peregrine', '1 Bedroom'], ['Peregrine', '1 Bedroom Deluxe'], ['Peregrine', '2 Bedroom Lockoff']
    ].map(([b, t]) => [b + ' — ' + t, { type: t.replace('Bedroom', 'BR'), bldg: b === 'Peregrine' ? 'Peregrine Townhomes' : b }])) },
    /* Directory Page 132 (CW search bar page 136) "Fairway Forest & Foxhunt" and Page 133 (CW search bar page 137) "Mountain Laurel" */
    'Club Wyndham Resort at Fairfield Sapphire Valley': { charts: { 'Chart 1': 'Mountain Laurel' } },
    /* Directory Page 98 (CW search bar page 102) and Page 99 (CW search bar page 103): one chart each, no building named */
    'Makai Club': { charts: { 'All listed suites': '' } },
    'Makai Club Cottages': { charts: { 'All listed suites': '' } },
    /* Directory Page 107 (CW search bar page 111): the column is "Studio-J (Asian Inspired)"; the parentheses are part of the room type, not a building */
    'Club Wyndham Royal Garden at Waikiki': { types: { 'Studio-J (Asian Inspired)': { type: 'Studio-J (Asian Inspired)', bldg: '' } } },
    /* Directory Page 156 (CW search bar page 160): "Oceanview" and "Oceanfront", one word, no hyphen */
    'Club Wyndham Towers on the Grove': { types: {
      'Studio Ocean-view': { type: 'Studio Oceanview', bldg: '' }, '1 Bedroom Ocean-view': { type: '1 BR Oceanview', bldg: '' },
      '1 Bedroom Ocean-front': { type: '1 BR Oceanfront', bldg: '' }, '2 Bedroom Ocean-front': { type: '2 BR Oceanfront', bldg: '' } } }
  };
  const BUILDING_LINES = {
    /* Directory Page 18 (CW search bar page 22) and Page 19 (CW search bar page 23), in the owner's wording (planning #38, item 6) */
    'Tanglewood I & II; Ridgewood I; Ridgewood II buildings 1A–15A': ['Tanglewood I & II', 'Ridgewood I', 'Ridgewood II - Buildings 1A-15A'],
    'Lake Tara Gardens; Lake Tara Townhouses; Lake Tara Townhouses II; Tara Cove': ['Lake Tara Gardens', 'Lake Tara Townhouses', 'Lake Tara Townhouses II', 'Tara Cove'],
    'Ridgewood II buildings 16A–24A': ['Ridgewood II - Buildings 16A-24A'],
    /* SeaWatch: the directory prints "Towers & North Tower" (Page 154, CW search bar page 158); the resort map names the towers
       (https://clubwyndham.wyndhamdestinations.com/us/en/resorts/wyndham-hotels-resorts/united-states-of-america/south-carolina/myrtle-beach/club-wyndham-seawatch-resort).
       Owner's wording, 2026-10-11 (planning #38). The "Villas" chart stays as the directory prints it. */
    'Towers & North Tower': ['South Tower 1', 'South Tower 2', 'North Tower'],
    /* Directory Page 44 (CW search bar page 48): "Eagle’s Loft, Ptarmigan Townhomes" */
    "Eagle's Loft, Ptarmigan Townhomes": ['Eagle’s Loft', 'Ptarmigan Townhomes']
  };

  /* The last word of a resort name stays on one line with its crown and dot, so a dot never wraps away from the name */
  const nameHtml = (name, marks) => { const i = name.lastIndexOf(' ');
    return esc(name.slice(0, i + 1)) + '<span class="nw">' + esc(name.slice(i + 1)) + marks + '</span>'; };
  const br = s => String(s || '').replace(/\bBedroom\b/g, 'BR');
  const groupLabel = g => g === 'Hotel' ? 'Hotel room' : br(g);
  const sizeWords = g => g === 'Hotel' ? 'Hotel rooms' : g === 'Studio' ? 'Studios' : br(g) + ' units';
  /* Resort names as Club Wyndham's website writes them (owner, 2026-10-16; planning name comparison). The data keeps the directory's names (other pages read them), so this only changes what is shown; searching still matches the old names too. Names use the plain keyboard apostrophe. */
  const WEBSITE_NAMES = { 'WorldMark Lake House': 'WorldMark Chelan - Lake House', 'Club Wyndham Holua Resort at Mauna Loa Village': 'Club Wyndham Holua Resort at the Mauna Loa Village',
    'Club Wyndham Kauai Coast Resort at The Beachboy': 'Club Wyndham Kauai Coast Resort at the Beachboy', 'Club Wyndham Waikiki Marina Resort at The Ilikai': 'Club Wyndham Waikiki Marina Resort at the Ilikai' };
  const officialName = n => (WEBSITE_NAMES[n] || n.replace(/^Margaritaville Vacation Club - /, 'Margaritaville Vacation Club by Wyndham - ')).replace(/[‘’]/g, "'");
  const shortName = s => officialName(s).replace(/^Club Wyndham /, '');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const crownSvg = cls => '<svg class="crown' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 10 2 3l4 3 2-5 2 5 4-3 1 7z"/></svg>';

  /* ---- RCI calendar: week 1 starts on the first Friday of January; week 53 exists when Dec 31 is a Friday ---- */
  const DAY = 864e5;
  const firstFriday = y => { const d = new Date(Date.UTC(y, 0, 1)).getUTCDay(); return Date.UTC(y, 0, 1 + ((5 - d + 7) % 7)); };
  const weeksIn = y => new Date(Date.UTC(y, 11, 31)).getUTCDay() === 5 ? 53 : 52;
  /* One date formatter per format, made once (planning #36: formatting every cell from scratch was most of each redraw) */
  const MD = { month: 'short', day: 'numeric' }, MDY = { month: 'short', day: 'numeric', year: 'numeric' }, LONG = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const formatters = new Map();
  const fmt = (t, o) => { let f = formatters.get(o); if (!f) formatters.set(o, f = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'UTC' }, o))); return f.format(t); };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const now = new Date(), todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startYear = now.getFullYear();
  const WEEKS = [];
  for (let y = startYear - 1; y <= startYear + 3; y++) for (let w = 1; w <= weeksIn(y); w++) WEEKS.push({ y, w, start: firstFriday(y) + (w - 1) * 7 * DAY });
  const weekOf = t => WEEKS.findIndex(x => x.start <= t && t < x.start + 7 * DAY);
  const todayIdx = weekOf(todayUTC);
  const makeWeekLabel = x => {
    const end = x.start + 7 * DAY, sameYear = new Date(end).getUTCFullYear() === x.y;
    return 'Week ' + x.w + ' · ' + fmt(x.start, MD) + (sameYear ? '' : ', ' + x.y) + ' – ' + fmt(end, MDY);
  };
  const weekLabels = new Map(); // by the week's start, so a trip's part-week columns share their week's label
  const weekLabel = x => { let l = weekLabels.get(x.start); if (l === undefined) weekLabels.set(x.start, l = makeWeekLabel(x)); return l; };
  const isWeekend = t => { const d = new Date(t).getUTCDay(); return d === 5 || d === 6; }; // Friday and Saturday nights

  /* ---- Data ---- */
  const classOf = new Map(P.classifications.map((c, i) => [c.id, Object.assign({ order: i }, c)]));
  const pointsBySchedule = new Map();
  for (const p of P.rows) { if (!pointsBySchedule.has(p.scheduleId)) pointsBySchedule.set(p.scheduleId, []); pointsBySchedule.get(p.scheduleId).push(p); }
  /* Nightly points (nightlydata.js): Fri-Sat and Sun-Thur per night from the directory charts. Only rows whose nightly points add up to the weekly points are listed. */
  const NIGHTLY = window.NIGHTLY_POINTS || {};
  for (const p of P.rows) if (NIGHTLY[p.id]) { if (NIGHTLY[p.id].byWeek) p.nightlyByWeek = NIGHTLY[p.id].byWeek; else p.nightly = NIGHTLY[p.id]; } /* byWeek: several rates inside one season, listed week by week like the Club Pass rows */
  /* Club Pass (WorldMark) and affiliate points, read from Club Wyndham's own chart PDFs (club-pass-points.js).
     Each chart column becomes a room-type row with its season, full-week points and nightly points for every week. */
  const CP = (window.CLUB_PASS_POINTS && window.CLUB_PASS_POINTS.resorts) || {};
  function typeIdFor(label) {
    const l = label.toLowerCase(), m = l.match(/(\d)\s*(br|bedroom)/);
    const g = /hotel/.test(l) ? 'Hotel' : /studio/.test(l) ? 'Studio' : m ? m[1] + ' Bedroom' : null;
    if (!g) return null;
    const cands = P.classifications.filter(c => c.group === g && P.rows.some(p => p.category === c.id));
    const words = c => c.label.toLowerCase().replace(/bedroom/g, 'br').split(/\s+/).filter(w => !/^(\d|br|studio|hotel|room)$/.test(w));
    let best = cands.find(c => !words(c).length) || cands[0];
    for (const c of cands) { const ws = words(c); if (ws.length && ws.every(w => l.includes(w)) && ws.length > words(best).length) best = c; }
    return best ? best.id : null;
  }
  /* Angel Fire Resort (owner, 2026-10-12): Cabin Share I is a building of the resort, like Cabin Share II, not part of its name.
     Its own chart (cw-angel-fire-cabin-share-pc.pdf) joins the resort's chart as one more column. The resort's chart
     (cw-angel-fire-pc.pdf) states "A Hotel Studio and a Hotel Room Deluxe equals total point value for a 1 BR Deluxe Lockoff",
     so that room type is the sum of the two Eagle Wing Suites columns (full week and each night type). */
  /* The El Cid resorts have left Club Wyndham (owner, 2026-10-16): they are not in the chart. */
  D.rows = D.rows.filter(s => !/^El Cid /.test(s.name));
  const AF = CP['Angel Fire Resort'], AF1 = CP['Angel Fire Resort - Cabin Share I'];
  if (AF && AF1 && !AF.tables[0].columns.includes('Cabin Share I 3 BR')) {
    const t = AF.tables[0], cols = t.columns, add = (a, b) => a.map((x, i) => x + b[i]);
    cols.splice(cols.indexOf('Cabin Share II 3 BR Deluxe'), 0, 'Cabin Share I 3 BR');
    cols.push('Eagle Wing Suites 1 BR Deluxe Lockoff');
    t.bands.forEach((b, i) => { b.rates['Cabin Share I 3 BR'] = AF1.tables[0].bands[i].rates['Cabin Share I 3 BR'];
      b.rates['Eagle Wing Suites 1 BR Deluxe Lockoff'] = add(b.rates['Eagle Wing Suites Hotel Studio'], b.rates['Eagle Wing Suites Hotel Room Deluxe']); });
    delete CP['Angel Fire Resort - Cabin Share I'];
    D.rows = D.rows.filter(s => s.name !== 'Angel Fire Resort - Cabin Share I');
  }
  for (const s of D.rows) {
    const c = CP[s.name]; if (!c) continue;
    s.cp = c;
    const rows = [];
    for (const t of c.tables) for (const col of t.columns) {
      const weeks = Array(53).fill(null), pts = Array(53).fill(null), nights = Array(53).fill(null);
      for (const b of t.bands) { const r = b.rates[col], season = b.season || 'WorldMark ' + b.tier;
        for (const w of b.weeks) { if (w < 1 || w > 53) continue; weeks[w - 1] = season; pts[w - 1] = r ? r[2] : null; nights[w - 1] = r ? [r[0], r[1]] : null; } }
      rows.push({ scheduleId: s.id, roomType: col, category: typeIdFor(col), weeks, weeklyPoints: pts, nightlyByWeek: nights, multiple: !!t.building, schedule: t.building, pages: [], bands: [], cpChart: true });
    }
    pointsBySchedule.set(s.id, rows);
    if (!(s.weeks || []).some(x => CLS[x]) && rows[0]) s.weeks = rows[0].weeks.slice(0, 52); // season colors for "None"
  }
  /* Villas at Fairfield (owner, 2026-10-12): one points chart by unit type, for these buildings (Lake Tara Townhouses III has only 2 BR units) */
  const VILLAS = { 'Club Wyndham Villas at Fairfield': [['Lake Tara Gardens; Lake Tara Townhouses; Lake Tara Townhouses II; Tara Cove', ['Studio', '1 Bedroom', '2 Bedroom', '2 Bedroom Loft']], ['Lake Tara Townhouses III', ['2 Bedroom']]] };
  for (const s of D.rows) { const b = VILLAS[s.name], rows = pointsBySchedule.get(s.id); if (!b || !rows) continue;
    pointsBySchedule.set(s.id, b.flatMap(([name, only]) => rows.filter(p => !only || only.includes(p.roomType)).map(p => Object.assign({}, p, { multiple: true, schedule: name })))); }
  const refByName = new Map(REF.map(r => [r.name, r])), refById = new Map(REF.filter(r => r.resort_id).map(r => [r.resort_id, r]));
  const refOf = s => refByName.get(s.name) || refById.get(s.resort_id) || {};
  const hasChart = s => (s.weeks || []).some(x => CLS[x]);
  const resortKey = s => s.resort_id || s.name;
  /* Room types run smallest to largest (owner, 2026-10-15, planning #43): by size, then by lowest weekly points (size drives price), then by name */
  const lowestPoints = new Map();
  const lowest = p => { let m = lowestPoints.get(p); if (m === undefined) { m = Infinity; for (const x of p.weeklyPoints || []) if (x != null && x < m) m = x; lowestPoints.set(p, m); } return m; };
  const typesInGroup = g => [...CLASSES.values()].filter(c => c.group === g).sort((a, b) => classCost(a) - classCost(b) || a.label.localeCompare(b.label));
  const groupOfType = id => (CLASSES.get(id) || classOf.get(id) || {}).group;
  const classCost = c => c.n ? c.sum / c.n : Infinity;
  const collections = [...new Set(D.rows.map(s => s.collection))].sort((a, b) => (COLLECTION_ORDER.indexOf(a) + 99) % 99 - (COLLECTION_ORDER.indexOf(b) + 99) % 99 || a.localeCompare(b));
  const regionOf = s => s.country === 'United States' ? s.state : s.country;
  const regions = [...new Set(D.rows.map(regionOf).filter(Boolean))].sort();
  const regionByName = new Map(regions.map(r => [norm(r), r]));
  const countryOfQuery = q => COUNTRY_ALIASES[norm(q)] || (COUNTRIES.find(c => norm(c[0]) === norm(q)) || [])[1] || null;
  /* Room type first, then any building name: "Mountain Laurels: 1 Bedroom Deluxe" becomes "1 BR Deluxe · Mountain Laurels" */
  /* Building names can come four ways: "Mountain Laurels: 1 Bedroom Deluxe", "Studio Deluxe (Ocean View)", "2 Bedroom Lockoff — Mountain Laurel"
     (either side of the dash), or, on Club Wyndham's own charts, before the room type ("Cabin Share II 3 BR Deluxe").
     NAME_FIX overrides those rules where they read a name wrong. */
  const scheduleName = new Map(D.rows.map(s => [s.id, s.name]));
  const SIZE_WORD = /^(Hotel|Studio|\d\s*(BR|Bedroom)\b)/i;
  const typeParts = p => { const t = p.roomType || (classOf.get(p.category) || {}).label || '';
    const fix = ((NAME_FIX[scheduleName.get(p.scheduleId)] || {}).types || {})[t];
    if (fix) return { type: fix.type, bldg: fix.bldg, rank: fix.rank };
    const i = t.indexOf(': ');
    if (i > 0) return { type: br(t.slice(i + 2)), bldg: t.slice(0, i) };
    const d = t.split(' — '); if (d.length === 2) { const [a, b] = SIZE_WORD.test(d[0]) ? d : [d[1], d[0]];
      return { type: br(a), bldg: p.multiple && norm(b) === norm(p.schedule) ? p.schedule : b }; } // "— the whole chart" stays with its chart
    const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/); if (m) return { type: br(m[1]), bldg: m[2] };
    if (p.cpChart) { const k = t.search(/\b(Hotel|Studio|\d\s*BR|\d\s*Bedroom|I BR)\b/i); if (k > 0) return { type: br(t.slice(k)), bldg: t.slice(0, k).trim() }; }
    return { type: br(t), bldg: '' }; };
  const typeLabel = p => { const x = typeParts(p); return x.type + (x.bldg ? ' · ' + x.bldg : ''); };
  const typeHtml = r => esc(typeParts(r.p).type);
  /* Room Types lists every room type the chart shows (owner, 2026-10-16): a type with its own name (Studio-J, Studio King, 2 BR Boulevard,
     a view or a level) is its own choice, next to the plain categories. Rows that show the same name within a size share one choice. */
  const typeKey = t => br(t).replace(/\s+/g, '').toLowerCase();
  const typeName = p => br(typeParts(p).type).replace(/\s+/g, ' ').trim();
  const CLASSES = new Map(), idByKey = new Map(), idsOfCategory = new Map(), typeIds = new Map();
  for (const c of P.classifications) if (P.rows.some(p => p.category === c.id)) idByKey.set(c.group + '|' + typeKey(c.label), c.id);
  const typeId = p => { let id = typeIds.get(p);
    if (id === undefined) { const base = classOf.get(p.category); if (!base) return p.category;
      const t = typeName(p), k = base.group + '|' + typeKey(t);
      id = idByKey.get(k); if (!id) idByKey.set(k, id = base.group + '::' + t);
      typeIds.set(p, id); }
    return id; };
  for (const ps of pointsBySchedule.values()) for (const p of ps) { const base = classOf.get(p.category); if (!base) continue;
    const id = typeId(p); let c = CLASSES.get(id);
    if (!c) CLASSES.set(id, c = { id, label: classOf.has(id) ? classOf.get(id).label : typeName(p), group: base.group, order: classOf.has(id) ? classOf.get(id).order : base.order, sum: 0, n: 0 });
    if (!idsOfCategory.has(p.category)) idsOfCategory.set(p.category, new Set()); idsOfCategory.get(p.category).add(id);
    const m = lowest(p); if (m !== Infinity) { c.sum += m; c.n++; } }
  /* Building or building group for a row: from the room type name ("Mountain Laurels: ..."), or from the chart it belongs to.
     A chart's name counts as a building only when it isn't a placeholder ("Chart 1", "All listed suites"). */
  const chartBldg = (name, x) => { const f = (NAME_FIX[name] || {}).charts || {}; return x.schedule in f ? f[x.schedule] : x.multiple && !/^All listed suites$/i.test(x.schedule) ? x.schedule : ''; };
  const bldgOf = r => !r.p ? chartBldg(r.s.name, r.s) : (typeParts(r.p).bldg || chartBldg(r.s.name, r.p) || chartBldg(r.s.name, r.s));
  /* Each building on its own line: split lists at ";", ",", " / ", " and " and "&" (but not "Tanglewood I & II") */
  const bldgLines = b => BUILDING_LINES[b] || b.split(/;\s*|,\s*|\s+\/\s+|\s+and\s+|\s+&\s+(?![IVX]+\b|\d)/).map(x => x.trim()).filter(Boolean);

  /* Season and points for one week of a row. Week 53 follows its own chart where one prints it (WEEK53, Club Pass), or else follows week 52 (slashed overlay, not confirmed). */
  function weekInfo(row, w) {
    const weeks = (row.p && row.p.weeks) || row.s.weeks || [], pts = row.p ? row.p.weeklyPoints : null;
    if (w <= 52) return { season: CLS[weeks[w - 1]] ? weeks[w - 1] : null, points: pts ? pts[w - 1] : null };
    if (row.p && row.p.cpChart && row.p.weeks[52]) return { season: row.p.weeks[52], points: pts ? pts[52] : null, w53: 'chart' };
    const fixed = WEEK53[row.s.name];
    if (fixed) { const i = weeks.indexOf(fixed); return { season: fixed, points: pts && i >= 0 ? pts[i] : null, w53: 'chart' }; }
    return { season: CLS[weeks[51]] ? weeks[51] : null, points: pts ? pts[51] : null, w53: CLS[weeks[51]] ? 'assumed' : undefined };
  }
  /* Nightly points (Fri–Sat and Sun–Thur) for a row in a given week. Not in the data yet: returns null until it's added (#24, Phase 2). */
  /* Rows whose nightly points the directory does not print say "Not Published" instead of …. None today: Fairway Forest & Foxhunt (Sapphire Valley) print weekly points only, and since 10/18/26 (owner) they use the nightly points printed for Mountain Laurel, so people can compare. */
  const NOT_PUBLISHED = new Set(), NOT_PUBLISHED_TIP = 'The directory prints weekly points only for this room type';
  /* Resorts without a published points chart say so (owner, 2026-10-16); the tooltip says why. */
  const NO_CHART = 'No Points Chart Available', NO_CHART_WHY = { 'WorldMark Grand Palms': 'Club Wyndham’s online and printed points charts disagree' };
  /* Charts to link on a resort's card when its own points are left out (owner, 2026-10-18: WorldMark Grand Palms) */
  const CHART_LINKS = { 'WorldMark Grand Palms': [
    { label: 'Club Wyndham’s Online Points Chart (PDF)', url: 'https://clubwyndham.wyndhamdestinations.com/content/dam/wyndham/wyndham-vacation-clubs/resorts/grand-palms/club-pass-grand-palms-pc.pdf' },
    { label: 'WorldMark’s Credit Chart, 3 Seasons (PDF)', url: 'https://worldmark.wyndhamdestinations.com/content/dam/wyndham/wyndham-vacation-clubs/worldmark/credit-value-charts/2026-2027/wbw-grand-palms-pc-2027.pdf' }
  ] };
  const noChartTip = s => NO_CHART_WHY[s.name] || 'No points chart is published';
  const unpublished = r => !!(r.p && NOT_PUBLISHED.has(r.p.id));
  function nightly(row, w, weekend) {
    if (row.p && row.p.nightlyByWeek) { const x = row.p.nightlyByWeek[w - 1] || (w === 53 ? row.p.nightlyByWeek[51] : null); return x ? (weekend ? x[0] : x[1]) : null; }
    const n = row.p && row.p.nightly; if (!n) return null;
    const season = weekInfo(row, w).season; const band = season && n[season];
    return band ? (weekend ? band.friSat : band.sunThu) : null;
  }
  const short = n => n == null ? '—' : (n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)) + 'k';
  const compactWeeks = ws => { const out = []; let a = null, p = null; for (const w of ws.slice().sort((x, y) => x - y)) { if (a === null) { a = p = w; continue } if (w === p + 1) { p = w; continue } out.push(a === p ? a : a + '–' + p); a = p = w; } if (a !== null) out.push(a === p ? a : a + '–' + p); return 'Weeks ' + out.join(', '); };
  const NUM = new Intl.NumberFormat('en-US');
  const full = n => n == null ? 'points not printed' : NUM.format(n) + ' points';

  /* ---- State ---- */
  const typeSet = g => new Set(typesInGroup(g).map(c => c.id));
  const DEFAULTS = () => ({
    mode: 'week', idx: todayIdx >= 0 ? todayIdx : WEEKS.findIndex(x => x.y === startYear), span: 10, start: null, end: null,
    season: '', colorsOnly: false, types: typeSet('1 Bedroom'), lastGroup: '1 Bedroom',
    query: '', radius: 35, collections: new Set(collections.filter(c => !COLLECTION_OFF.includes(c))),
    cwaOnly: false, showAll: true, sort: { key: 'resort', dir: 1 }
  });
  /* Remember the reader's filters in this browser (localStorage), so a refresh or a later visit keeps them */
  const STORE = 'ytg-season-chart-v2';
  function saveState() { try { localStorage.setItem(STORE, JSON.stringify(state, (k, v) => v instanceof Set ? { set: [...v] } : v)); } catch (_) {} }
  function loadState() {
    try { const raw = localStorage.getItem(STORE); if (!raw) return null;
      const o = JSON.parse(raw, (k, v) => v && typeof v === 'object' && Array.isArray(v.set) ? new Set(v.set) : v), d = DEFAULTS();
      for (const k of Object.keys(d)) if (k in o && typeof o[k] === typeof d[k]) d[k] = o[k];
      if (o.colorsOnly === true) d.types = new Set(); // saved before "None" meant no room types
      for (const id of [...d.types]) for (const k of idsOfCategory.get(id) || []) d.types.add(k);
      for (const id of [...d.types]) if (!CLASSES.has(id)) d.types.delete(id); // a category that now only has named types // saved before each named type was its own choice
      if (!(d.idx >= 0 && d.idx < WEEKS.length)) d.idx = DEFAULTS().idx;
      return d; } catch (_) { return null; }
  }
  let state = loadState() || DEFAULTS();
  const groupsTicked = () => [...new Set([...state.types].map(groupOfType))].filter(Boolean).sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b));
  const relevantGroups = () => { const g = groupsTicked(); return g.length ? g : [state.lastGroup]; };
  const pointsOn = () => !state.colorsOnly;

  /* ---- Controls ---- */
  const presidentialIds = () => [...CLASSES.values()].filter(c => /presidential/i.test(c.label)).map(c => c.id);
  const allTypeIds = () => [...CLASSES.keys()];
  const sameSet = (set, ids) => set.size === ids.length && ids.every(id => set.has(id));
  function buildControls() {
    let html = '', y = null;
    WEEKS.forEach((x, i) => {
      if (x.y < startYear && i !== todayIdx) return;
      if (x.y !== y) { if (y !== null) html += '</optgroup>'; html += '<optgroup label="' + x.y + '">'; y = x.y; }
      html += '<option value="' + i + '">' + esc(weekLabel(x)) + (i === todayIdx ? ' (this week)' : '') + '</option>';
    });
    $('week').innerHTML = html + '</optgroup>';
    if (todayIdx >= 0) $('today').innerHTML = '<span class="t">Today:</span><span class="d">' + esc(fmt(todayUTC, LONG)) + '</span><span class="w">Week ' + WEEKS[todayIdx].w + '</span>';
    $('bedrooms').innerHTML = '<option value="">None (season colors only)</option>' + GROUPS.filter(g => typesInGroup(g).length).map(g => '<option value="' + g + '">' + groupLabel(g) + '</option>').join('') +
      (presidentialIds().length ? '<option value="presidential">Presidential</option>' : '') + '<option value="all">ALL</option>' +
      '<option value="mixed" disabled>Mixed sizes (see Room Types)</option>';
    $('typeTree').innerHTML = GROUPS.filter(g => typesInGroup(g).length).map(g => '<div class="tree-group"><label class="check"><input type="checkbox" data-group="' + g + '"> ' + groupLabel(g) + '</label><div class="checks">' +
      typesInGroup(g).map(c => '<label class="check"><input type="checkbox" value="' + c.id + '"> ' + esc(br(c.label)) + '</label>').join('') + '</div></div>').join('');
    $('radius').innerHTML = RADII.map(r => '<option value="' + r + '">' + r.toLocaleString('en-US') + ' miles</option>').join('');
    $('collectionChecks').innerHTML = collections.map(c => {
      const label = COLLECTION_LABEL[c] || c, dot = c === 'Affiliate' ? '<i class="dot aff"></i>' : c === 'Associate' ? '<i class="dot assoc"></i>' : '';
      const m = label.match(/^(\S+) \((.*)\)$/), name = c === 'Associate' && m ? esc(m[1]) + dot + '<span class="sub">' + esc(m[2]) + '</span>' : esc(label) + dot;
      const soon = c === 'Associate' || D.rows.some(s => s.collection === c && hasChart(s)) ? '' : '<span class="hint soon">No Points Chart Available</span>';
      return (c === COLLECTION_AFTER_SEPARATOR ? '<hr class="sep coll-sep">' : '') + '<label class="check"><input type="checkbox" value="' + esc(c) + '"><span class="lbl">' + name + soon + '</span></label>';
    }).join('');
    $('countryList').innerHTML = COUNTRIES.map(c => '<li><button type="button" class="link" data-country="' + esc(c[0]) + '">' + esc(c[0]) + '</button></li>').join('');

    $('spanButtons').innerHTML = SPANS.map(n => '<button type="button" data-span="' + n + '">' + (n < 0 ? 'All' : n === 0 ? 'Selected' : n) + '</button>').join('');
    const firstDay = iso(WEEKS.find(x => x.y === startYear).start), lastDay = iso(WEEKS[WEEKS.length - 1].start + 6 * DAY);
    for (const id of ['startDate', 'endDate']) { $(id).min = firstDay; $(id).max = lastDay; }
    const names = [...new Set(D.rows.map(s => officialName(s.name)))].sort(); // official names only; a short form would just repeat each one (owner, 2026-10-12)
    $('places').innerHTML = regions.concat(COUNTRIES.map(c => c[0])).filter((r, i, a) => a.indexOf(r) === i && r !== 'U.S. Virgin Islands').map(r => '<option value="' + esc(r) + '"></option>').join('') + names.map(n => '<option value="' + esc(n) + '"></option>').join('') + (GEO ? GEO.options() : '');
  }

  function syncControls() {
    for (const r of document.querySelectorAll('input[name=mode]')) r.checked = r.value === state.mode;
    $('weekBox').hidden = state.mode !== 'week'; $('dateBox').hidden = state.mode !== 'dates'; $('clearDates').hidden = state.mode !== 'dates';
    $('week').value = String(state.idx);
    $('seasonWeek').textContent = WEEKS[state.idx].w;
    state.colorsOnly = state.types.size === 0; // Bedrooms = None is the same as no room types ticked
    const ticked = groupsTicked();
    $('bedrooms').value = state.colorsOnly ? '' : sameSet(state.types, allTypeIds()) ? 'all' : sameSet(state.types, presidentialIds()) ? 'presidential' : ticked.length > 1 ? 'mixed' : (ticked[0] || state.lastGroup);
    for (const i of $('typeTree').querySelectorAll('input[value]')) i.checked = state.types.has(i.value);
    for (const i of $('typeTree').querySelectorAll('input[data-group]')) {
      const ids = typesInGroup(i.dataset.group).map(c => c.id), n = ids.filter(id => state.types.has(id)).length;
      i.checked = n === ids.length; i.indeterminate = n > 0 && n < ids.length;
    }
    const totalTypes = $('typeTree').querySelectorAll('input[value]').length;
    $('typeSummary').textContent = '(' + state.types.size + ' of ' + totalTypes + ')';
    if (document.activeElement !== $('search')) $('search').value = state.query;
    $('radius').value = String(state.radius);
    for (const i of $('collectionChecks').querySelectorAll('input')) i.checked = state.collections.has(i.value);
    $('cwaOnly').checked = state.cwaOnly;
    // Shown only when no box in the whole Collections section is selected; it sits below the section, so it stays visible when Collections is folded
    const ch = !state.collections.size && !state.cwaOnly ? 'No collections are selected, so all collections are shown.' : '';
    $('collectionHint').hidden = !ch; $('collectionHint').textContent = ch;
    for (const b of $('spanButtons').querySelectorAll('button')) b.setAttribute('aria-pressed', String(Number(b.dataset.span) === state.span));
    if (document.activeElement !== $('startDate')) $('startDate').value = state.start ? iso(state.start) : '';
    if (document.activeElement !== $('endDate')) $('endDate').value = state.end ? iso(state.end) : '';
  }

  /* ---- Which rows to show ---- */
  const needsGeo = () => !GEO && !geoFailed && !!state.query && !regionByName.get(norm(state.query)) && !countryOfQuery(state.query);
  function placeFilter() {
    const q = state.query;
    if (!q) return { test: () => true, hint: 'The search radius needs a city and state, such as Orlando, Florida.' };
    const country = countryOfQuery(q);
    if (country) return { test: s => s.country === country, region: true,
      hint: 'Showing resorts in ' + (COUNTRIES.find(c => c[1] === country) || [country])[0] + '. The radius works from a city, such as Orlando, Florida.' };
    const region = regionByName.get(norm(q));
    if (region) return { test: s => regionOf(s) === region, region: true,
      hint: 'Showing resorts in ' + region + '. The radius works from a city: to include nearby states, type a city, such as Phoenix, Arizona.' };
    const center = GEO ? GEO.resolve(q) : null;
    if (center) return { city: true, test: s => GEO.match({ resort_id: s.resort_id, name: s.name, city: s.city, state: s.state, country: s.country, schedule: s.schedule }, q, state.radius),
      hint: 'Within ' + state.radius.toLocaleString('en-US') + ' miles of ' + center.label + ', in a straight line.' };
    const words = norm(q).split(' ').filter(Boolean);
    return { test: s => { const t = norm([s.name, officialName(s.name), s.city, s.state, s.country, s.schedule].join(' ')); return words.every(w => t.includes(w)); },
      hint: 'Matching “' + q + '”. The search radius needs a city and state, such as Orlando, Florida.' };
  }

  function candidateRows(place) {
    const rows = [], groups = relevantGroups();
    for (const s of D.rows) {
      // Collections (2026-10-12): the resort types and the CWA Trust are boxes of one list, so a resort shows when ANY ticked box includes it
      // (before, CWA was a separate AND filter and a ticked CWA hid every non-CWA resort, whatever else was ticked). Nothing ticked = all.
      if (state.collections.size || state.cwaOnly) {
        const byType = state.collections.has(s.collection), byTrust = state.cwaOnly && refOf(s).club_wyndham_access === 'Yes';
        if (!byType && !byTrust) continue;
      }
      if (!place.test(s)) continue;
      if (!pointsOn()) { rows.push({ s, p: null, gap: hasChart(s) ? '' : 'chart' }); continue; }
      if (!hasChart(s)) { rows.push({ s, p: null, gap: 'chart' }); continue; }
      const all = pointsBySchedule.get(s.id) || [];
      // Show exact repeats (same room type, same points) once: the directory prints a suite again for each lockoff it is part of
      const seen = new Map(), ticked = [];
      for (const p of all.filter(p => state.types.has(typeId(p)))) {
        const row = { s, p, gap: '' }, key = bldgOf(row) + '|' + typeLabel(p) + '|' + JSON.stringify(p.weeklyPoints);
        if (seen.has(key)) continue;
        seen.set(key, row); ticked.push(row);
      }
      if (ticked.length) rows.push(...ticked);
      else rows.push({ s, p: null, gap: all.some(p => groups.includes(groupOfType(p.category))) ? 'pick' : 'size' });
    }
    return rows;
  }

  const seasonOfRow = (r, w) => r.gap ? null : weekInfo(r, w).season;

  function sortRows(rows, totals) {
    const d = state.sort.dir;
    const byResort = (a, b) => shortName(a.s.name).localeCompare(shortName(b.s.name)) || a.s.schedule.localeCompare(b.s.schedule) || bldgOf(a).localeCompare(bldgOf(b));
    // Smallest unit first (hotel room, studio, 1 BR, ...), then the chart's own order where NAME_FIX gives one (planning #38), then the room type order
    const sizeOrder = r => r.p ? GROUPS.indexOf(groupOfType(r.p.category)) : 99;
    const rankOf = r => (r.p && typeParts(r.p).rank) || 0;
    const typeOrder = r => r.p ? classOf.get(r.p.category).order : 9999;
    const costOrder = r => r.p ? lowest(r.p) : Infinity; // lowest weekly points of the row, so a smaller or cheaper room type comes first
    const byChart = (a, b) => a.s === b.s && rankOf(a) && rankOf(b) ? rankOf(a) - rankOf(b) : 0;
    const byType = (a, b) => sizeOrder(a) - sizeOrder(b) || byChart(a, b) || (costOrder(a) === costOrder(b) ? 0 : costOrder(a) < costOrder(b) ? -1 : 1) || (a.p && b.p ? typeLabel(a.p).localeCompare(typeLabel(b.p)) : 0) || typeOrder(a) - typeOrder(b);
    if (state.sort.key === 'type') return rows.sort((a, b) => d * byType(a, b) || byResort(a, b));
    if (state.sort.key === 'wkday' || state.sort.key === 'wkend') return rows.sort((a, b) => { const x = totals.get(a), y = totals.get(b); return (x == null) - (y == null) || d * ((x || 0) - (y || 0)) || byResort(a, b) || byType(a, b); });
    if (state.sort.key === 'total') return rows.sort((a, b) => { const x = totals.get(a), y = totals.get(b); return (x == null) - (y == null) || d * ((x || 0) - (y || 0)) || byResort(a, b); });
    return rows.sort((a, b) => d * byResort(a, b) || byType(a, b));
  }

  /* ---- Time: week mode or date mode ---- */
  function trip() {
    if (state.mode !== 'dates' || state.start == null || state.end == null) return null;
    const nights = Math.round((state.end - state.start) / DAY);
    if (nights === 0) return { pending: true };
    if (nights < 1 || nights + 1 > MAX_DAYS) return { bad: true, nights };
    return { a: state.start, b: state.end, nights, days: nights + 1 };
  }
  function columns(t) {
    const sel = WEEKS[state.idx];
    if (t && !t.bad && !t.pending) {
      const first = weekOf(t.a), last = weekOf(t.b - DAY);
      return WEEKS.slice(first, last + 1).map(c => {
        const nights = []; for (let d = Math.max(t.a, c.start); d < Math.min(t.b, c.start + 7 * DAY); d += DAY) nights.push(d);
        return Object.assign({ nights }, c);
      });
    }
    if (state.span < 0) return WEEKS.filter(x => x.y === sel.y);
    const a = Math.max(0, state.idx - state.span), b = Math.min(WEEKS.length - 1, state.idx + state.span);
    return WEEKS.slice(a, b + 1);
  }

  /* ---- Drawing, and the loading indicator (planning #36) ----
     render() is called after every change. Most redraws are quick and happen at once. One expected to take longer than
     ~150 ms (judged from the last redraw's time per cell) first dims the chart and shows "Updating the chart", then
     draws in the next frame. A place search that needs geo-data.js waits for it, dimmed, and never shows another result. */
  const status = $('chartStatus'), wrap = $('gridWrap'), Y = window.YTG;
  const bar = Y ? Y.progress(status) : null;
  let msPerCell = 0, drawQueued = false, hideStatus = null;
  const setLabel = text => { if (bar) bar.label(text); status.querySelector('[role=progressbar]').setAttribute('aria-label', text); };
  function busy(delay) {
    if (Y) Y.busy(wrap, true); else wrap.setAttribute('aria-busy', 'true');
    if (hideStatus || !status.dataset.ready) return; // already showing, or still the first load
    setLabel('Updating the chart'); if (bar) bar.wait();
    hideStatus = Y ? Y.showAfter(status, delay) : () => { status.hidden = true; };
    if (!delay) status.hidden = false; // a redraw known to be slow: show it in the same frame as the dimming
  }
  function idle() {
    if (Y) Y.busy(wrap, false); else wrap.setAttribute('aria-busy', 'false');
    if (hideStatus) { hideStatus(); hideStatus = null; }
    if (!status.dataset.ready) { status.dataset.ready = '1'; status.hidden = true; } // first load done
  }
  function render() {
    if (needsGeo()) { syncControls(); busy(150); loadGeo().then(render, render); return; }
    const m = model(), cells = m.rows.length * (m.cols.length + 2);
    if (drawQueued) return;
    if (!msPerCell || msPerCell * cells < 150) { draw(m); return; }
    syncControls(); busy(0); drawQueued = true;
    requestAnimationFrame(() => setTimeout(() => { drawQueued = false; if (needsGeo()) render(); else draw(model()); }));
  }
  function draw(m) {
    const t0 = performance.now();
    syncControls();
    saveState();
    const { wk, place, t, cand, bySeason, rows, cols, totals } = m;
    $('searchHint').textContent = place.hint;
    $('radius').disabled = !place.city;
    renderSeasonList(bySeason);

    // Count line and messages
    const groups = relevantGroups(), g1 = groups[0];
    const sz = groups.length > 1 ? 'the selected room types' : g1 === 'Studio' ? 'studios' : g1 === 'Hotel' ? 'hotel rooms' : br(g1) + ' units';
    const total = bySeason[''].size, have = new Set(cand.filter(r => !r.gap).map(r => resortKey(r.s))).size;
    const shown = new Set(rows.map(r => resortKey(r.s))).size;
    let count = !pointsOn() ? '<b>' + total + '</b> resorts' : '<b>' + have + ' / ' + total + '</b> resorts have ' + esc(sz);
    if (state.season) count += ' · showing <b>' + shown + '</b> ' + (state.season === 'none' ? NONE_LABEL : 'in ' + state.season) + ' in week ' + wk;
    else if (!state.showAll && pointsOn()) count += ' · showing those ' + have;
    $('count').innerHTML = rows.length ? count : 'No resorts match these filters';

    if (pointsOn() && state.types.size === 0) { $('typeAlert').hidden = false; $('typeAlert').innerHTML = '<strong>No room types are selected.</strong> Open “Room Types” in the filters and select at least one to see points.'; }
    else $('typeAlert').hidden = true;

    renderTripNote(t);
    // The new table is laid out in the next frame. Time that too (this runs before the frame's other work), then learn
    // the cost per cell for the next redraw.
    let js = 0; const cells = Math.max(1, rows.length * (cols.length + 2));
    requestAnimationFrame(() => { const t1 = performance.now(); void wrap.scrollWidth; msPerCell = (js + performance.now() - t1) / cells; });
    renderGrid(rows, cols, t, totals);
    js = performance.now() - t0;
    idle();
    scheduleMore(m, sz);
  }

  /* ---- "To see more resorts" (owner, 2026-10-12) ----
     Runs after the chart is drawn, never inside it. For each filter that may hide resorts, the same candidateRows()/season logic
     is run once with that one restriction relaxed; the difference in resorts is the chip's count. */
  let moreTimer = 0;
  const scheduleMore = (m, sz) => { clearTimeout(moreTimer); moreTimer = setTimeout(() => renderMore(m, sz)); };
  const keysOf = (cand, season, wk) => {
    const out = new Map();
    for (const r of cand) {
      if (!state.showAll && r.gap) continue;
      if (season === 'none' ? seasonOfRow(r, wk) : season && seasonOfRow(r, wk) !== season) continue;
      out.set(resortKey(r.s), r.s.collection);
    }
    return out;
  };
  const withState = (patch, fn) => { const old = {}; for (const k in patch) { old[k] = state[k]; state[k] = patch[k]; } try { return fn(); } finally { Object.assign(state, old); } };
  const extra = (relaxed, now) => { const x = []; for (const [k, c] of relaxed) if (!now.has(k)) x.push(c); return x; };
  const allCollectionsOn = () => !state.cwaOnly && !state.collections.size || collections.every(c => state.collections.has(c));
  const plural = n => n + ' resort' + (n === 1 ? '' : 's');
  function renderMore(m, sz) {
    const wk = m.wk, now = keysOf(m.cand, state.season, wk), chips = [];
    if (state.collections.size || state.cwaOnly) {
      const x = withState({ collections: new Set(), cwaOnly: false }, () => extra(keysOf(candidateRows(m.place), state.season, wk), now));
      if (x.length) chips.push({ act: 'collections', need: [...new Set(x)], n: x.length, text: 'in other collections', go: 'Add them' });
    }
    if (state.season) {
      const x = extra(keysOf(m.cand, '', wk), now);
      if (x.length) chips.push({ act: 'seasons', n: x.length, text: 'in other seasons this week', go: 'All seasons' });
    }
    if (pointsOn() && !state.showAll) {
      const x = withState({ types: new Set(allTypeIds()) }, () => extra(keysOf(candidateRows(m.place), state.season, wk), now));
      if (x.length) chips.push({ act: 'sizes', n: x.length, text: 'without ' + sz, go: 'Show all sizes' });
    }
    if (state.query) {
      const x = withState({ query: '' }, () => extra(keysOf(candidateRows(placeFilter()), state.season, wk), now));
      if (x.length) chips.push({ act: 'search', n: x.length, text: 'outside this search', go: 'Clear search' });
    }
    let h = '';
    const country = countryOfQuery(state.query);
    if (country) {
      const label = (COUNTRIES.find(c => c[1] === country) || [country])[0], noColl = allCollectionsOn(), noSeason = !state.season;
      h += '<p class="note">Showing ' + esc(label) + ' resorts. For the most resorts: <span class="more-line" style="display:inline-flex">'
        + '<button type="button" class="more-chip" data-act="allcoll"' + (noColl ? ' disabled' : '') + '>All collections</button>'
        + '<button type="button" class="more-chip" data-act="allseasons"' + (noSeason ? ' disabled' : '') + '>All seasons</button></span></p>';
    }
    h += chips.length
      ? '<p class="more-line"><span class="more-t">To see more resorts</span>' + chips.map(c => '<button type="button" class="more-chip" data-act="' + c.act + '"'
          + (c.need ? ' data-need="' + esc(c.need.join('|')) + '"' : '') + '><b>+' + plural(c.n) + '</b> ' + esc(c.text) + ' <span class="go">' + esc(c.go) + '</span></button>').join('') + '</p>'
      : '<p class="more-line more-ok">You’re seeing every resort that matches.</p>';
    const box = $('more'); if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
  }

  function model() {
    const wk = WEEKS[state.idx].w, place = placeFilter(), t = trip();
    const cand = candidateRows(place);
    const bySeason = { '': new Set(), none: new Set() }; SEASONS.concat(WM_SEASONS).forEach(x => bySeason[x] = new Set());
    const keysWithSeason = new Set();
    for (const r of cand) { const k = resortKey(r.s); bySeason[''].add(k); const x = seasonOfRow(r, wk); if (x) { bySeason[x].add(k); keysWithSeason.add(k); } }
    for (const k of bySeason['']) if (!keysWithSeason.has(k)) bySeason.none.add(k);

    let rows = cand;
    if (!state.showAll) rows = rows.filter(r => !r.gap);
    if (state.season === 'none') rows = rows.filter(r => !seasonOfRow(r, wk));
    else if (state.season) rows = rows.filter(r => seasonOfRow(r, wk) === state.season);

    const cols = columns(t);
    const totals = new Map();
    if (t && !t.bad && !t.pending && pointsOn()) for (const r of rows) {
      if (r.gap) continue; let sum = 0, ok = true;
      for (const c of cols) for (const d of c.nights) { const n = nightly(r, c.w, isWeekend(d)); if (n == null) ok = false; else sum += n; }
      totals.set(r, ok ? sum : null);
    }
    // Weekday and Weekend sort by the chosen week's nightly points; they only exist while those columns do
    const nightKey = state.sort.key === 'wkday' || state.sort.key === 'wkend';
    if (nightKey && (!pointsOn() || (t && !t.bad && !t.pending))) state.sort = { key: 'resort', dir: 1 };
    else if (nightKey) for (const r of rows) totals.set(r, r.gap ? null : nightly(r, wk, state.sort.key === 'wkend'));
    sortRows(rows, totals);

    return { wk, place, t, cand, bySeason, rows, cols, totals };
  }

  function renderSeasonList(bySeason) {
    const opts = [['', 'All seasons', 'all'], ...SEASONS.map(x => [x, x, CLS[x]]), ...WM_SEASONS.filter(x => bySeason[x].size).map(x => [x, x, CLS[x]]), ['none', NONE_LABEL, 'na']];
    $('seasonList').innerHTML = opts.map(([v, label, cls]) => '<button type="button" class="season-opt" data-season="' + v + '" aria-pressed="' + (state.season === v) + '">' +
      '<span class="sw ' + cls + '"></span><span>' + label + '</span><span class="n">' + bySeason[v].size + '</span></button>').join('');
  }

  function renderTripNote(t) {
    const note = $('tripNote'); note.className = 'trip-note'; note.removeAttribute('title'); $('dateAlert').hidden = true;
    if (state.mode !== 'dates') return;
    if (state.start == null) { note.textContent = ''; return; }
    if (!t || t.pending) { note.textContent = 'Choose an end date'; return; }
    if (t.bad) { note.classList.add('warn'); note.textContent = t.nights < 1 ? 'End date is before the start date' : (t.nights + 1) + ' days: choose up to ' + MAX_DAYS; return; }
    note.textContent = t.days + ' days, ' + t.nights + (t.nights === 1 ? ' night' : ' nights');
    if (t.nights === 1) { note.classList.add('warn'); note.title = 'One night can’t be booked. Shown for comparison only.'; }
  }

  function renderGrid(rows, cols, t, totals) {
    if (!rows.length) { $('grid').innerHTML = '<tbody><tr><td class="empty">No resorts match these filters. <button type="button" class="reset" id="emptyReset">Reset filters</button></td></tr></tbody>'; $('emptyReset').onclick = reset; $('week53Note').hidden = true; return; }
    const sel = WEEKS[state.idx], showType = pointsOn(), tripMode = t && !t.bad && !t.pending, groups = relevantGroups();
    const showBld = false; // buildings now sit in the resort cell, under the resort's name
    const arrow = key => state.sort.key === key ? (state.sort.dir > 0 ? '▲' : '▼') : '▲▼';
    const sortBtn = (key, label) => '<button type="button" class="sort" data-sort="' + key + '" aria-pressed="' + (state.sort.key === key) + '">' + label + ' <span class="arrow">' + arrow(key) + '</span></button>';
    let head = '<thead><tr><th class="res" scope="col"><div class="col-head">' + sortBtn('resort', 'Resort') +
      '</div></th>' +
      (showBld ? '<th class="bld" scope="col">Building</th>' : '') +
      (showType ? '<th class="typ" scope="col">' + sortBtn('type', 'Room type') + '</th>' : '');
    let prevYear = null;
    for (const c of cols) {
      const cls = 'wk' + (!tripMode && c === sel ? ' sel' : '') + (WEEKS.indexOf(c) === todayIdx || (c.start <= todayUTC && todayUTC < c.start + 7 * DAY) ? ' today' : '') + (tripMode ? ' part' : '');
      const sub = tripMode ? '<small>' + fmt(c.nights[0], MD) + '</small><small class="n">' + c.nights.length + (c.nights.length === 1 ? ' night' : ' nights') + '</small>'
        : '<small>' + fmt(c.start, MD) + '</small>';
      const inner = (c.y !== prevYear ? '<span class="yr">' + c.y + '</span>' : '') + '<b>' + c.w + '</b>' + sub;
      // By Week: the header is a button that selects this week (planning #44). By Dates: it stays plain text.
      head += state.mode === 'week' ? '<th class="' + cls + '" scope="col" title="' + esc(weekLabel(c)) + '"><button type="button" class="wk-btn" data-idx="' + WEEKS.indexOf(c) + '" title="Select week ' + c.w + '" aria-label="Select week ' + c.w + '">' + inner + '</button></th>'
        : '<th class="' + cls + '" scope="col" title="' + esc(weekLabel(c)) + '">' + inner + '</th>';
      prevYear = c.y;
    }
    if (tripMode && showType) head += '<th class="tot" scope="col">' + sortBtn('total', 'Total') + '</th>';
    if (!tripMode && showType) head += '<th class="nt wd" scope="col" aria-label="Weekday, week ' + sel.w + ', Sunday to Thursday nights" title="Points per night for the chosen week. Rows show … where the directory prints no single nightly rate.">' + sortBtn('wkday', 'Weekday') + '<small>Wk ' + sel.w + '</small><small>Sun–Thu</small></th><th class="nt we" scope="col" aria-label="Weekend, week ' + sel.w + ', Friday and Saturday nights" title="Points per night for the chosen week. Rows show … where the directory prints no single nightly rate.">' + sortBtn('wkend', 'Weekend') + '<small>Wk ' + sel.w + '</small><small>Fri–Sat</small></th>';
    head += '</tr></thead>';

    const view = { rows, cols, sel, showType, tripMode, tot: tripMode && showType, end: showType ? (tripMode ? 1 : 2) : 0 }; // end = columns after the week cells
    let body = '<tbody>', any53 = false;
    rows.forEach((r, i) => {
      const s = r.s, ref = refOf(s), gk = x => resortKey(x.s) + '|' + bldgOf(x), first = i === 0 || gk(rows[i - 1]) !== gk(r);
      let span = 1; if (first) while (i + span < rows.length && gk(rows[i + span]) === gk(r)) span++;
      body += '<tr' + (r.gap ? ' class="gray"' : '') + '>';
      if (first) {
        const vip = ref.vip_benefits === 'Yes' ? crownSvg('') : ref.vip_benefits === 'Conditional' ? crownSvg('half') : '';
        const dot = s.collection === 'Affiliate' ? '<i class="dot aff" title="Affiliate resort"></i>' : s.collection === 'Associate' ? '<i class="dot assoc" title="Associate resort"></i>' : '';
        const bldg = bldgOf(r) ? bldgLines(bldgOf(r)).map(b => '<span class="res-bldg">' + esc(b) + '</span>').join('') : ''; // one line per building
        const extra = !showType && r.gap === 'chart' ? '<span class="res-loc gap" title="' + esc(noChartTip(r.s)) + '">' + NO_CHART + '</span>' : '';
        body += '<th class="res" scope="row"' + (span > 1 ? ' rowspan="' + span + '"' : '') + '><button type="button" class="res-name" data-row="' + i + '">' + nameHtml(shortName(s.name), vip + dot) + '</button>' + (NOTICES[s.name] ? '<span class="notice" title="' + esc(NOTICE_TEXT) + '">⚠</span>' : '') +
          '<span class="res-loc">' + esc(s.location || [s.city, s.state].filter(Boolean).join(', ')) + '</span>' + bldg + extra + '</th>';
      }
      if (showBld) body += '<td class="bld">' + esc(bldgOf(r)) + '</td>';
      if (showType) body += r.gap === 'pick' ? '<td class="typ pick">Select a valid room type for this resort</td>'
        : r.gap === 'size' ? '<td class="typ gap">' + (groups.length === 1 ? esc(sizeWords(groups[0])) + ' ' + NONE_LABEL : 'These room types ' + NONE_LABEL) + '</td>'
        : r.gap === 'chart' ? '<td class="typ gap"><span title="' + esc(noChartTip(r.s)) + '">' + NO_CHART + '</span></td>' : '<td class="typ">' + typeHtml(r) + '</td>';
      for (const c of cols) {
        const x = cell(r, c, view, false);
        if (x.w53) any53 = true;
        body += '<td class="' + x.cls + '">' + x.text + '</td>';
      }
      if (tripMode && showType) { const v = totals.get(r); body += '<td class="tot">' + (r.gap ? '' : v == null ? '…' : short(v)) + '</td>'; }
      if (!tripMode && showType) for (const weekend of [false, true]) { const n = r.gap ? '' : nightly(r, sel.w, weekend); body += '<td class="nt ' + (weekend ? 'we' : 'wd') + '">' + (r.gap ? '' : n == null ? (unpublished(r) ? '<span class="np" style="display:inline-block;white-space:normal;font-size:.78em;line-height:1.1;text-align:center" title="' + NOT_PUBLISHED_TIP + '">Not Published</span>' : '…') : short(n)) + '</td>'; }
      body += '</tr>';
    });
    $('grid').innerHTML = head + body + '</tbody>';
    $('grid').classList.toggle('has-bld', showBld);
    $('grid').__rows = rows;
    $('grid').__view = view;
    hideTip(); focusCell = null;
    if (refocusWeek) { refocusWeek = false; const wb = $('grid').querySelector('thead .wk.sel .wk-btn'); if (wb) wb.focus({ preventScroll: true }); } // the redraw replaced the button that had focus
    const firstCell = $('grid').querySelector('tbody td.c.sel') || $('grid').querySelector('tbody td.c');
    if (firstCell) setFocusCell(firstCell);

    $('week53Note').hidden = !any53;
    if (any53) $('week53Note').innerHTML = '<strong>Week 53</strong> (slashed overlay) follows week 52 values and has not been confirmed. Confirm with Club Wyndham before you book. Paniolo Greens and Little Sweden print week 53 as Prime, so theirs have no overlay.';

    // Center the chosen week. Its position is read in the next frame, when the browser lays the new table out anyway,
    // instead of forcing a second layout right here (planning #36).
    cancelAnimationFrame(centerFrame);
    centerFrame = requestAnimationFrame(() => {
      const th = $('grid').querySelector('thead .wk.sel');
      if (th) { const wrap = $('gridWrap'), fixed = [...$('grid').querySelectorAll('thead .res, thead .bld, thead .typ')].reduce((n, c) => n + c.offsetWidth, 0);
        wrap.scrollLeft = Math.max(0, th.offsetLeft - fixed - (wrap.clientWidth - fixed - th.offsetWidth) / 2); }
    });
  }
  let centerFrame = 0, refocusWeek = false;

  /* One week cell: its classes, its text, and (only when asked, for the tooltip) its description */
  function cell(r, c, v, withTip) {
    const info = r.gap ? { season: null, points: null } : weekInfo(r, c.w);
    const cls = 'c ' + (info.season ? CLS[info.season] : 'na') + (info.w53 === 'assumed' ? ' w53' : '') + (!v.tripMode && c === v.sel ? ' sel' : '');
    let text, tip;
    if (r.gap) { text = ''; tip = NONE_LABEL; }
    else if (!v.showType) { text = info.season ? LETTER[info.season] || info.season[0] : '–'; tip = info.season || NONE_LABEL; }
    else if (v.tripMode) {
      let sum = 0, ok = true; for (const d of c.nights) { const n = nightly(r, c.w, isWeekend(d)); if (n == null) ok = false; else sum += n; }
      text = ok ? short(sum) : unpublished(r) ? 'Not Published' : '…'; if (withTip) tip = (info.season || NONE_LABEL) + ' · ' + c.nights.length + ' night(s) · ' + (ok ? full(sum) : unpublished(r) ? NOT_PUBLISHED_TIP : 'nightly points not available yet');
    } else { text = short(info.points); if (withTip) tip = (info.season || NONE_LABEL) + ' · ' + full(info.points); }
    if (withTip && info.w53 === 'assumed') tip += ' · Week 53 follows week 52 values and has not been confirmed.';
    return { cls, text, w53: info.w53 === 'assumed', tip: withTip ? weekLabel(c) + ' · ' + tip : '' };
  }

  /* ---- One shared tooltip for the week cells (planning #36), instead of a title on each of thousands of cells:
     hover on a computer, tap on a phone, and the keyboard (Tab reaches the chosen week's first cell, then the arrow keys,
     Home and End move). The focused cell is described by the tooltip, so screen readers read the same text. ---- */
  const tip = $('cellTip');
  let tipCell = null, tipTimer = 0, focusCell = null;
  const cellAt = td => { // the row and column a week cell stands for
    const v = $('grid').__view, tr = td.parentNode; if (!v || !tr || !td.classList.contains('c')) return null;
    const first = tr.cells.length - v.cols.length - v.end, r = v.rows[tr.sectionRowIndex], c = v.cols[td.cellIndex - first];
    return r && c ? { r, c, v } : null;
  };
  const tipText = td => { const a = cellAt(td); return a ? cell(a.r, a.c, a.v, true).tip : ''; };
  $('grid').__tipText = tipText;
  function showTip(td) {
    clearTimeout(tipTimer);
    const text = tipText(td); if (!text) { hideTip(); return; }
    tipCell = td; tip.textContent = text; tip.hidden = false;
    const b = td.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth;
    tip.style.left = Math.max(8, Math.min(vw - w - 8, b.left + b.width / 2 - w / 2)) + 'px';
    tip.style.top = (b.top - h - 6 >= 8 ? b.top - h - 6 : b.bottom + 6) + 'px';
  }
  function hideTip() { clearTimeout(tipTimer); tipCell = null; tip.hidden = true; }
  function setFocusCell(td) {
    if (focusCell && focusCell !== td) { focusCell.removeAttribute('tabindex'); focusCell.removeAttribute('aria-describedby'); }
    focusCell = td; if (td) td.tabIndex = 0;
  }
  function wireTip() {
    const g = $('grid'), canHover = window.matchMedia('(hover: hover)').matches;
    g.addEventListener('mouseover', e => { if (!canHover) return; const td = e.target.closest('td.c');
      if (!td) { clearTimeout(tipTimer); if (tipCell && tipCell !== document.activeElement) hideTip(); return; }
      if (td !== tipCell) { clearTimeout(tipTimer); tipTimer = setTimeout(() => showTip(td), tipCell ? 0 : 250); } });
    g.addEventListener('mouseleave', () => { clearTimeout(tipTimer); if (tipCell && tipCell !== document.activeElement) hideTip(); });
    // A tap shows the cell's tooltip; a second tap on the same cell hides it (focus, which comes first, doesn't count)
    let shownBefore = null;
    g.addEventListener('pointerdown', e => { shownBefore = tipCell; });
    g.addEventListener('click', e => { const td = e.target.closest('td.c'); if (td) { if (td === shownBefore && !canHover) hideTip(); else showTip(td); } shownBefore = null; });
    document.addEventListener('click', e => { if (tipCell && !e.target.closest('#grid td.c')) hideTip(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && tipCell) hideTip(); });
    $('gridWrap').addEventListener('scroll', () => { if (tipCell) { if (tipCell === document.activeElement) showTip(tipCell); else hideTip(); } }, { passive: true });
    window.addEventListener('scroll', () => { if (tipCell) hideTip(); }, { passive: true });
    g.addEventListener('focusin', e => { const td = e.target.closest('td.c'); if (!td) return; setFocusCell(td); td.setAttribute('aria-describedby', 'cellTip'); showTip(td); });
    g.addEventListener('focusout', e => { const td = e.target.closest('td.c'); if (td) { td.removeAttribute('aria-describedby'); if (tipCell === td) hideTip(); } });
    g.addEventListener('keydown', e => {
      const td = e.target.closest('td.c'); if (!td) return;
      const tr = td.parentNode, cs = [...tr.querySelectorAll('td.c')], i = cs.indexOf(td);
      let next;
      if (e.key === 'ArrowLeft') next = cs[i - 1]; else if (e.key === 'ArrowRight') next = cs[i + 1];
      else if (e.key === 'Home') next = cs[0]; else if (e.key === 'End') next = cs[cs.length - 1];
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { const row = e.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling; if (row) next = row.querySelectorAll('td.c')[i]; }
      else return;
      e.preventDefault(); if (next) { setFocusCell(next); next.focus(); }
    });
  }

  /* Booking limits printed under or beside a resort's points chart in the Club Wyndham Member's Directory 2026/2027 (owner, 2026-10-17). Keyed by resort name (one card per row of the chart, so a resort with several charts shows the same lines on each). Printed page numbers in the comments. */
  const ACCESS_LIMITED = 'Only a limited amount of this resort’s inventory is part of Club Wyndham Access, so getting a reservation here during the 13 to 10 month Advance Reservation Priority window is limited and should not be anticipated.';
  const SAPPHIRE_7 = [
    { text: 'Fairway Forest and Foxhunt: a 7-night minimum stay is required in all seasons. Full week stays require check-in and check-out on Friday or Saturday.' }, /* p. 132 */
    { text: 'The directory prints weekly points only for Fairway Forest and Foxhunt. Their Fri-Sat and Sun-Thur nightly points shown on the chart are Mountain Laurel’s printed nightly points (p. 133), so the room types can be compared. They cannot be booked by the night.' }
  ];
  const BOOKING_LIMITS = {
    'Club Wyndham Harbortown Point': [{ text: 'This resort requires full week stays with a Sunday check-in.' }], /* p. 41 */
    'Club Wyndham Resort at Fairfield Mountains': [{ text: 'Some associations require a 7-night stay in all seasons.' }], /* p. 130 */
    'Club Wyndham Fairfield Harbour': [{ text: 'Some associations require a 7-night stay in all seasons.' }], /* p. 131 */
    'Club Wyndham Resort at Fairfield Sapphire Valley': SAPPHIRE_7, /* p. 132, Fairway Forest & Foxhunt chart */
    'Foxhunt at Sapphire Valley': [SAPPHIRE_7[0]], /* p. 132 */
    'Club Wyndham Emerald Grande™ at Destin': [{ text: 'The Advance Reservation Priority window is available for stays between February and December. Reservation requests are not available for stays in January.' }], /* p. 60 */
    'Club Wyndham Oceanside Pier Resort': [{ text: 'The Advance Reservation Priority window is available for stays between Labor Day and May 31. From May 31 to Labor Day, reservations may be requested during the Standard Reservation Window.' }], /* p. 34 */
    'Club Wyndham Smugglers’ Notch Vermont®': [{ text: 'The Advance Reservation Priority window currently has limited availability for the month of July. Reservations are currently not available for stays between December 16 and December 31.' }], /* p. 178 */
    'Club Wyndham Canterbury': [{ text: ACCESS_LIMITED }], /* p. 37 */
    'Club Wyndham Royal Vista': [{ text: ACCESS_LIMITED }], /* p. 66 */
    'Club Wyndham Ocean Boulevard': [{ text: ACCESS_LIMITED }], /* p. 151 */
    'Club Wyndham SeaWatch Resort': [{ text: ACCESS_LIMITED }] /* p. 155 */
  };
  /* The resort card's title goes on two rows: the collection name (Club Wyndham, WorldMark, Margaritaville Vacation Club by Wyndham) on the first, the resort on the second, so long names don't wrap at an odd place on a phone. Names like "Club Wyndham at Majestic Sun" stay on one row, because "at Majestic Sun" alone reads oddly. */
  const titleHtml = name => { const m = name.match(/^(Club Wyndham|WorldMark|Margaritaville Vacation Club by Wyndham)(?: - | )(?!at )(.+)$/);
    return m ? '<span class="brand">' + esc(m[1]) + '</span><span class="rname">' + esc(m[2]) + '</span>' : esc(name); };

  /* ---- Resort details ---- */
  /* Resort card (owner, 2026-10-17): full address and phone at the top, the directory's printed page only (the search bar
     page stays in the link and in the code comments), and no points tables: the directory page and Club Wyndham's own chart
     already have them. */
  function openDetail(row) {
    const s = row.s, ref = refOf(s), ps = pointsBySchedule.get(s.id) || [];
    $('detailTitle').innerHTML = titleHtml(officialName(s.name));
    const addr = String(ref.address || s.location || [s.city, s.state, s.country].filter(Boolean).join(', ')).split(/\n/).map(esc).join('<br>');
    const phone = s.phone || ref.phone;
    let h = '<p class="addr">' + addr + '</p><dl>';
    if (phone) h += '<dt>Phone</dt><dd><a href="tel:' + esc(String(phone).replace(/[^0-9+]/g, '')) + '">' + esc(phone) + '</a></dd>';
    if (s.multiple) h += '<dt>Chart</dt><dd>' + esc(s.schedule) + '</dd>';
    h += '<dt>Collection</dt><dd>' + esc(COLLECTION_LABEL[s.collection] || s.collection) + '</dd>';
    if (ref.vip_benefits) h += '<dt>VIP Benefits</dt><dd>' + esc(ref.vip_benefits === 'Conditional' ? (ref.program_notes || 'In some cases') : ref.vip_benefits) + '</dd>';
    if (ref.club_wyndham_access === 'Yes') h += '<dt>CWA</dt><dd>Yes</dd>';
    const pages = [...new Set([].concat(s.pages || [], ...ps.map(p => p.pages || [])))].sort((a, b) => a - b);
    if (pages.length) h += '<dt>Directory Pg</dt><dd>' + pages.map(cite).join(', ') + '</dd>';
    if (s.cp) h += '<dt>Points Chart</dt><dd><a href="' + esc(s.cp.pdf) + '" target="_blank" rel="noopener">Club Wyndham’s Chart (PDF)</a>' + (s.cp.pdfExtra || []).map(u => '<br><a href="' + esc(u.url) + '" target="_blank" rel="noopener">' + esc(u.label) + '</a>').join('') + '</dd>';
    h += '</dl>';
    if (s.cp) { const src = s.cp.notes.filter(n => /^Source:/.test(n)).map(n => esc(n.replace(/\s*\(CW search bar page \d+\)/g, ''))); if (src.length) h += '<p class="hint">' + src.join('<br>') + '</p>'; }
    if (!s.cp && !ps.length) h += '<p><strong>' + NO_CHART + '.</strong> ' + esc(noChartTip(s)) + '.</p>';
    const links = CHART_LINKS[s.name] || [];
    if (links.length) h += '<h3>Points Charts</h3><ul class="limits">' + links.map(l => '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + '</a></li>').join('') + '<li>Printed chart: 2023-2024 Directory, Page 264</li></ul>';
    if (NOTICES[s.name]) h += '<p class="alert">⚠ ' + esc(NOTICE_TEXT) + ' Club Wyndham explains it in <a href="https://clubwyndham.wyndhamdestinations.com/us/en/resorts/resort-news/2025/your-resort-portfolio-refresh" target="_blank" rel="noopener">Your Resort Portfolio Is Getting A Refresh</a>. Court updates: <a href="' + NOTICES[s.name].url + '" target="_blank" rel="noopener">' + esc(NOTICES[s.name].site) + '</a>.</p>';
    const lim = BOOKING_LIMITS[s.name] || [];
    if (lim.length) h += '<h3>Booking Limits</h3><ul class="limits">' + lim.map(l => '<li>' + esc(l.text) + '</li>').join('') + '</ul>';
    if (s.note) h += '<p class="hint">' + esc(s.note) + '</p>';
    if (WEEK53[s.name]) h += '<p class="hint">This resort’s chart lists week 53 as ' + WEEK53[s.name] + '.</p>';
    $('detailBody').innerHTML = h;
    $('detail').showModal();
  }

  /* "Reset" next to the Filters heading (owner, 2026-10-12): Club Wyndham + Affiliate, All seasons, search cleared, Bedrooms = 1 BR. Week and dates stay. */
  function reset() { const d = DEFAULTS();
    Object.assign(state, { collections: new Set(RESET_COLLECTIONS.filter(c => collections.includes(c))), cwaOnly: false, season: '', query: '', types: d.types, lastGroup: d.lastGroup, colorsOnly: false });
    $('search').value = ''; render(); }
  const parseDate = v => v ? Date.parse(v + 'T00:00:00Z') : null;

  /* ---- Events ---- */
  function wire() {
    for (const r of document.querySelectorAll('input[name=mode]')) r.addEventListener('change', e => {
      state.mode = e.target.value; if (state.mode === 'week') { state.start = state.end = null; if (state.sort.key === 'total') state.sort = { key: 'resort', dir: 1 }; } render();
    });
    $('week').addEventListener('change', e => { state.idx = Number(e.target.value); render(); });
    $('seasonList').addEventListener('click', e => { const b = e.target.closest('.season-opt'); if (b) { state.season = state.season === b.dataset.season ? '' : b.dataset.season; render(); } });
    $('bedrooms').addEventListener('change', e => {
      const g = e.target.value;
      if (g === 'all') state.types = new Set(allTypeIds());
      else if (g === 'presidential') state.types = new Set(presidentialIds());
      else if (!g) state.types = new Set();
      else { state.lastGroup = g; state.types = typeSet(g); }
      if (!state.types.size && state.sort.key !== 'resort') state.sort = { key: 'resort', dir: 1 };
      render();
    });
    $('typeTree').addEventListener('change', e => {
      const i = e.target;
      if (i.dataset.group) { for (const id of typeSet(i.dataset.group)) i.checked ? state.types.add(id) : state.types.delete(id); }
      else i.checked ? state.types.add(i.value) : state.types.delete(i.value);
      const g = groupsTicked(); if (g.length === 1) state.lastGroup = g[0];
      if (!state.types.size && state.sort.key !== 'resort') state.sort = { key: 'resort', dir: 1 };
      render();
    });
    $('search').addEventListener('focus', loadGeo);
    let t; $('search').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value.trim(); render(); }, 250); });
    $('radius').addEventListener('change', e => { state.radius = Number(e.target.value); render(); });
    $('collectionChecks').addEventListener('change', e => { e.target.checked ? state.collections.add(e.target.value) : state.collections.delete(e.target.value); render(); });
    $('cwaOnly').addEventListener('change', e => { state.cwaOnly = e.target.checked; render(); });
    // Select All turns on every Collections box except CWA; Clear turns them all off, CWA included (owner, 2026-10-13)
    $('collAll').addEventListener('click', () => { state.collections = new Set(collections); render(); });
    $('collClear').addEventListener('click', () => { state.collections = new Set(); state.cwaOnly = false; render(); });
    $('spanButtons').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.span = Number(b.dataset.span); render(); } });
    const openPicker = e => { try { e.target.showPicker(); } catch (_) {} };
    $('startDate').addEventListener('click', openPicker);
    $('endDate').addEventListener('click', openPicker);
    $('startDate').addEventListener('focus', () => { if (!$('startDate').value) $('startDate').value = iso(todayUTC); });
    $('startDate').addEventListener('change', () => {
      state.start = parseDate($('startDate').value);
      if (state.start == null) { state.end = null; render(); return; }
      if (state.end == null || state.end <= state.start) state.end = state.start; // the end date starts at the start date, like clubwyndham.com
      const i = weekOf(state.start); if (i >= 0) state.idx = i;
      $('endDate').min = iso(state.start + DAY); $('endDate').max = iso(state.start + (MAX_DAYS - 1) * DAY);
      render();
    });
    $('endDate').addEventListener('change', () => { state.end = parseDate($('endDate').value); render(); });
    $('clearDates').addEventListener('click', () => { state.start = state.end = null; if (state.sort.key === 'total') state.sort = { key: 'resort', dir: 1 }; render(); });
    $('reset').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); reset(); });
    $('clearSearch').addEventListener('click', () => { state.query = ''; $('search').value = ''; clearTimeout(t); render(); $('search').focus(); });
    /* Countries info: opens only on click, tap, Enter or Space (never on hover); choosing a country fills the search */
    const tipWrap = $('countryTipWrap'), tipBtn = $('countryTipBtn'), tip = $('countryTip');
    const showTip = on => { tip.hidden = !on; tipBtn.setAttribute('aria-expanded', String(on)); };
    tipBtn.addEventListener('click', () => showTip(tip.hidden));
    tipWrap.addEventListener('focusout', e => { if (!tipWrap.contains(e.relatedTarget)) showTip(false); });
    tipWrap.addEventListener('keydown', e => { if (e.key === 'Escape') { showTip(false); tipBtn.focus(); } });
    document.addEventListener('click', e => { if (!tipWrap.contains(e.target)) showTip(false); });
    tip.addEventListener('click', e => { const b = e.target.closest('[data-country]'); if (!b) return; state.query = b.dataset.country; $('search').value = state.query;
      // Choosing a country also selects the collections its resorts need (never removes any), so results show
      const c = countryOfQuery(state.query); if (c && (state.collections.size || state.cwaOnly)) for (const s of D.rows) if (s.country === c) state.collections.add(s.collection);
      showTip(false); render(); });
    /* "To see more resorts" chips act like the user changing the filter */
    $('more').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      const a = b.dataset.act;
      if (a === 'collections') for (const c of b.dataset.need.split('|')) state.collections.add(c);
      else if (a === 'allcoll') { for (const c of collections) state.collections.add(c); }
      else if (a === 'seasons' || a === 'allseasons') state.season = '';
      else if (a === 'sizes') { state.types = new Set(allTypeIds()); }
      else if (a === 'search') { state.query = ''; $('search').value = ''; clearTimeout(t); }
      $('more').focus(); render();
    });
    $('grid').addEventListener('click', e => {
      const sb = e.target.closest('.sort');
      if (sb) { const k = sb.dataset.sort; state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: 1 }; render(); return; }
      const wb = e.target.closest('.wk-btn');
      if (wb) { state.idx = Number(wb.dataset.idx); refocusWeek = true; render(); return; }
      const b = e.target.closest('.res-name'); if (b) openDetail($('grid').__rows[Number(b.dataset.row)]);
    });
    $('grid').addEventListener('change', e => { if (e.target.id === 'showAll') { state.showAll = e.target.checked; render(); } });
    $('closeDetail').addEventListener('click', () => $('detail').close());
    $('detail').addEventListener('click', e => { if (e.target === $('detail')) $('detail').close(); });
  }

  buildControls();
  wire();
  wireTip();
  render();
})();
