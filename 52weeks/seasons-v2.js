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
  /* Charts that print week 53 themselves (2026/2027): Page 91 (CW search bar page 95) and Page 184 (CW search bar page 188).
     Every other resort's week 53 is gray, priced like week 1, until Club Wyndham confirms. */
  const WEEK53 = { 'Club Wyndham Paniolo Greens': 'Prime', 'Little Sweden': 'Prime' };
  const COLLECTION_LABEL = { 'Club Pass': 'WorldMark (Club Pass)' };
  const GROUPS = ['Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', '4 Bedroom', '5 Bedroom', 'Hotel'];
  const SPANS = [11, 21, 31, 0]; // 0 = all weeks of the selected week's year
  const RADII = [10, 25, 35, 50, 75, 100, 150, 200, 250, 350, 500, 750, 1000];

  /* ---- RCI calendar: week 1 starts on the first Friday of January; week 53 exists when Dec 31 is a Friday ---- */
  const DAY = 864e5;
  const firstFriday = y => { const d = new Date(Date.UTC(y, 0, 1)).getUTCDay(); return Date.UTC(y, 0, 1 + ((5 - d + 7) % 7)); };
  const weeksIn = y => new Date(Date.UTC(y, 11, 31)).getUTCDay() === 5 ? 53 : 52;
  const fmt = (t, o) => new Date(t).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, o));
  const now = new Date(), todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startYear = now.getFullYear();
  const WEEKS = [];
  for (let y = startYear - 1; y <= startYear + 3; y++) for (let w = 1; w <= weeksIn(y); w++) WEEKS.push({ y, w, start: firstFriday(y) + (w - 1) * 7 * DAY });
  const todayIdx = WEEKS.findIndex(x => x.start <= todayUTC && todayUTC < x.start + 7 * DAY);
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
  const regions = [...new Set(D.rows.map(s => s.country === 'United States' ? s.state : s.country).filter(Boolean))].sort();

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
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---- State ---- */
  const DEFAULTS = () => ({
    idx: todayIdx >= 0 ? todayIdx : WEEKS.findIndex(x => x.y === startYear), seasons: new Set(), group: '1 Bedroom', types: null, typeColumn: false,
    query: '', radius: 35, region: '', collections: new Set(collections), span: 21, includeMissing: false
  });
  let state = DEFAULTS();
  const allTypes = g => new Set(typesInGroup(g).map(c => c.id));
  state.types = allTypes(state.group);

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

    $('seasonChips').innerHTML = SEASONS.map(s => '<label class="chip"><input type="checkbox" value="' + s + '"><span class="sw ' + CLS[s] + '">' + s[0] + '</span>' + s + '</label>').join('');
    $('bedrooms').innerHTML = '<option value="">None (season colors only)</option>' + GROUPS.filter(g => typesInGroup(g).length).map(g => '<option value="' + g + '">' + (g === 'Hotel' ? 'Hotel room' : g) + '</option>').join('');
    $('radius').innerHTML = RADII.map(r => '<option value="' + r + '">' + r.toLocaleString('en-US') + ' miles</option>').join('');
    $('region').innerHTML = '<option value="">All states and countries</option>' + regions.map(r => '<option>' + esc(r) + '</option>').join('');
    $('collectionChecks').innerHTML = collections.map(c => '<label class="check"><input type="checkbox" value="' + esc(c) + '"> ' + esc(COLLECTION_LABEL[c] || c) +
      (D.rows.some(s => s.collection === c && hasChart(s)) ? '' : ' <span class="hint">(no points charts)</span>') + '</label>').join('') +
      '<label class="check disabled"><input type="checkbox" disabled> Club Wyndham Access (CWA) <span class="hint">(list coming soon)</span></label>';
    $('spanButtons').innerHTML = SPANS.map(n => '<button type="button" data-span="' + n + '">' + (n ? n : 'All') + '</button>').join('');
    if (GEO) $('places').innerHTML = GEO.options();
  }

  let shownGroup = null;
  function syncControls() {
    $('week').value = String(state.idx);
    $('seasonWeek').textContent = WEEKS[state.idx].w;
    for (const i of $('seasonChips').querySelectorAll('input')) i.checked = state.seasons.has(i.value);
    $('bedrooms').value = state.group;
    $('typeBox').hidden = !state.group;
    if (state.group !== shownGroup) {
      shownGroup = state.group;
      $('typeChecks').innerHTML = state.group ? typesInGroup(state.group).map(c => '<label class="check"><input type="checkbox" value="' + c.id + '"> ' + esc(c.label) + '</label>').join('') : '';
    }
    for (const i of $('typeChecks').querySelectorAll('input')) i.checked = state.types.has(i.value);
    $('typeColumn').checked = state.typeColumn;
    if (document.activeElement !== $('search')) $('search').value = state.query;
    $('radius').value = String(state.radius);
    $('region').value = state.region;
    for (const i of $('collectionChecks').querySelectorAll('input:not([disabled])')) i.checked = state.collections.has(i.value);
    for (const b of $('spanButtons').querySelectorAll('button')) b.setAttribute('aria-pressed', String(Number(b.dataset.span) === state.span));
    $('includeMissing').checked = state.includeMissing;
  }

  /* ---- Which rows to show ---- */
  function scheduleMatches(s) {
    if (!hasChart(s) && !state.includeMissing) return false;
    if (!state.collections.has(s.collection)) return false;
    if (state.region && (s.country === 'United States' ? s.state : s.country) !== state.region) return false;
    if (state.query && GEO) return GEO.match({ resort_id: s.resort_id, name: s.name, city: s.city, state: s.state, country: s.country, schedule: s.schedule }, state.query, state.radius);
    if (state.query) return (s.name + ' ' + s.city + ' ' + s.state + ' ' + s.country).toLowerCase().includes(state.query.toLowerCase());
    return true;
  }

  function buildRows() {
    const rows = [];
    const schedules = D.rows.filter(scheduleMatches).sort((a, b) => a.name.localeCompare(b.name) || a.schedule.localeCompare(b.schedule));
    for (const s of schedules) {
      if (!state.group) { rows.push({ s, p: null }); continue; }
      const ps = (pointsBySchedule.get(s.id) || []).filter(p => (classOf.get(p.category) || {}).group === state.group && state.types.has(p.category))
        .sort((a, b) => classOf.get(a.category).order - classOf.get(b.category).order);
      if (ps.length) for (const p of ps) rows.push({ s, p });
      else rows.push({ s, p: null, gap: hasChart(s) ? 'size' : 'chart' });
    }
    const wk = WEEKS[state.idx].w;
    return state.seasons.size ? rows.filter(r => !r.gap && state.seasons.has(weekInfo(r, wk).season)) : rows;
  }

  /* ---- Render ---- */
  function columns() {
    const sel = WEEKS[state.idx];
    if (!state.span) return WEEKS.filter(x => x.y === sel.y);
    const half = (state.span - 1) / 2;
    let a = Math.max(0, state.idx - half);
    let b = Math.min(WEEKS.length - 1, a + state.span - 1);
    a = Math.max(0, b - state.span + 1);
    return WEEKS.slice(a, b + 1);
  }

  function render() {
    syncControls();
    const rows = buildRows(), cols = columns(), sel = WEEKS[state.idx];
    const showType = !!state.group && state.typeColumn;
    const center = GEO && state.query ? GEO.resolve(state.query) : null;
    $('nearbyHint').textContent = center ? 'Within ' + state.radius.toLocaleString('en-US') + ' miles of ' + center.label + ', in a straight line.' : 'Choose a place from the list to search by distance.';

    // Counts: resorts, not rows (a resort can have several room types or charts)
    const shown = new Set(rows.map(r => resortKey(r.s)));
    const withSize = new Set(rows.filter(r => r.p).map(r => resortKey(r.s)));
    const grayKeys = new Set(rows.filter(r => r.gap).map(r => resortKey(r.s)).filter(k => !withSize.has(k)));
    const sizeName = state.group ? (state.group === 'Hotel' ? 'hotel rooms' : state.group === 'Studio' ? 'studios' : state.group.toLowerCase().replace('bedroom', 'bedroom units')) : '';
    $('count').innerHTML = !rows.length ? 'No resorts match these filters'
      : !state.group
      ? 'Showing <span class="of">' + shown.size + '</span> resorts'
      : '<span class="of">' + withSize.size + ' / ' + shown.size + '</span> resorts have ' + esc(sizeName) + (state.seasons.size ? ' and match the season filter' : '');
    if (grayKeys.size) {
      const names = [...new Set(rows.filter(r => r.gap && grayKeys.has(resortKey(r.s))).map(r => r.s.name))];
      $('grayNote').hidden = false;
      $('grayNote').innerHTML = '<strong>Grayed out:</strong> ' + names.slice(0, 6).map(esc).join(', ') + (names.length > 6 ? ' and ' + (names.length - 6) + ' more' : '') +
        (names.length === 1 ? ' doesn’t' : ' don’t') + ' have ' + esc(sizeName) + (state.types.size < typesInGroup(state.group).length ? ' of the ticked room types' : '') +
        '. Try another bedroom size to see what ' + (names.length === 1 ? 'it offers' : 'they offer') + '.';
    } else $('grayNote').hidden = true;

    if (!rows.length) { $('grid').innerHTML = '<tbody><tr><td class="empty">No resorts match these filters. <button type="button" class="reset" id="emptyReset">Reset filters</button></td></tr></tbody>'; $('emptyReset').onclick = reset; $('week53Note').hidden = true; return; }

    let head = '<thead><tr><th class="res" scope="col">Resort</th>' + (showType ? '<th class="typ" scope="col">Room type</th>' : '');
    let prevYear = null;
    for (const c of cols) {
      const cls = 'wk' + (c === sel ? ' sel' : '') + (WEEKS.indexOf(c) === todayIdx ? ' today' : '');
      head += '<th class="' + cls + '" scope="col" title="' + esc(weekLabel(c)) + '">' + (c.y !== prevYear ? '<span class="yr">' + c.y + '</span>' : '') +
        '<b>' + c.w + '</b><small>' + fmt(c.start, { month: 'short', day: 'numeric' }) + '</small></th>';
      prevYear = c.y;
    }
    head += '</tr></thead>';

    let body = '<tbody>', any53 = false;
    rows.forEach((r, i) => {
      const s = r.s, typeName = r.p ? r.p.roomType || (classOf.get(r.p.category) || {}).label : '';
      const sub = r.gap ? '<span class="res-sub gap">' + (r.gap === 'size' ? 'No ' + esc(sizeName) : 'No points chart') + '</span>'
        : '<span class="res-sub"><span class="loc">' + esc(s.location || [s.city, s.state].filter(Boolean).join(', ')) + (s.multiple ? ' · ' + esc(s.schedule) : '') + (r.p && !showType ? ' · ' : '') + '</span>' + (r.p && !showType ? '<strong>' + esc(typeName) + '</strong>' : '') + '</span>';
      body += '<tr' + (r.gap ? ' class="gray"' : '') + '><th class="res" scope="row"><button type="button" class="res-name" data-row="' + i + '">' + esc(s.name) + '</button>' + sub + '</th>' +
        (showType ? '<td class="typ">' + esc(r.gap ? '—' : typeName) + '</td>' : '');
      for (const c of cols) {
        const info = r.gap ? { season: null, points: null } : weekInfo(r, c.w);
        if (info.w53 === 'assumed') any53 = true;
        const cls = 'c ' + (info.season ? CLS[info.season] : 'na') + (info.w53 === 'assumed' ? ' w53' : '') + (c === sel ? ' sel' : '');
        const text = r.gap ? '' : state.group ? short(info.points) : (info.season ? info.season[0] : '–');
        const tip = weekLabel(c) + ' · ' + (r.gap ? 'not offered' : (info.season || 'Not provided') + (state.group ? ' · ' + full(info.points) : '')) +
          (info.w53 === 'assumed' ? ' · Week 53 isn’t in this resort’s chart; shown at week 1 points. Confirm with Club Wyndham.' : '');
        body += '<td class="' + cls + '" title="' + esc(tip) + '">' + text + '</td>';
      }
      body += '</tr>';
    });
    $('grid').innerHTML = head + body + '</tbody>';
    $('grid').__rows = rows;

    $('week53Note').hidden = !any53;
    if (any53) $('week53Note').innerHTML = '<strong>Week 53</strong> (striped gray) isn’t listed in most resorts’ charts. It’s shown at week 1 points as a guide only; confirm with Club Wyndham before you book. Club Wyndham Paniolo Greens and Little Sweden print week 53 as Prime, so theirs are colored.';

    // Bring the selected week into view
    const th = $('grid').querySelector('thead .wk.sel');
    if (th) { const wrap = $('gridWrap'), fixed = $('grid').querySelector('thead .res').offsetWidth + (showType ? $('grid').querySelector('thead .typ').offsetWidth : 0);
      const left = th.offsetLeft - fixed - (wrap.clientWidth - fixed - th.offsetWidth) / 2; wrap.scrollLeft = Math.max(0, left); }
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
        h += '<tr><td>' + esc(p.roomType || (classOf.get(p.category) || {}).label) + '</td>' + SEASONS.map(x => '<td>' + (by[x] != null ? by[x].toLocaleString('en-US') : '—') + '</td>').join('') + '</tr>';
      }
      h += '</tbody></table>';
      const notes = [...new Set(ps.map(p => p.note).concat(ps.map(p => p.derivedNote)).filter(Boolean))];
      if (notes.length) h += '<p class="hint">' + notes.map(esc).join(' ') + '</p>';
    } else h += '<p>There is no Club Wyndham points chart for this resort in the directory.</p>';
    if (s.note) h += '<p class="hint">' + esc(s.note) + '</p>';
    if (WEEK53[s.name]) h += '<p class="hint">This resort’s chart lists week 53 as ' + WEEK53[s.name] + '.</p>';
    $('detailBody').innerHTML = h;
    $('detail').showModal();
  }

  function reset() { state = DEFAULTS(); state.types = allTypes(state.group); render(); }

  /* ---- Events ---- */
  function wire() {
    $('week').addEventListener('change', e => { state.idx = Number(e.target.value); render(); });
    $('seasonChips').addEventListener('change', e => { e.target.checked ? state.seasons.add(e.target.value) : state.seasons.delete(e.target.value); render(); });
    $('bedrooms').addEventListener('change', e => { state.group = e.target.value; state.types = allTypes(state.group); render(); });
    $('typeChecks').addEventListener('change', e => { e.target.checked ? state.types.add(e.target.value) : state.types.delete(e.target.value); render(); });
    $('typeColumn').addEventListener('change', e => { state.typeColumn = e.target.checked; render(); });
    let t; $('search').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.query = e.target.value.trim(); render(); }, 250); });
    $('radius').addEventListener('change', e => { state.radius = Number(e.target.value); render(); });
    $('region').addEventListener('change', e => { state.region = e.target.value; render(); });
    $('collectionChecks').addEventListener('change', e => { e.target.checked ? state.collections.add(e.target.value) : state.collections.delete(e.target.value); render(); });
    $('spanButtons').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { state.span = Number(b.dataset.span); render(); } });
    $('includeMissing').addEventListener('change', e => { state.includeMissing = e.target.checked; render(); });
    $('reset').addEventListener('click', reset);
    $('grid').addEventListener('click', e => { const b = e.target.closest('.res-name'); if (b) openDetail($('grid').__rows[Number(b.dataset.row)]); });
    $('closeDetail').addEventListener('click', () => $('detail').close());
    $('detail').addEventListener('click', e => { if (e.target === $('detail')) $('detail').close(); });
    if (window.matchMedia('(max-width: 820px)').matches) $('filterBox').open = false;
  }

  buildControls();
  wire();
  render();
})();
