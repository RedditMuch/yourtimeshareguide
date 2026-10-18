'use strict';
// Filters the Club Wyndham Access list (cwaresorts.njk). Search by name, city, state, or
// distance from a city or state. Row numbers stay fixed so a filtered list keeps its numbers.
(() => {
  const $ = id => document.getElementById(id);
  const rows = [...document.querySelectorAll('#cwa-table tbody tr')];
  const total = rows.length;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const LABELS = { name: 'Resort Name', city: 'City', state: 'State or Province', radius: 'City or State' };
  const by = $('cwa-by'), q = $('cwa-q'), radius = $('cwa-radius');

  // A state's position is the middle of the list's resorts in it (geo-data.js holds cities only).
  const stateCenter = query => {
    const n = norm(query);
    const hits = rows.filter(r => norm(r.dataset.state) === n || norm(r.dataset.code) === n);
    const pts = hits.map(r => window.ResortGeo && ResortGeo.point({ resort_id: r.dataset.id })).filter(p => p && Number.isFinite(p.lat));
    if (!pts.length) return null;
    return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
  };
  const center = query => stateCenter(query) || (window.ResortGeo && ResortGeo.resolve(query));

  function apply() {
    const mode = by.value, text = norm(q.value);
    $('cwa-q-label').textContent = LABELS[mode];
    $('cwa-radius-field').hidden = mode !== 'radius';
    let msg = '', c = null;
    if (mode === 'radius' && text) {
      c = center(q.value);
      if (!c) msg = 'That place is not in the list. Pick a city from the suggestions, or enter a state.';
    }
    let shown = 0;
    for (const r of rows) {
      let ok = true;
      if (text) {
        if (mode === 'name') ok = norm(r.dataset.name).includes(text);
        else if (mode === 'city') ok = norm(r.dataset.city).includes(text);
        else if (mode === 'state') ok = [r.dataset.state, r.dataset.code, r.dataset.country].some(v => norm(v).startsWith(text) || norm(v) === text);
        else if (c) { const d = ResortGeo.distance({ resort_id: r.dataset.id }, c); ok = d !== null && d <= Number(radius.value); }
        else ok = false;
      }
      r.hidden = !ok;
      if (ok) shown++;
    }
    $('cwa-count').textContent = shown + ' of ' + total + ' resorts';
    $('cwa-message').textContent = msg || (shown ? '' : 'No resorts match.');
  }

  const fill = () => { if (window.ResortGeo) $('cwa-places').innerHTML = by.value === 'radius' ? ResortGeo.options() : ''; };
  by.addEventListener('change', () => { fill(); apply(); });
  q.addEventListener('input', apply);
  radius.addEventListener('change', apply);
  $('cwa-search').addEventListener('reset', () => setTimeout(() => { fill(); apply(); }));
  apply();
})();
