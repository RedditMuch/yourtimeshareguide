'use strict';
// Find a Stay Version 2 (plannerv2.html): adds the Resort History tab and an "Experiences on the App" filter
// without changing planner.js. It runs after planner.js, so it only adds to what that script draws.
(() => {
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TITLE = 'Find a Stay Version 2';
const H = window.RESORT_HISTORY || { rows: [], eras: [], timeline: [], note: '' };
const NEWS = window.RESORT_NEWS || [];
const UNC = 'Unconfirmed';

// ---- Keep the page names (planner.js writes "Find a stay" again every time it draws) ----
function keepTitles() {
  const h1 = $('plannerPageTitle'), crumb = $('breadcrumbPage');
  if (h1 && h1.textContent !== TITLE) h1.textContent = TITLE;
  if (crumb && crumb.textContent !== TITLE) crumb.textContent = TITLE;
  if (document.title !== TITLE) document.title = TITLE;
}
keepTitles();
for (const [el, opts] of [[$('plannerPageTitle'), { childList: true, characterData: true, subtree: true }], [$('breadcrumbPage'), { childList: true, characterData: true, subtree: true }], [document.querySelector('title'), { childList: true, characterData: true, subtree: true }]]) {
  if (el) new MutationObserver(keepTitles).observe(el, opts);
}

// ---- Which news and notices apply to each history row ----
const newsFor = row => NEWS.filter(n => (n.ids || []).some(id => row.ids.includes(id)));

// ---- Resort History tab ----
const tabs = document.querySelector('.module-tabs');
const findTab = $('findTab'), savedTab = $('savedTab'), findView = $('findView'), savedView = $('savedView');
if (tabs && findView && savedView) {
  const tab = document.createElement('button');
  tab.id = 'historyTab'; tab.type = 'button'; tab.setAttribute('aria-pressed', 'false'); tab.textContent = 'Resort History';
  tabs.appendChild(tab);

  const view = document.createElement('section');
  view.id = 'historyView'; view.hidden = true; view.className = 'rh-view'; view.setAttribute('aria-labelledby', 'historyHeading');
  const eraHtml = H.eras.map(e => '<div class="rh-era"><dt>' + esc(e.name) + '</dt><dd><span class="rh-range">' + esc(e.range) + '</span> ' + esc(e.text) + ' <span class="rh-who">Company: ' + esc(e.who) + '.</span></dd></div>').join('');
  const timeHtml = H.timeline.map(e => '<li><strong>' + esc(e.d) + '</strong> ' + esc(e.t) + (e.s && e.s.u ? ' <a href="' + esc(e.s.u) + '" target="_blank" rel="noopener">Source</a>' : '') + '</li>').join('');
  view.innerHTML =
    '<div class="results-heading"><h2 id="historyHeading">Resort History</h2><p>Dates resorts were added to and removed from the system.</p></div>' +
    '<div class="rh-note" role="note"><strong>Work in Progress</strong><p>' + esc(H.note) + ' Last updated ' + esc(H.updated) + '.</p></div>' +
    '<h3 class="rh-h3">Origin Eras</h3><dl class="rh-eras">' + eraHtml + '</dl>' +
    '<details class="rh-timeline"><summary>Company Timeline</summary><ul>' + timeHtml + '</ul></details>' +
    '<form class="rh-filters" id="rhFilters" onsubmit="return false"><label>Status<select id="rhStatus"><option value="">All Statuses</option><option>Active</option><option>Departed</option><option>Coming Soon</option></select></label>' +
    '<label>Origin<select id="rhOrigin"><option value="">All Origins</option></select></label>' +
    '<label class="rh-search">Search Resorts<input type="search" id="rhSearch" placeholder="Name, city or state" autocomplete="off"></label></form>' +
    '<p class="rh-count" id="rhCount" role="status" aria-live="polite"></p>' +
    '<p class="rh-unc"><span class="rh-badge">' + UNC + '</span> means the item has not been verified yet.</p>' +
    '<div class="rh-scroll" id="rhScroll" role="region" aria-label="Resort History Table" tabindex="0"><table class="rh-table" id="rhTable"><thead><tr></tr></thead><tbody></tbody></table></div>';
  savedView.insertAdjacentElement('afterend', view);

  const cols = [['name', 'Resort'], ['collection', 'Collection'], ['status', 'Status'], ['origin', 'Origin'], ['added', 'Date Added'], ['removed', 'Date Removed'], ['news', 'News and Notices'], ['notes', 'Notes'], ['source', 'Source']];
  const sortable = new Set(['name', 'collection', 'status', 'origin', 'added', 'removed']);
  let sortKey = 'name', sortDir = 1;
  const originSel = $('rhOrigin');
  [...new Set(H.rows.map(r => r.origin))].sort((a, b) => (a === UNC) - (b === UNC) || a.localeCompare(b)).forEach(o => originSel.insertAdjacentHTML('beforeend', '<option>' + esc(o) + '</option>'));
  const head = view.querySelector('thead tr');
  head.innerHTML = cols.map(([k, l]) => sortable.has(k)
    ? '<th scope="col" data-k="' + k + '" aria-sort="none"><button type="button" class="rh-sort">' + esc(l) + '<span aria-hidden="true" class="rh-arrow"></span></button></th>'
    : '<th scope="col">' + esc(l) + '</th>').join('');

  const squash = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  const dateKey = v => {
    if (!v || v === UNC || /^Between/.test(v)) return v && /^Between/.test(v) ? 99999999 : 99999999 + 1;
    let m = /^(\d\d)\/(\d\d)\/(\d\d)$/.exec(v); if (m) return (2000 + +m[3]) * 10000 + +m[1] * 100 + +m[2];
    m = /^(\d{4})$/.exec(v); if (m) return +m[1] * 10000;
    return 99999999 + 1;
  };
  const dateCell = (v, verified) => !v ? '<span class="rh-dash" aria-label="Not applicable">&ndash;</span>' : (verified ? esc(v) : (v === UNC ? '<span class="rh-badge">' + UNC + '</span>' : esc(v) + ' <span class="rh-badge">' + UNC + '</span>'));
  const srcCell = r => '<ul class="rh-src">' + r.sources.map(s => '<li>' + (s.u ? '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + '</a>' : esc(s.t)) + '</li>').join('') + '</ul>';
  const newsCell = r => { const n = newsFor(r); return n.length ? '<ul class="rh-news">' + n.map(e => '<li><span class="rh-newsdate">' + esc(e.date) + '</span> ' + esc(e.label) + ' <a href="' + esc(e.url) + '" target="_blank" rel="noopener" aria-label="Source for ' + esc(e.label) + ', ' + esc(r.name) + '">Source</a></li>').join('') + '</ul>' : '<span class="rh-dash" aria-label="None">&ndash;</span>'; };
  const chip = s => '<span class="rh-chip rh-' + s.toLowerCase().replace(/\s+/g, '') + '">' + esc(s) + '</span>';
  const originCell = r => r.origin === UNC ? '<span class="rh-badge">' + UNC + '</span>' : esc(r.origin);

  function render() {
    const st = $('rhStatus').value, og = originSel.value, q = squash($('rhSearch').value);
    const rows = H.rows.filter(r => (!st || r.status === st) && (!og || r.origin === og) && (!q || squash([r.name, r.location, r.collection, r.origin, r.notes].join(' ')).includes(q)));
    const val = r => sortKey === 'added' ? dateKey(r.added) : sortKey === 'removed' ? (r.removed ? dateKey(r.removed) : 99999999 + 2) : String(r[sortKey] || '').toLowerCase();
    rows.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sortDir || a.name.localeCompare(b.name); });
    view.querySelector('tbody').innerHTML = rows.map(r =>
      '<tr><th scope="row" class="rh-name">' + esc(r.name) + '<span class="rh-loc">' + esc(r.location) + '</span></th><td>' + esc(r.collection) + '</td><td>' + chip(r.status) + '</td><td>' + originCell(r) + '</td><td>' + dateCell(r.added, r.addedVerified) + '</td><td>' + dateCell(r.status === 'Departed' ? r.removed : '', r.removedVerified) + '</td><td>' + newsCell(r) + '</td><td class="rh-notes">' + esc(r.notes) + '</td><td>' + srcCell(r) + '</td></tr>').join('') ||
      '<tr><td colspan="9" class="rh-empty">No resorts match. Clear the search or choose All Statuses and All Origins.</td></tr>';
    $('rhCount').textContent = 'Showing ' + rows.length + ' of ' + H.rows.length;
    head.querySelectorAll('th[data-k]').forEach(th => { const on = th.dataset.k === sortKey; th.setAttribute('aria-sort', on ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'); th.querySelector('.rh-arrow').textContent = on ? (sortDir > 0 ? ' ▲' : ' ▼') : ''; });
  }
  head.addEventListener('click', e => { const th = e.target.closest('th[data-k]'); if (!th) return; const k = th.dataset.k; if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; } render(); });
  ['rhStatus', 'rhOrigin'].forEach(id => $(id).addEventListener('change', render));
  $('rhSearch').addEventListener('input', render);
  render();

  let active = false;
  function show() {
    active = true;
    view.hidden = false; findView.hidden = true; savedView.hidden = true;
    tab.setAttribute('aria-pressed', 'true'); findTab.setAttribute('aria-pressed', 'false'); savedTab.setAttribute('aria-pressed', 'false');
  }
  function leave() { if (!active) return; active = false; view.hidden = true; tab.setAttribute('aria-pressed', 'false'); }
  tab.addEventListener('click', show);
  // planner.js shows its own views when its tabs are used; hide ours then.
  const watch = new MutationObserver(() => { if (active && (!findView.hidden || !savedView.hidden)) leave(); });
  watch.observe(findView, { attributes: true, attributeFilter: ['hidden'] });
  watch.observe(savedView, { attributes: true, attributeFilter: ['hidden'] });
  const wantsHistory = location.hash === '#history';
  if (wantsHistory) show();
}

// ---- "Experiences on the App" filter on Find a Stay ----
const exp = $('expFilter'), results = $('planResults'), msg = $('expMessage');
if (exp && results && msg) {
  const expNews = NEWS.filter(n => n.label === 'Experiences on the App');
  const chartIds = new Set(expNews.flatMap(n => n.ids || []));
  const resortIds = new Set(((window.DIRECTORY && window.DIRECTORY.rows) || []).filter(r => chartIds.has(r.id)).map(r => r.resort_id));
  const rowResort = new Map(((window.WEEKLY_POINTS && window.WEEKLY_POINTS.rows) || []).map(r => [r.id, r.resort_id]));
  function apply() {
    const cards = [...results.querySelectorAll('.trip-candidate')];
    if (!exp.checked) { cards.forEach(c => { c.hidden = false; }); msg.textContent = ''; return; }
    let shown = 0;
    cards.forEach(c => { const b = c.querySelector('[data-landscape]'); const ok = b && resortIds.has(rowResort.get(b.dataset.landscape)); c.hidden = !ok; if (ok) shown++; });
    msg.textContent = 'Showing ' + shown + ' of ' + cards.length + ' options at resorts with Experiences on the App.' + (shown ? '' : ' None of these resorts are in this search. Clear the filter or widen the search.');
  }
  exp.addEventListener('change', apply);
  new MutationObserver(apply).observe(results, { childList: true });
  apply();
}
})();
