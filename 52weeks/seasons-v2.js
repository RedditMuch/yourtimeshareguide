'use strict';
/* 52-week season chart, version 2 (#24). Reads the same data files as seasons.html (data.js, points-data.js, geo-data.js, geo.js). */
(() => {
  const D = window.DIRECTORY, P = window.WEEKLY_POINTS, GEO = window.ResortGeo;
  const $ = id => document.getElementById(id);

  /* Official directory: the 2026/2027 edition, where CW search bar page = book page + 4 */
  const DIRECTORY_URL = 'https://media.travelandleisure.com/WD/email/2025/0625-2025/cw-directory/index.html';
  const PAGE_OFFSET = 4;
  const cite = n => '<a href="' + DIRECTORY_URL + '#p=' + n + '" target="_blank" rel="noopener">Page ' + (n - PAGE_OFFSET) + ' (CW search bar page ' + n + ')</a>';

  const SEASONS = ['Prime', 'High', 'Value', 'Quiet'];
  const CLS = { Prime: 's-p', High: 's-h', Value: 's-v', Quiet: 's-q' };
  const NONE_LABEL = 'Not offered';
  /* Charts that print week 53 themselves (2026/2027): Page 91 (CW search bar page 95) and Page 184 (CW search bar page 188).
     Every other resort's week 53 is gray, priced like week 1, until Club Wyndham confirms. */
  const WEEK53 = { 'Club Wyndham Paniolo Greens': 'Prime', 'Little Sweden': 'Prime' };
  const COLLECTION_LABEL = { 'Club Pass': 'WorldMark (Club Pass)' };
  const GROUPS = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom', '5 Bedroom', 'Hotel'];
  const SPANS = [11, 21, 31, 0]; // 0 = all weeks of the selected week's year
  const RADII = [10, 25, 35, 50, 75, 100, 150, 200, 250, 350, 500, 750, 1000];

  const br = s => String(s || '').replace(/\bBedroom\b/g, 'BR');
  const groupLabel = g => g === 'Hotel' ? 'Hotel room' : br(g);
  const sizeWords = g => g === 'Hotel' ? 'hotel rooms' : g === 'Studio' ? 'studios' : br(g) + ' units';
  const shortName = s => s.replace(/^Club Wyndham /, '').replace(/^Margaritaville Vacation Club - /, 'Margaritaville · ');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  /* ---- RCI calendar: week 1 starts on the first Friday of January; week 53 exists when Dec 31 is a Friday ---- */
  const DAY = 864e5;
  const firstFriday = y => { const d = new Date(Date.UTC(y, 0, 1)).getUTCDay(); return Date.UTC(y, 0, 1 + ((5 - d + 7) % 7)); };
  const weeksIn = y => new Date(Date.UTC(y, 11, 31)).getUTCDay() === 5 ? 53 : 52;
  const fmt = (t, o) => new Date(t).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, o));
  const now = new Date(), todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startYear = now.getFullYear();
  const WEEKS = [];
  for (let y = startYear - 1; y <= startYear + 3; y++) for (let w = 1; w <= weeksIn(y); w++) WEEKS.push({ y, w, start: firstFriday(y) + (w - 1) * 7 * DAY });
  const weekOf = t => WEEKS.findIndex(x => x.start <= t && t < x.start + 7 * DAY);
  const todayIdx = weekOf(todayUTC);
  const weekLabel = x => {
    const end = x.start + 7 * DAY, sameYear = new Date(end).getUTCFullYear() === x.y;
    return 'Week ' + x.w + ' · ' + fmt(x.start, { weekday: 'short', month: 'short', day: 'numeric' }) + (sameYear ? '' : ', ' + x.y) +
      ' – ' + fmt(end, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ---- Data ---- */
  const classOf = new Map(P.classifications.map((c, i) => [c.id, Object.assign({ order: i }, c)]));
  const pointsBySchedule = new Map();
  for (const p of P.rows) { if (!pointsBySchedule.has(p.scheduleId)) pointsBySchedule.set(p.scheduleId, []); pointsBySchedule.get(p.scheduleId).push(p); }
  const hasChart = s => (s.weeks || []).some(x => CLS[x]);
  const resortKey = s => s.resort_id || s.name;
  const typesInGroup = g => P.classifications.filter(c => c.group === g && P.rows.some(p => p.category === c.id));
  const collections = [...new Set(D.rows.map(s => s.collection))].sort((a, b) => a === 'Club Wyndham' ? -1 : b === 'Club Wyndham' ? 1 : a.localeCompare(b));
  const regionOf = s => s.country === 'United States' ? s.state : s.country;
  const regions = [...new Set(D.rows.map(regionOf).filter(Boolean))].sort();
  const regionByName = new Map(regions.map(r => [norm(r), r]));
  const typeLabel = p => br(p.roomType || (classOf.get(p.category) || {}).label);

  /* Season and points for one week of a row. Week 53 follows WEEK53, or else is gray and priced like week 1. */
  function weekInfo(row, w) {
    const weeks = (row.p && row.p.weeks) || row.s.weeks || [], pts = row.p ? row.p.weeklyPoints : null;
    if (w <= 52) return { season: CLS[weeks[w - 1]] ? weeks[w - 1] : null, points: pts ? pts[w - 1] : null };
    const fixed = WEEK53[row.s.name];
    if (fixed) { const i = weeks.indexOf(fixed); return { season: fixed, points: pts && i >= 0 ? pts[i] : null, w53: 'chart' }; }
    return { season: null, points: pts ? pts[0] : null, w53: 'assumed' };
  }
  const short = n => n == null ? '—' : (n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)) + 'k';
  const full = n => n == null ? 'points not printed' : n.toLocaleString('en-US') + ' points';

  /* ---- State ---- */
  const allTypes = g => new Set(typesInGroup(g).map(c => c.id));
  const DEFAULTS = () => ({
    idx: todayIdx >= 0 ? todayIdx : WEEKS.findIndex(x => x.y === startYear), season: '', group: '1 Bedroom', types: allTypes('1 Bedroom'),
    query: '', radius: 35, collections: new Set(collections), span: 21, includeMissing: false, showAll: true,
    sort: { key: 'resort', dir: 1 }, trip: { start: null, days: 7 }
  });
  let state = DEFAULTS();

  /* ---- Controls ---- */
  function buildControls() {
    let html = '', y = null;
    WEEKS.forEach((x, i) => {
      if (x.y < startYear && i !== todayIdx) return;
      if (x.y !== y) { if (y !== null) html += '</optgroup>'; html += '<optgroup label="' + x.y + '">'; y = x.y; }
      html += '<option value="' + i + '">' + esc(weekLabel(x)) + (i === todayIdx ? ' (this week)' : '') + '</option>';
    });
    $('week').innerHTML = html + '</optgroup>';
    if (todayIdx >= 0) $('todayHint').textContent = 'Today is in week ' + WEEKS[todayIdx].w + ' of ' + WEEKS[todayIdx].y + '.';
    $('bedrooms').innerHTML = '<option value="">None (season colors only)</option>' + GROUPS.filter(g => typesInGroup(g).length).map(g => '<option value="' + g + '">' + groupLabel(g) + '</option>').join('');
    $('radius').innerHTML = RADII.map(r => '<option value="' + r + '">' + r.toLocaleString('en-US') + ' miles</option>').join('');
    $('collectionChecks').innerHTML = collections.map(c => '<label class="check"><input type="checkbox" value="' + esc(c) + '"> ' + esc(COLLECTION_LABEL[c] || c) +
      (D.rows.some(s => s.collection === c && hasChart(s)) ? '' : ' <span class="hint">(no charts yet)</span>') + '</label>').join('') +
      '<label class="check disabled"><input type="checkbox" disabled> Club Wyndham Access (CWA) <span class="hint">(list coming soon)</span></label>';
    $('spanButtons').innerHTML = SPANS.map(n => '<button type="button" data-span="' + n + '">' + (n ? n : 'All') + '</button>').join('');
    $('days').innerHTML = Array.from({ length: 12 }, (_, i) => i + 3).map(d => '<option value="' + d + '">' + d + ' days, ' + (d - 1) + ' nights</option>').join('');
    const firstDay = new Date(WEEKS.find(x => x.y === startYear).start).toISOString().slice(0, 10), lastDay = new Date(WEEKS[WEEKS.length - 1].start).toISOString().slice(0, 10);
    $('startDate').min = firstDay; $('startDate').max = lastDay;
    $('places').innerHTML = regions.map(r => '<option value="' + esc(r) + '"></option>').join('') + (GEO ? GEO.options() : '');
  }

  let shownGroup = null;
  function syncControls() {
    $('week').value = String(state.idx);
    $('seasonWeek').textContent = WEEKS[state.idx].w;
    $('bedrooms').value = state.group;
    $('typeBox').hidden = !state.group;
    if (state.group !== shownGroup) {
      shownGroup = state.group;
      $('typeChecks').innerHTML = state.group ? typesInGroup(state.group).map(c => '<label class="check"><input type="checkbox" value="' + c.id + '"> ' + esc(br(c.label)) + '</label>').join('') : '';
    }
    for (const i of $('typeChecks').querySelectorAll('input')) i.checked = state.types.has(i.value);
    const nTypes = state.group ? typesInGroup(state.group).length : 0;
    $('typeSummary').textContent = state.group ? (state.types.size === nTypes ? '(all ' + nTypes + ')' : '(' + state.types.size + ' of ' + nTypes + ')') : '';
    if (document.activeElement !== $('search')) $('search').value = state.query;
    $('radius').value = String(state.radius);
    for (const i of $('collectionChecks').querySelectorAll('input:not([disabled])')) i.checked = state.collections.has(i.value);
    $('collectionSummary').textContent = state.collections.size === collections.length ? '(all)' : '(' + state.collections.size + ' of ' + collections.length + ')';
    for (const b of $('spanButtons').querySelectorAll('button')) b.setAttribute('aria-pressed', String(Number(b.dataset.span) === state.span));
    $('includeMissing').checked = state.includeMissing;
    $('startDate').value = state.trip.start ? new Date(state.trip.start).toISOString().slice(0, 10) : '';
    $('days').value = String(state.trip.days);
  }

  /* ---- Which rows to show ---- */
  function placeFilter() {
    const q = state.query;
    if (!q) return { test: () => true, hint: '' };
    const region = regionByName.get(norm(q));
    if (region) return { test: s => regionOf(s) === region, hint: 'Resorts in ' + region + '.', radius: false };
    const center = GEO ? GEO.resolve(q) : null;
    if (center) return { test: s => GEO.match({ resort_id: s.resort_id, name: s.name, city: s.city, state: s.state, country: s.country, schedule: s.schedule }, q, state.radius),
      hint: 'Within ' + state.radius.toLocaleString('en-US') + ' miles of ' + center.label + ', in a straight line.', radius: true };
    const words = norm(q).split(' ').filter(Boolean);
    return { test: s => { const t = norm([s.name, s.city, s.state, s.country, s.schedule].join(' ')); return words.every(w => t.includes(w)); },
      hint: 'Matching “' + q + '”. For a distance search, pick a city from the list.', radius: false };
  }

  function candidateRows(place) {
    const rows = [];
    for (const s of D.rows) {
      if (!hasChart(s) && !state.includeMissing) continue;
      if (!state.collections.has(s.collection) || !place.test(s)) continue;
      if (!state.group) { rows.push({ s, p: null, gap: hasChart(s) ? '' : 'chart' }); continue; }
      if (!hasChart(s)) { rows.push({ s, p: null, gap: 'chart' }); continue; }
      const inGroup = (pointsBySchedule.get(s.id) || []).filter(p => (classOf.get(p.category) || {}).group === state.group);
      const ticked = inGroup.filter(p => state.types.has(p.category));
      if (ticked.length) for (const p of ticked) rows.push({ s, p, gap: '' });
      else rows.push({ s, p: null, gap: inGroup.length ? 'pick' : 'size' });
    }
    return rows;
  }

  const seasonOfRow = (r, w) => r.gap ? null : weekInfo(r, w).season;

  function sortRows(rows) {
    const d = state.sort.dir;
    const byResort = (a, b) => shortName(a.s.name).localeCompare(shortName(b.s.name)) || a.s.schedule.localeCompare(b.s.schedule);
    const typeOrder = r => r.p ? classOf.get(r.p.category).order : 9999;
    if (state.sort.key === 'type') return rows.sort((a, b) => d * (typeOrder(a) - typeOrder(b) || (a.p && b.p ? typeLabel(a.p).localeCompare(typeLabel(b.p)) : 0)) || byResort(a, b));
    return rows.sort((a, b) => d * byResort(a, b) || typeOrder(a) - typeOrder(b) || (a.p && b.p ? typeLabel(a.p).localeCompare(typeLabel(b.p)) : 0));
  }

  /* ---- Render ---- */
  function columns() {
    const sel = WEEKS[state.idx];
    if (!state.span) return WEEKS.filter(x => x.y === sel.y);
    let a = Math.max(0, state.idx - (state.span - 1) / 2), b = Math.min(WEEKS.length - 1, a + state.span - 1);
    a = Math.max(0, b - state.span + 1);
    return WEEKS.slice(a, b + 1);
  }

  function render() {
    syncControls();
    const wk = WEEKS[state.idx].w, place = placeFilter();
    $('searchHint').textContent = place.hint;
    $('radiusField').hidden = !!state.query && !place.radius;

    const cand = candidateRows(place);
    // Season counts (before the season filter): a resort counts once per season it shows in this week
    const bySeason = { '': new Set(), none: new Set() }; SEASONS.forEach(x => bySeason[x] = new Set());
    const keysWithSeason = new Set();
    for (const r of cand) { const k = resortKey(r.s); bySeason[''].add(k); const x = seasonOfRow(r, wk); if (x) { bySeason[x].add(k); keysWithSeason.add(k); } }
    for (const k of bySeason['']) if (!keysWithSeason.has(k)) bySeason.none.add(k);
    renderSeasonList(bySeason);

    let rows = cand;
    if (!state.showAll) rows = rows.filter(r => !r.gap);
    if (state.season === 'none') rows = rows.filter(r => !seasonOfRow(r, wk));
    else if (state.season) rows = rows.filter(r => seasonOfRow(r, wk) === state.season);
    sortRows(rows);

    // Count line and messages
    const total = bySeason[''].size, have = new Set(cand.filter(r => !r.gap).map(r => resortKey(r.s))).size;
    const shown = new Set(rows.map(r => resortKey(r.s))).size;
    const sz = state.group ? sizeWords(state.group) : '';
    let count = !state.group ? '<b>' + total + '</b> resorts' : '<b>' + have + ' / ' + total + '</b> resorts have ' + esc(sz);
    if (state.season) count += ' · showing <b>' + shown + '</b> ' + (state.season === 'none' ? NONE_LABEL.toLowerCase() : 'in ' + state.season) + ' in week ' + wk;
    else if (!state.showAll && state.group) count += ' · showing those ' + have;
    $('count').innerHTML = rows.length ? count : 'No resorts match these filters';

    const picks = [...new Set(cand.filter(r => r.gap === 'pick').map(r => r.s.name))];
    if (state.group && state.types.size === 0) { $('typeAlert').hidden = false; $('typeAlert').innerHTML = '<strong>No room types are selected.</strong> Open “Room types” in the filters and tick at least one to see points.'; }
    else if (picks.length) { $('typeAlert').hidden = false; $('typeAlert').innerHTML = '<strong>' + picks.length + (picks.length === 1 ? ' resort has ' : ' resorts have ') + esc(sz) + ', but not of the room types you ticked.</strong> They say “Select a room type”.'; }
    else $('typeAlert').hidden = true;
    const sizeGaps = [...new Set(cand.filter(r => r.gap === 'size').map(r => shortName(r.s.name)))];
    if (sizeGaps.length && state.showAll) {
      $('grayNote').hidden = false;
      $('grayNote').innerHTML = '<strong>Grayed out:</strong> ' + sizeGaps.slice(0, 6).map(esc).join(', ') + (sizeGaps.length > 6 ? ' and ' + (sizeGaps.length - 6) + ' more' : '') +
        (sizeGaps.length === 1 ? ' doesn’t' : ' don’t') + ' have ' + esc(sz) + '. Try another bedroom size, or untick “Show all resorts” to hide them.';
    } else $('grayNote').hidden = true;

    renderTrip();
    renderGrid(rows, wk);
  }

  function renderSeasonList(bySeason) {
    const opts = [['', 'All seasons', 'all'], ...SEASONS.map(x => [x, x, CLS[x]]), ['none', NONE_LABEL, 'na']];
    $('seasonList').innerHTML = opts.map(([v, label, cls]) => '<button type="button" class="season-opt" data-season="' + v + '" aria-pressed="' + (state.season === v) + '">' +
      '<span class="sw ' + cls + '"></span><span>' + label + '</span><span class="n">' + bySeason[v].size + '</span></button>').join('');
  }

  function tripRange() {
    if (!state.trip.start) return null;
    return { a: state.trip.start, b: state.trip.start + (state.trip.days - 1) * DAY };
  }
  function renderTrip() {
    const t = tripRange();
    $('tripHint').textContent = t ? fmt(t.a, { weekday: 'short', month: 'short', day: 'numeric' }) + ' to ' + fmt(t.b, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
      ' (' + state.trip.days + ' days, ' + (state.trip.days - 1) + ' nights), marked on the chart. Trip totals are coming next.' : 'Pick dates to mark them on the chart. Trip totals are coming next.';
  }

  function renderGrid(rows, wk) {
    if (!rows.length) { $('grid').innerHTML = '<tbody><tr><td class="empty">No resorts match these filters. <button type="button" class="reset" id="emptyReset">Reset filters</button></td></tr></tbody>'; $('emptyReset').onclick = reset; $('week53Note').hidden = true; return; }
    const cols = columns(), sel = WEEKS[state.idx], t = tripRange(), showType = !!state.group;
    const inTrip = c => t && c.start <= t.b && t.a < c.start + 7 * DAY;
    const arrow = key => state.sort.key === key ? (state.sort.dir > 0 ? '▲' : '▼') : '▲▼';
    let head = '<thead><tr><th class="res" scope="col"><div class="col-head"><button type="button" class="sort" data-sort="resort" aria-pressed="' + (state.sort.key === 'resort') + '">Resort <span class="arrow">' + arrow('resort') + '</span></button>' +
      (state.group ? '<label class="show-all"><input type="checkbox" id="showAll"' + (state.showAll ? ' checked' : '') + '> Show all resorts</label>' : '') + '</div></th>' +
      (showType ? '<th class="typ" scope="col"><button type="button" class="sort" data-sort="type" aria-pressed="' + (state.sort.key === 'type') + '">Room type <span class="arrow">' + arrow('type') + '</span></button></th>' : '');
    let prevYear = null;
    for (const c of cols) {
      const cls = 'wk' + (c === sel ? ' sel' : '') + (WEEKS.indexOf(c) === todayIdx ? ' today' : '') + (inTrip(c) ? ' trip' : '');
      head += '<th class="' + cls + '" scope="col" title="' + esc(weekLabel(c)) + '">' + (c.y !== prevYear ? '<span class="yr">' + c.y + '</span>' : '') +
        '<b>' + c.w + '</b><small>' + fmt(c.start, { month: 'short', day: 'numeric' }) + '</small></th>';
      prevYear = c.y;
    }
    head += '</tr></thead>';

    let body = '<tbody>', any53 = false;
    rows.forEach((r, i) => {
      const s = r.s, first = i === 0 || rows[i - 1].s !== s;
      let span = 1; if (first) while (i + span < rows.length && rows[i + span].s === s) span++;
      body += '<tr' + (r.gap ? ' class="gray"' : '') + '>';
      if (first) {
        const bldg = s.multiple ? '<span class="res-bldg">' + esc(s.schedule) + '</span>' : '';
        const extra = !showType && r.gap === 'chart' ? '<span class="res-loc gap">No points chart</span>' : '';
        body += '<th class="res" scope="row"' + (span > 1 ? ' rowspan="' + span + '"' : '') + '><button type="button" class="res-name" data-row="' + i + '">' + esc(shortName(s.name)) + '</button>' +
          '<span class="res-loc">' + esc(s.location || [s.city, s.state].filter(Boolean).join(', ')) + '</span>' + bldg + extra + '</th>';
      }
      if (showType) body += r.gap === 'pick' ? '<td class="typ pick">Select a room type</td>' : r.gap === 'size' ? '<td class="typ gap">No ' + esc(sizeWords(state.group)) + '</td>'
        : r.gap === 'chart' ? '<td class="typ gap">No points chart</td>' : '<td class="typ">' + esc(typeLabel(r.p)) + '</td>';
      for (const c of cols) {
        const info = r.gap ? { season: null, points: null } : weekInfo(r, c.w);
        if (info.w53 === 'assumed') any53 = true;
        const cls = 'c ' + (info.season ? CLS[info.season] : 'na') + (info.w53 === 'assumed' ? ' w53' : '') + (c === sel ? ' sel' : '') + (inTrip(c) ? ' trip' : '');
        const text = r.gap ? '' : state.group ? short(info.points) : (info.season ? info.season[0] : '–');
        const tip = weekLabel(c) + ' · ' + (r.gap ? NONE_LABEL : (info.season || NONE_LABEL) + (state.group ? ' · ' + full(info.points) : '')) +
          (info.w53 === 'assumed' ? ' · Week 53 isn’t in this resort’s chart; shown at week 1 points. Confirm with Club Wyndham.' : '');
        body += '<td class="' + cls + '" title="' + esc(tip) + '">' + text + '</td>';
      }
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
    const s = row.s, ps = pointsBySchedule.get(s.id) || [];
    $('detailTitle').textContent = s.name;
    let h = '<dl><dt>Location</dt><dd>' + esc(s.location || [s.city, s.state, s.country].filter(Boolean).join(', ')) + '</dd>';
    if (s.multiple) h += '<dt>Chart</dt><dd>' + esc(s.schedule) + '</dd>';
    h += '<dt>Collection</dt><dd>' + esc(COLLECTION_LABEL[s.collection] || s.collection) + '</dd>';
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
    } else h += '<p>The Club Wyndham directory has no points chart for this resort.' + (s.collection === 'Club Pass' ? ' WorldMark (Club Pass) points charts are on clubwyndham.com.' : '') + '</p>';
    if (s.note) h += '<p class="hint">' + esc(s.note) + '</p>';
    if (WEEK53[s.name]) h += '<p class="hint">This resort’s chart lists week 53 as ' + WEEK53[s.name] + '.</p>';
    $('detailBody').innerHTML = h;
    $('detail').showModal();
  }

  function reset() { state = DEFAULTS(); render(); }

  /* ---- Events ---- */
  function wire() {
    $('week').addEventListener('change', e => { state.idx = Number(e.target.value); render(); });
    $('seasonList').addEventListener('click', e => { const b = e.target.closest('.season-opt'); if (b) { state.season = state.season === b.dataset.season ? '' : b.dataset.season; render(); } });
    $('bedrooms').addEventListener('change', e => { state.group = e.target.value; state.types = allTypes(state.group); if (!state.group && state.sort.key === 'type') state.sort = { key: 'resort', dir: 1 }; render(); });
    $('typeChecks').addEventListener('change', e => { e.target.checked ? state.types.add(e.target.value) : state.types.delete(e.target.value); render(); });
    let t; $('search').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value.trim(); render(); }, 250); });
    $('radius').addEventListener('change', e => { state.radius = Number(e.target.value); render(); });
    $('collectionChecks').addEventListener('change', e => { e.target.checked ? state.collections.add(e.target.value) : state.collections.delete(e.target.value); render(); });
    $('spanButtons').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.span = Number(b.dataset.span); render(); } });
    $('includeMissing').addEventListener('change', e => { state.includeMissing = e.target.checked; render(); });
    $('startDate').addEventListener('change', e => {
      const v = e.target.value; state.trip.start = v ? Date.parse(v + 'T00:00:00Z') : null;
      if (state.trip.start != null) { const i = weekOf(state.trip.start); if (i >= 0) state.idx = i; }
      render();
    });
    $('days').addEventListener('change', e => { state.trip.days = Number(e.target.value); render(); });
    $('reset').addEventListener('click', reset);
    $('grid').addEventListener('click', e => {
      const sortBtn = e.target.closest('.sort');
      if (sortBtn) { const k = sortBtn.dataset.sort; state.sort = state.sort.key === k ? { key: k, dir: -state.sort.dir } : { key: k, dir: 1 }; render(); return; }
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
