'use strict';
/* 52-week season chart, version 2 (#24). Reads the same data files as seasons.html (data.js, points-data.js, reference-data.js, geo-data.js, geo.js). */
(() => {
  const D = window.DIRECTORY, P = window.WEEKLY_POINTS, GEO = window.ResortGeo, REF = (window.REFERENCE && window.REFERENCE.resorts) || [];
  const $ = id => document.getElementById(id);

  /* Official directory: the 2026/2027 edition, where CW search bar page = book page + 4 */
  const DIRECTORY_URL = 'https://media.travelandleisure.com/WD/email/2025/0625-2025/cw-directory/index.html';
  const PAGE_OFFSET = 4;
  const cite = n => '<a href="' + DIRECTORY_URL + '#p=' + n + '" target="_blank" rel="noopener">Page ' + (n - PAGE_OFFSET) + ' (CW search bar page ' + n + ')</a>';

  const SEASONS = ['Prime', 'High', 'Value', 'Quiet'];
  const CLS = { Prime: 's-p', High: 's-h', Value: 's-v', Quiet: 's-q' };
  const NONE_LABEL = 'Not Offered';
  /* Charts that print week 53 themselves (2026/2027): Page 91 (CW search bar page 95) and Page 184 (CW search bar page 188).
     Every other resort's week 53 is gray, priced like week 1, until Club Wyndham confirms. */
  const WEEK53 = { 'Club Wyndham Paniolo Greens': 'Prime', 'Little Sweden': 'Prime' };
  const COLLECTION_LABEL = { 'Club Pass': 'WorldMark (Club Pass $99)', 'Associate': 'Associate (Australia & New Zealand)' };
  const COLLECTION_ORDER = ['Club Wyndham', 'Margaritaville Vacation Club', 'Club Pass', 'Affiliate', 'Associate'];
  const COLLECTION_OFF = ['Club Pass', 'Associate'];
  const PLACES = [['us', 'United States'], ['ca', 'Canada'], ['mx', 'Mexico'], ['isl', 'Puerto Rico, U.S. Virgin Islands & Fiji']];
  const PLACE_OFF = ['mx', 'isl'];
  const placeOf = s => ({ 'United States': 'us', 'Canada': 'ca', 'Mexico': 'mx', 'Puerto Rico': 'isl', 'U.S. Virgin Islands': 'isl', 'Fiji': 'isl' })[s.country] || 'other';
  const GROUPS = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom', '5 Bedroom', 'Hotel'];
  const SPANS = [5, 10, 15, 0]; // weeks before and after the chosen week; 0 = the whole year
  const RADII = [10, 25, 35, 50, 75, 100, 150, 200, 250, 350, 500, 750, 1000];
  const MAX_DAYS = 14;

  const br = s => String(s || '').replace(/\bBedroom\b/g, 'BR');
  const groupLabel = g => g === 'Hotel' ? 'Hotel room' : br(g);
  const sizeWords = g => g === 'Hotel' ? 'Hotel rooms' : g === 'Studio' ? 'Studios' : br(g) + ' units';
  const shortName = s => s.replace(/^Club Wyndham /, '').replace(/^Margaritaville Vacation Club - /, 'Margaritaville · ');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const crownSvg = cls => '<svg class="crown' + (cls ? ' ' + cls : '') + '" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 10 2 3l4 3 2-5 2 5 4-3 1 7z"/></svg>';

  /* ---- RCI calendar: week 1 starts on the first Friday of January; week 53 exists when Dec 31 is a Friday ---- */
  const DAY = 864e5;
  const firstFriday = y => { const d = new Date(Date.UTC(y, 0, 1)).getUTCDay(); return Date.UTC(y, 0, 1 + ((5 - d + 7) % 7)); };
  const weeksIn = y => new Date(Date.UTC(y, 11, 31)).getUTCDay() === 5 ? 53 : 52;
  const fmt = (t, o) => new Date(t).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, o));
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const now = new Date(), todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startYear = now.getFullYear();
  const WEEKS = [];
  for (let y = startYear - 1; y <= startYear + 3; y++) for (let w = 1; w <= weeksIn(y); w++) WEEKS.push({ y, w, start: firstFriday(y) + (w - 1) * 7 * DAY });
  const weekOf = t => WEEKS.findIndex(x => x.start <= t && t < x.start + 7 * DAY);
  const todayIdx = weekOf(todayUTC);
  const weekLabel = x => {
    const end = x.start + 7 * DAY, sameYear = new Date(end).getUTCFullYear() === x.y;
    return 'Week ' + x.w + ' · ' + fmt(x.start, { month: 'short', day: 'numeric' }) + (sameYear ? '' : ', ' + x.y) +
      ' – ' + fmt(end, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const isWeekend = t => { const d = new Date(t).getUTCDay(); return d === 5 || d === 6; }; // Friday and Saturday nights

  /* ---- Data ---- */
  const classOf = new Map(P.classifications.map((c, i) => [c.id, Object.assign({ order: i }, c)]));
  const pointsBySchedule = new Map();
  for (const p of P.rows) { if (!pointsBySchedule.has(p.scheduleId)) pointsBySchedule.set(p.scheduleId, []); pointsBySchedule.get(p.scheduleId).push(p); }
  const refByName = new Map(REF.map(r => [r.name, r])), refById = new Map(REF.filter(r => r.resort_id).map(r => [r.resort_id, r]));
  const refOf = s => refByName.get(s.name) || refById.get(s.resort_id) || {};
  const hasChart = s => (s.weeks || []).some(x => CLS[x]);
  const resortKey = s => s.resort_id || s.name;
  const typesInGroup = g => P.classifications.filter(c => c.group === g && P.rows.some(p => p.category === c.id));
  const groupOfType = id => (classOf.get(id) || {}).group;
  const collections = [...new Set(D.rows.map(s => s.collection))].sort((a, b) => (COLLECTION_ORDER.indexOf(a) + 99) % 99 - (COLLECTION_ORDER.indexOf(b) + 99) % 99 || a.localeCompare(b));
  const regionOf = s => s.country === 'United States' ? s.state : s.country;
  const regions = [...new Set(D.rows.map(regionOf).filter(Boolean))].sort();
  const regionByName = new Map(regions.map(r => [norm(r), r]));
  const typeLabel = p => br(p.roomType || (classOf.get(p.category) || {}).label);
  const cwaCount = new Set(D.rows.filter(s => refOf(s).club_wyndham_access === 'Yes').map(resortKey)).size;

  /* Season and points for one week of a row. Week 53 follows WEEK53, or else is gray and priced like week 1. */
  function weekInfo(row, w) {
    const weeks = (row.p && row.p.weeks) || row.s.weeks || [], pts = row.p ? row.p.weeklyPoints : null;
    if (w <= 52) return { season: CLS[weeks[w - 1]] ? weeks[w - 1] : null, points: pts ? pts[w - 1] : null };
    const fixed = WEEK53[row.s.name];
    if (fixed) { const i = weeks.indexOf(fixed); return { season: fixed, points: pts && i >= 0 ? pts[i] : null, w53: 'chart' }; }
    return { season: null, points: pts ? pts[0] : null, w53: 'assumed' };
  }
  /* Nightly points (Fri–Sat and Sun–Thur) for a row in a given week. Not in the data yet: returns null until it's added (#24, Phase 2). */
  function nightly(row, w, weekend) {
    const n = row.p && row.p.nightly; if (!n) return null;
    const season = weekInfo(row, w).season; const band = season && n[season];
    return band ? (weekend ? band.friSat : band.sunThu) : null;
  }
  const short = n => n == null ? '—' : (n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)) + 'k';
  const full = n => n == null ? 'points not printed' : n.toLocaleString('en-US') + ' points';

  /* ---- State ---- */
  const typeSet = g => new Set(typesInGroup(g).map(c => c.id));
  const DEFAULTS = () => ({
    mode: 'week', idx: todayIdx >= 0 ? todayIdx : WEEKS.findIndex(x => x.y === startYear), span: 10, start: null, end: null,
    season: '', colorsOnly: false, types: typeSet('1 Bedroom'), lastGroup: '1 Bedroom',
    query: '', radius: 35, collections: new Set(collections.filter(c => !COLLECTION_OFF.includes(c))), places: new Set(PLACES.map(p => p[0]).filter(p => !PLACE_OFF.includes(p))),
    cwaOnly: false, includeMissing: false, showAll: true, sort: { key: 'resort', dir: 1 }
  });
  let state = DEFAULTS();
  const groupsTicked = () => [...new Set([...state.types].map(groupOfType))].filter(Boolean).sort((a, b) => GROUPS.indexOf(a) - GROUPS.indexOf(b));
  const relevantGroups = () => { const g = groupsTicked(); return g.length ? g : [state.lastGroup]; };
  const pointsOn = () => !state.colorsOnly;

  /* ---- Controls ---- */
  function buildControls() {
    let html = '', y = null;
    WEEKS.forEach((x, i) => {
      if (x.y < startYear && i !== todayIdx) return;
      if (x.y !== y) { if (y !== null) html += '</optgroup>'; html += '<optgroup label="' + x.y + '">'; y = x.y; }
      html += '<option value="' + i + '">' + esc(weekLabel(x)) + (i === todayIdx ? ' (this week)' : '') + '</option>';
    });
    $('week').innerHTML = html + '</optgroup>';
    if (todayIdx >= 0) $('today').innerHTML = '<span class="d">' + esc(fmt(todayUTC, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })) + '</span><span class="w">Week ' + WEEKS[todayIdx].w + '</span>';
    $('bedrooms').innerHTML = '<option value="">None (season colors only)</option>' + GROUPS.filter(g => typesInGroup(g).length).map(g => '<option value="' + g + '">' + groupLabel(g) + '</option>').join('') +
      '<option value="mixed" disabled>Mixed sizes (see Room types)</option>';
    $('typeTree').innerHTML = GROUPS.filter(g => typesInGroup(g).length).map(g => '<div class="tree-group"><label class="check"><input type="checkbox" data-group="' + g + '"> ' + groupLabel(g) + '</label><div class="checks">' +
      typesInGroup(g).map(c => '<label class="check"><input type="checkbox" value="' + c.id + '"> ' + esc(br(c.label)) + '</label>').join('') + '</div></div>').join('');
    $('radius').innerHTML = RADII.map(r => '<option value="' + r + '">' + r.toLocaleString('en-US') + ' miles</option>').join('');
    $('collectionChecks').innerHTML = collections.map(c => '<label class="check"><input type="checkbox" value="' + esc(c) + '"> ' + esc(COLLECTION_LABEL[c] || c) +
      (c === 'Affiliate' ? '<i class="dot aff"></i>' : c === 'Associate' ? '<i class="dot assoc"></i>' : '') +
      (D.rows.some(s => s.collection === c && hasChart(s)) ? '' : ' <span class="hint">(no charts yet)</span>') + '</label>').join('');
    $('placeChecks').innerHTML = PLACES.map(([v, label]) => '<label class="check"><input type="checkbox" value="' + v + '"> ' + esc(label) + '</label>').join('');
    $('cwaCount').textContent = '(' + cwaCount + ')';
    $('spanButtons').innerHTML = SPANS.map(n => '<button type="button" data-span="' + n + '">' + (n ? n : 'All') + '</button>').join('');
    const firstDay = iso(WEEKS.find(x => x.y === startYear).start), lastDay = iso(WEEKS[WEEKS.length - 1].start + 6 * DAY);
    for (const id of ['startDate', 'endDate']) { $(id).min = firstDay; $(id).max = lastDay; }
    const names = [...new Set(D.rows.map(s => shortName(s.name)).concat(D.rows.map(s => s.name)))].sort();
    $('places').innerHTML = regions.map(r => '<option value="' + esc(r) + '"></option>').join('') + names.map(n => '<option value="' + esc(n) + '"></option>').join('') + (GEO ? GEO.options() : '');
  }

  function syncControls() {
    for (const r of document.querySelectorAll('input[name=mode]')) r.checked = r.value === state.mode;
    $('weekBox').hidden = state.mode !== 'week'; $('dateBox').hidden = state.mode !== 'dates';
    $('week').value = String(state.idx);
    $('seasonWeek').textContent = WEEKS[state.idx].w;
    const ticked = groupsTicked();
    $('bedrooms').value = state.colorsOnly ? '' : ticked.length > 1 ? 'mixed' : (ticked[0] || state.lastGroup);
    $('typeBox').hidden = state.colorsOnly;
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
    for (const i of $('placeChecks').querySelectorAll('input')) i.checked = state.places.has(i.value);
    $('cwaOnly').checked = state.cwaOnly; $('includeMissing').checked = state.includeMissing;
    const allOn = state.collections.size === collections.length && state.places.size === PLACES.length;
    $('collectionSummary').textContent = allOn ? '(all)' : '(' + state.collections.size + ' of ' + collections.length + ')';
    for (const b of $('spanButtons').querySelectorAll('button')) b.setAttribute('aria-pressed', String(Number(b.dataset.span) === state.span));
    if (document.activeElement !== $('startDate')) $('startDate').value = state.start ? iso(state.start) : '';
    if (document.activeElement !== $('endDate')) $('endDate').value = state.end ? iso(state.end) : '';
  }

  /* ---- Which rows to show ---- */
  function placeFilter() {
    const q = state.query;
    if (!q) return { test: () => true, hint: 'The radius applies when you pick a city from the list.' };
    const region = regionByName.get(norm(q));
    if (region) return { test: s => regionOf(s) === region, hint: 'Resorts in ' + region + '.' };
    const center = GEO ? GEO.resolve(q) : null;
    if (center) return { test: s => GEO.match({ resort_id: s.resort_id, name: s.name, city: s.city, state: s.state, country: s.country, schedule: s.schedule }, q, state.radius),
      hint: 'Within ' + state.radius.toLocaleString('en-US') + ' miles of ' + center.label + ', in a straight line.' };
    const words = norm(q).split(' ').filter(Boolean);
    return { test: s => { const t = norm([s.name, s.city, s.state, s.country, s.schedule].join(' ')); return words.every(w => t.includes(w)); },
      hint: 'Matching “' + q + '”. The radius applies when you pick a city from the list.' };
  }

  function candidateRows(place) {
    const rows = [], groups = relevantGroups();
    for (const s of D.rows) {
      if (!hasChart(s) && !state.includeMissing) continue;
      if (!state.collections.has(s.collection) || !place.test(s)) continue;
      const pl = placeOf(s); if (pl !== 'other' && !state.places.has(pl)) continue;
      if (state.cwaOnly && refOf(s).club_wyndham_access !== 'Yes') continue;
      if (!pointsOn()) { rows.push({ s, p: null, gap: hasChart(s) ? '' : 'chart' }); continue; }
      if (!hasChart(s)) { rows.push({ s, p: null, gap: 'chart' }); continue; }
      const all = pointsBySchedule.get(s.id) || [];
      const ticked = all.filter(p => state.types.has(p.category));
      if (ticked.length) for (const p of ticked) rows.push({ s, p, gap: '' });
      else rows.push({ s, p: null, gap: all.some(p => groups.includes(groupOfType(p.category))) ? 'pick' : 'size' });
    }
    return rows;
  }

  const seasonOfRow = (r, w) => r.gap ? null : weekInfo(r, w).season;

  function sortRows(rows, totals) {
    const d = state.sort.dir;
    const byResort = (a, b) => shortName(a.s.name).localeCompare(shortName(b.s.name)) || a.s.schedule.localeCompare(b.s.schedule);
    const typeOrder = r => r.p ? classOf.get(r.p.category).order : 9999;
    const byType = (a, b) => typeOrder(a) - typeOrder(b) || (a.p && b.p ? typeLabel(a.p).localeCompare(typeLabel(b.p)) : 0);
    if (state.sort.key === 'type') return rows.sort((a, b) => d * byType(a, b) || byResort(a, b));
    if (state.sort.key === 'total') return rows.sort((a, b) => { const x = totals.get(a), y = totals.get(b); return (x == null) - (y == null) || d * ((x || 0) - (y || 0)) || byResort(a, b); });
    return rows.sort((a, b) => d * byResort(a, b) || byType(a, b));
  }

  /* ---- Time: week mode or date mode ---- */
  function trip() {
    if (state.mode !== 'dates' || state.start == null || state.end == null) return null;
    const nights = Math.round((state.end - state.start) / DAY);
    if (nights < 1 || nights + 1 > MAX_DAYS) return { bad: true, nights };
    return { a: state.start, b: state.end, nights, days: nights + 1 };
  }
  function columns(t) {
    const sel = WEEKS[state.idx];
    if (t && !t.bad) {
      const first = weekOf(t.a), last = weekOf(t.b - DAY);
      return WEEKS.slice(first, last + 1).map(c => {
        const nights = []; for (let d = Math.max(t.a, c.start); d < Math.min(t.b, c.start + 7 * DAY); d += DAY) nights.push(d);
        return Object.assign({ nights }, c);
      });
    }
    if (!state.span) return WEEKS.filter(x => x.y === sel.y);
    const a = Math.max(0, state.idx - state.span), b = Math.min(WEEKS.length - 1, state.idx + state.span);
    return WEEKS.slice(a, b + 1);
  }

  function render() {
    syncControls();
    const wk = WEEKS[state.idx].w, place = placeFilter(), t = trip();
    $('searchHint').textContent = place.hint;

    const cand = candidateRows(place);
    const bySeason = { '': new Set(), none: new Set() }; SEASONS.forEach(x => bySeason[x] = new Set());
    const keysWithSeason = new Set();
    for (const r of cand) { const k = resortKey(r.s); bySeason[''].add(k); const x = seasonOfRow(r, wk); if (x) { bySeason[x].add(k); keysWithSeason.add(k); } }
    for (const k of bySeason['']) if (!keysWithSeason.has(k)) bySeason.none.add(k);
    renderSeasonList(bySeason);

    let rows = cand;
    if (!state.showAll) rows = rows.filter(r => !r.gap);
    if (state.season === 'none') rows = rows.filter(r => !seasonOfRow(r, wk));
    else if (state.season) rows = rows.filter(r => seasonOfRow(r, wk) === state.season);

    const cols = columns(t);
    const totals = new Map();
    if (t && !t.bad && pointsOn()) for (const r of rows) {
      if (r.gap) continue; let sum = 0, ok = true;
      for (const c of cols) for (const d of c.nights) { const n = nightly(r, c.w, isWeekend(d)); if (n == null) ok = false; else sum += n; }
      totals.set(r, ok ? sum : null);
    }
    sortRows(rows, totals);

    // Count line and messages
    const groups = relevantGroups(), g1 = groups[0];
    const sizesOr = groups.map(g => g === 'Studio' ? 'studios' : g === 'Hotel' ? 'hotel rooms' : br(g)).join(' or ') + (groups.some(g => /Bedroom/.test(g)) ? ' units' : '');
    const sz = groups.length > 1 ? 'the ticked room types' : g1 === 'Studio' ? 'studios' : g1 === 'Hotel' ? 'hotel rooms' : br(g1) + ' units';
    const total = bySeason[''].size, have = new Set(cand.filter(r => !r.gap).map(r => resortKey(r.s))).size;
    const shown = new Set(rows.map(r => resortKey(r.s))).size;
    let count = !pointsOn() ? '<b>' + total + '</b> resorts' : '<b>' + have + ' / ' + total + '</b> resorts have ' + esc(sz);
    if (state.season) count += ' · showing <b>' + shown + '</b> ' + (state.season === 'none' ? NONE_LABEL : 'in ' + state.season) + ' in week ' + wk;
    else if (!state.showAll && pointsOn()) count += ' · showing those ' + have;
    $('count').innerHTML = rows.length ? count : 'No resorts match these filters';

    const picks = new Set(cand.filter(r => r.gap === 'pick').map(r => resortKey(r.s))).size;
    if (pointsOn() && state.types.size === 0) { $('typeAlert').hidden = false; $('typeAlert').innerHTML = '<strong>No room types are selected.</strong> Open “Room types” in the filters and tick at least one to see points.'; }
    else if (pointsOn() && picks) { $('typeAlert').hidden = false; $('typeAlert').innerHTML = '<strong>' + picks + (picks === 1 ? ' resort has ' : ' resorts have ') + esc(sizesOr) + ', but not of the room types you ticked.</strong> They say “Select a room type”.'; }
    else $('typeAlert').hidden = true;

    renderTripNote(t);
    renderGrid(rows, cols, t, totals);
  }

  function renderSeasonList(bySeason) {
    const opts = [['', 'All seasons', 'all'], ...SEASONS.map(x => [x, x, CLS[x]]), ['none', NONE_LABEL, 'na']];
    $('seasonList').innerHTML = opts.map(([v, label, cls]) => '<button type="button" class="season-opt" data-season="' + v + '" aria-pressed="' + (state.season === v) + '">' +
      '<span class="sw ' + cls + '"></span><span>' + label + '</span><span class="n">' + bySeason[v].size + '</span></button>').join('');
  }

  function renderTripNote(t) {
    const note = $('tripNote'); note.className = 'trip-note'; $('dateAlert').hidden = true;
    if (state.mode !== 'dates') return;
    if (state.start == null || state.end == null) { note.innerHTML = 'Choose a start date and an end date.<small>Up to ' + MAX_DAYS + ' days. The shortest stay you can book is 3 days, 2 nights.</small>'; return; }
    if (t.bad) {
      note.classList.add('warn');
      note.textContent = t.nights < 1 ? 'The end date must be after the start date.' : 'That’s ' + (t.nights + 1) + ' days. Choose up to ' + MAX_DAYS + ' days.';
      return;
    }
    const range = fmt(t.a, { weekday: 'short', month: 'short', day: 'numeric' }) + ' to ' + fmt(t.b, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const wkend = Array.from({ length: t.nights }, (_, i) => t.a + i * DAY).filter(isWeekend).length;
    note.innerHTML = t.days + ' days, ' + t.nights + (t.nights === 1 ? ' night' : ' nights') + '<small>' + range + ' · ' + wkend + ' weekend (Fri–Sat) and ' + (t.nights - wkend) + ' weeknight (Sun–Thur)</small>';
    if (t.nights === 1) { note.classList.add('warn'); note.innerHTML += '<small style="color:#b3261e">One night can’t be booked; shown for comparison only.</small>'; }
    $('dateAlert').hidden = false;
    $('dateAlert').innerHTML = '<strong>Trip totals are almost here.</strong> They need each resort’s separate weekend and weeknight points, which are being added from the directory. For now the chart shows which weeks your nights fall in.';
  }

  function renderGrid(rows, cols, t, totals) {
    if (!rows.length) { $('grid').innerHTML = '<tbody><tr><td class="empty">No resorts match these filters. <button type="button" class="reset" id="emptyReset">Reset filters</button></td></tr></tbody>'; $('emptyReset').onclick = reset; $('week53Note').hidden = true; return; }
    const sel = WEEKS[state.idx], showType = pointsOn(), tripMode = t && !t.bad, groups = relevantGroups();
    const arrow = key => state.sort.key === key ? (state.sort.dir > 0 ? '▲' : '▼') : '▲▼';
    const sortBtn = (key, label) => '<button type="button" class="sort" data-sort="' + key + '" aria-pressed="' + (state.sort.key === key) + '">' + label + ' <span class="arrow">' + arrow(key) + '</span></button>';
    let head = '<thead><tr><th class="res" scope="col"><div class="col-head">' + sortBtn('resort', 'Resort') +
      (showType ? '<label class="show-all"><input type="checkbox" id="showAll"' + (state.showAll ? ' checked' : '') + '> Show all resorts</label>' : '') + '</div></th>' +
      (showType ? '<th class="typ" scope="col">' + sortBtn('type', 'Room type') + '</th>' : '');
    let prevYear = null;
    for (const c of cols) {
      const cls = 'wk' + (!tripMode && c === sel ? ' sel' : '') + (WEEKS.indexOf(c) === todayIdx || (c.start <= todayUTC && todayUTC < c.start + 7 * DAY) ? ' today' : '') + (tripMode ? ' part' : '');
      const sub = tripMode ? '<small>' + fmt(c.nights[0], { month: 'short', day: 'numeric' }) + '</small><small class="n">' + c.nights.length + (c.nights.length === 1 ? ' night' : ' nights') + '</small>'
        : '<small>' + fmt(c.start, { month: 'short', day: 'numeric' }) + '</small>';
      head += '<th class="' + cls + '" scope="col" title="' + esc(weekLabel(c)) + '">' + (c.y !== prevYear ? '<span class="yr">' + c.y + '</span>' : '') + '<b>' + c.w + '</b>' + sub + '</th>';
      prevYear = c.y;
    }
    if (tripMode && showType) head += '<th class="tot" scope="col">' + sortBtn('total', 'Total') + '</th>';
    head += '</tr></thead>';

    let body = '<tbody>', any53 = false;
    rows.forEach((r, i) => {
      const s = r.s, ref = refOf(s), first = i === 0 || rows[i - 1].s !== s;
      let span = 1; if (first) while (i + span < rows.length && rows[i + span].s === s) span++;
      body += '<tr' + (r.gap ? ' class="gray"' : '') + '>';
      if (first) {
        const vip = ref.vip_benefits === 'Yes' ? crownSvg('') : ref.vip_benefits === 'Conditional' ? crownSvg('half') : '';
        const dot = s.collection === 'Affiliate' ? '<i class="dot aff" title="Affiliate resort"></i>' : s.collection === 'Associate' ? '<i class="dot assoc" title="Associate resort"></i>' : '';
        const bldg = s.multiple ? '<span class="res-bldg">' + esc(s.schedule) + '</span>' : '';
        const extra = !showType && r.gap === 'chart' ? '<span class="res-loc gap">No points chart</span>' : '';
        body += '<th class="res" scope="row"' + (span > 1 ? ' rowspan="' + span + '"' : '') + '><button type="button" class="res-name" data-row="' + i + '">' + esc(shortName(s.name)) + '</button>' + vip + dot +
          '<span class="res-loc">' + esc(s.location || [s.city, s.state].filter(Boolean).join(', ')) + '</span>' + bldg + extra + '</th>';
      }
      if (showType) body += r.gap === 'pick' ? '<td class="typ pick">Select a room type</td>'
        : r.gap === 'size' ? '<td class="typ gap">' + (groups.length === 1 ? esc(sizeWords(groups[0])) + ' ' + NONE_LABEL : 'These room types ' + NONE_LABEL) + '</td>'
        : r.gap === 'chart' ? '<td class="typ gap">No points chart</td>' : '<td class="typ">' + esc(typeLabel(r.p)) + '</td>';
      for (const c of cols) {
        const info = r.gap ? { season: null, points: null } : weekInfo(r, c.w);
        if (info.w53 === 'assumed') any53 = true;
        const cls = 'c ' + (info.season ? CLS[info.season] : 'na') + (info.w53 === 'assumed' ? ' w53' : '') + (!tripMode && c === sel ? ' sel' : '');
        let text, tip;
        if (r.gap) { text = ''; tip = NONE_LABEL; }
        else if (!showType) { text = info.season ? info.season[0] : '–'; tip = info.season || NONE_LABEL; }
        else if (tripMode) {
          let sum = 0, ok = true; for (const d of c.nights) { const n = nightly(r, c.w, isWeekend(d)); if (n == null) ok = false; else sum += n; }
          text = ok ? short(sum) : '…'; tip = (info.season || NONE_LABEL) + ' · ' + c.nights.length + ' night(s) · ' + (ok ? full(sum) : 'nightly points coming soon');
        } else { text = short(info.points); tip = (info.season || NONE_LABEL) + ' · ' + full(info.points); }
        if (info.w53 === 'assumed') tip += ' · Week 53 isn’t in this resort’s chart; shown at week 1 points. Confirm with Club Wyndham.';
        body += '<td class="' + cls + '" title="' + esc(weekLabel(c) + ' · ' + tip) + '">' + text + '</td>';
      }
      if (tripMode && showType) { const v = totals.get(r); body += '<td class="tot">' + (r.gap ? '' : v == null ? '…' : short(v)) + '</td>'; }
      body += '</tr>';
    });
    $('grid').innerHTML = head + body + '</tbody>';
    $('grid').__rows = rows;

    $('week53Note').hidden = !any53;
    if (any53) $('week53Note').innerHTML = '<strong>Week 53</strong> (striped gray) isn’t listed in most resorts’ charts. It’s shown at week 1 points as a guide only; confirm with Club Wyndham before you book. Paniolo Greens and Little Sweden print week 53 as Prime, so theirs are colored.';

    const th = $('grid').querySelector('thead .wk.sel');
    if (th) { const wrap = $('gridWrap'), fixed = $('grid').querySelector('thead .res').offsetWidth + (showType ? $('grid').querySelector('thead .typ').offsetWidth : 0);
      wrap.scrollLeft = Math.max(0, th.offsetLeft - fixed - (wrap.clientWidth - fixed - th.offsetWidth) / 2); }
  }

  /* ---- Resort details ---- */
  function openDetail(row) {
    const s = row.s, ref = refOf(s), ps = pointsBySchedule.get(s.id) || [];
    $('detailTitle').textContent = s.name;
    let h = '<dl><dt>Location</dt><dd>' + esc(s.location || [s.city, s.state, s.country].filter(Boolean).join(', ')) + '</dd>';
    if (s.multiple) h += '<dt>Chart</dt><dd>' + esc(s.schedule) + '</dd>';
    h += '<dt>Collection</dt><dd>' + esc(COLLECTION_LABEL[s.collection] || s.collection) + '</dd>';
    if (ref.vip_benefits) h += '<dt>VIP benefits</dt><dd>' + esc(ref.vip_benefits === 'Conditional' ? (ref.program_notes || 'In some cases') : ref.vip_benefits) + '</dd>';
    if (ref.club_wyndham_access === 'Yes') h += '<dt>Club Wyndham Access</dt><dd>Yes</dd>';
    if (s.phone) h += '<dt>Phone</dt><dd>' + esc(s.phone) + '</dd>';
    const pages = [...new Set([].concat(s.pages || [], ...ps.map(p => p.pages || [])))].sort((a, b) => a - b);
    if (pages.length) h += '<dt>Directory</dt><dd>' + pages.map(cite).join('<br>') + '</dd>';
    h += '</dl>';
    if (ps.length) {
      const sorted = ps.slice().sort((a, b) => classOf.get(a.category).order - classOf.get(b.category).order);
      h += '<h3>Points for a full week, by season</h3><table class="pts"><thead><tr><th>Room type</th>' + SEASONS.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>';
      for (const p of sorted) {
        const by = {}; for (const b of p.bands || []) by[b.season] = b.points;
        h += '<tr><td>' + esc(typeLabel(p)) + '</td>' + SEASONS.map(x => '<td>' + (by[x] != null ? by[x].toLocaleString('en-US') : '—') + '</td>').join('') + '</tr>';
      }
      h += '</tbody></table>';
      const notes = [...new Set(ps.map(p => p.note).concat(ps.map(p => p.derivedNote)).filter(Boolean))];
      if (notes.length) h += '<p class="hint">' + notes.map(esc).join(' ') + '</p>';
    } else h += '<p>The Club Wyndham directory has no points chart for this resort.' + (s.collection === 'Club Pass' ? ' WorldMark (Club Pass) points charts are on clubwyndham.com and are being added here.' : '') + '</p>';
    if (s.note) h += '<p class="hint">' + esc(s.note) + '</p>';
    if (WEEK53[s.name]) h += '<p class="hint">This resort’s chart lists week 53 as ' + WEEK53[s.name] + '.</p>';
    $('detailBody').innerHTML = h;
    $('detail').showModal();
  }

  function reset() { state = DEFAULTS(); render(); }
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
      if (!g) { state.colorsOnly = true; if (state.sort.key !== 'resort') state.sort = { key: 'resort', dir: 1 }; }
      else { state.colorsOnly = false; state.lastGroup = g; state.types = typeSet(g); }
      render();
    });
    $('typeTree').addEventListener('change', e => {
      const i = e.target;
      if (i.dataset.group) { for (const id of typeSet(i.dataset.group)) i.checked ? state.types.add(id) : state.types.delete(id); }
      else i.checked ? state.types.add(i.value) : state.types.delete(i.value);
      const g = groupsTicked(); if (g.length === 1) state.lastGroup = g[0];
      render();
    });
    $('typeBox').addEventListener('click', e => { const b = e.target.closest('[data-types]'); if (!b) return;
      state.types = b.dataset.types === 'all' ? new Set($('typeTree').querySelectorAll('input[value]').length ? [...$('typeTree').querySelectorAll('input[value]')].map(x => x.value) : []) : new Set(); render(); });
    let t; $('search').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value.trim(); render(); }, 250); });
    $('radius').addEventListener('change', e => { state.radius = Number(e.target.value); render(); });
    $('collectionChecks').addEventListener('change', e => { e.target.checked ? state.collections.add(e.target.value) : state.collections.delete(e.target.value); render(); });
    $('placeChecks').addEventListener('change', e => { e.target.checked ? state.places.add(e.target.value) : state.places.delete(e.target.value); render(); });
    $('collectionBox').addEventListener('click', e => { const b = e.target.closest('[data-coll]'); if (!b) return;
      if (b.dataset.coll === 'all') { state.collections = new Set(collections); state.places = new Set(PLACES.map(p => p[0])); } else { state.collections = new Set(); state.places = new Set(); }
      render(); });
    $('cwaOnly').addEventListener('change', e => { state.cwaOnly = e.target.checked; render(); });
    $('includeMissing').addEventListener('change', e => { state.includeMissing = e.target.checked; render(); });
    $('spanButtons').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.span = Number(b.dataset.span); render(); } });
    const dateChange = () => {
      state.start = parseDate($('startDate').value); state.end = parseDate($('endDate').value);
      if (state.start != null && state.end == null) state.end = state.start + 7 * DAY; // a sensible first guess: one week
      if (state.start != null) { const i = weekOf(state.start); if (i >= 0) state.idx = i; }
      render();
    };
    $('startDate').addEventListener('change', dateChange);
    $('endDate').addEventListener('change', dateChange);
    $('clearDates').addEventListener('click', () => { state.start = state.end = null; if (state.sort.key === 'total') state.sort = { key: 'resort', dir: 1 }; render(); });
    $('reset').addEventListener('click', reset);
    $('grid').addEventListener('click', e => {
      const sb = e.target.closest('.sort');
      if (sb) { const k = sb.dataset.sort; state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: 1 }; render(); return; }
      const b = e.target.closest('.res-name'); if (b) openDetail($('grid').__rows[Number(b.dataset.row)]);
    });
    $('grid').addEventListener('change', e => { if (e.target.id === 'showAll') { state.showAll = e.target.checked; render(); } });
    $('closeDetail').addEventListener('click', () => $('detail').close());
    $('detail').addEventListener('click', e => { if (e.target === $('detail')) $('detail').close(); });
    if (window.matchMedia('(max-width: 820px)').matches) $('filterBox').open = false;
  }

  buildControls();
  wire();
  render();
})();
