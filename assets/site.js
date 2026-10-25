/* Your Timeshare Guide: shared page frame.
   Every page has <div id="site-header"></div> and <div id="site-footer"></div> and loads this file last.
   This script draws the masthead (logo 21), the folder tabs and the footer with the Important Notice,
   marks the current tab from <body data-tab="...">, runs the phone Menu grid, and makes folder links
   work when a page is opened straight from disk (file://) by adding index.html.
   It also shares small helpers on window.YTG (dates, Club Wyndham week numbers, directory citations). */
(function () {
  "use strict";

  // Root of the site, worked out from this script's own address, so pages work from a server and from disk.
  var me = document.currentScript || document.querySelector('script[src$="assets/site.js"]');
  var ROOT = me ? me.src.replace(/assets\/site\.js(\?.*)?$/, "") : "./";
  var FILE = location.protocol === "file:";

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAY = 864e5;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // Owner rule: dates on new pages are written mm/dd/yy.
  function mdy(d) { return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + String(d.getFullYear()).slice(2); }
  function longDate(d) { return DAYS[d.getDay()] + ", " + MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear(); }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  // Whole calendar months, same day of month, clamped to the month's end (26/27 Directory - Page 275).
  function addMonths(d, n) {
    var y = d.getFullYear(), m = d.getMonth() + n, day = d.getDate();
    var last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, last));
  }
  // Club Wyndham (RCI) week numbers: week 1 starts on the first Friday of January; week 53 exists when December 31 is a Friday.
  function firstFriday(y) { var d = new Date(y, 0, 1); return new Date(y, 0, 1 + ((5 - d.getDay() + 7) % 7)); }
  function weeksIn(y) { return new Date(y, 11, 31).getDay() === 5 ? 53 : 52; }
  function weekOf(date) {
    var y = date.getFullYear(), f = firstFriday(y);
    if (date < f) { y -= 1; f = firstFriday(y); }
    var w = Math.floor(Math.round((date - f) / DAY) / 7) + 1;
    if (w > weeksIn(y)) { y += 1; w = 1; f = firstFriday(y); }
    return { year: y, week: w, start: addDays(f, (w - 1) * 7), end: addDays(f, (w - 1) * 7 + 6), of: weeksIn(y) };
  }
  // Directory citations: "Source: 26/27 Directory - Page 241" (printed book page); only "26/27 Directory - Page 241" is the link, to the 2026/2027 online flip-book (URL uses book page + 4). bare = true drops the "Source: " label.
  var DIRECTORY = "https://media.travelandleisure.com/WD/email/2025/0625-2025/cw-directory/index.html";
  function cite(book, cw, bare) {
    cw = cw || book + 4;
    return (bare ? "" : "Source: ") + '<a href="' + DIRECTORY + '#p=' + cw + '" target="_blank" rel="noopener" title="Open the 2026/2027 Member\'s Directory online">26/27 Directory - Page ' + book + "</a>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  var LOGO_SVG = '<svg class="logo-mk" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g style="stroke:var(--g);stroke-width:2.6;stroke-linecap:round"><line x1="32" y1="6" x2="32" y2="12"/><line x1="17.5" y1="12.5" x2="21" y2="16.5"/><line x1="46.5" y1="12.5" x2="43" y2="16.5"/><line x1="8.6" y1="22.6" x2="13.4" y2="24.9"/><line x1="55.4" y1="22.6" x2="50.6" y2="24.9"/></g><path d="M20 35a12 12 0 0 1 24 0z" style="fill:var(--g)"/><path d="M2 35C12 31.5 22 32.5 30.5 37.5V58C22 53 12 52 2 55Z" style="fill:var(--k)"/><path d="M62 35C52 31.5 42 32.5 33.5 37.5V58C42 53 52 52 62 55Z" style="fill:var(--k)"/><g style="fill:none;stroke:var(--p);stroke-width:.9;opacity:.85"><path d="M18 40.4C20.97 39.7 23.94 40.4 27 41.7"/><path d="M18 43.6C20.97 42.9 23.94 43.6 27 44.9"/><path d="M18 46.8C20.97 46.1 23.94 46.8 27 48.1"/><path d="M6 50.6C13 48.4 20 49.1 27 52.4"/><path d="M58 39.5C51 37.3 44 38 37 41.3"/><path d="M58 43.2C51 41 44 41.7 37 45"/><path d="M46 48.2C43.03 47.5 40.06 48.2 37 49.5"/><path d="M46 51.4C43.03 50.7 40.06 51.4 37 52.7"/></g><rect x="6" y="38.6" width="10" height="7.4" style="fill:var(--p)"/><path d="M6.6 45.4L9.6 41.6L11.6 43.6L13 42.3L15.4 45.4Z" style="fill:var(--k)"/><circle cx="13.4" cy="40.6" r="1" style="fill:var(--g)"/><rect x="48" y="45.6" width="10" height="7.4" style="fill:var(--p)"/><path d="M48.4 52.2C50.5 51.2 52.5 51.2 54.6 52.2C56 52.9 57 52.7 57.6 52.4" style="fill:none;stroke:var(--g);stroke-width:.8"/><path d="M53.6 52C53.4 50 53.6 48.6 54.4 47.6" style="fill:none;stroke:var(--k);stroke-width:.8;stroke-linecap:round"/><path d="M54.4 47.6C53.2 47.1 51.9 47.5 51.2 48.4M54.4 47.6C55.6 47 56.9 47.4 57.4 48.3M54.4 47.6C54 46.6 53 46.2 52.2 46.4M54.4 47.6C55 46.6 56 46.3 56.8 46.6" style="fill:none;stroke:var(--k);stroke-width:.75;stroke-linecap:round"/></svg>';

  // The ten folder tabs. "ws" tabs (Planning, Claude, Credits) sit at the far right.
  var TABS = [
    { id: "home", t: "Home", href: "" },
    { id: "planastay", t: "Plan a Stay", href: "planastay/" },
    { id: "costsandfees", t: "Costs and Fees", href: "costsandfees/" },
    { id: "ownerbenefits", t: "Owner Benefits", href: "ownerbenefits/" },
    { id: "resortsandnews", t: "Resorts and News", href: "resortsandnews/" },
    { id: "factsandhelp", t: "Facts and Help", href: "factsandhelp/" },
    { id: "resources", t: "Resources", href: "resources/" },
    { id: "planning", t: "Planning", href: "planning/", ws: true },
    { id: "claude", t: "Claude", href: "claude/", ws: true },
    { id: "credits", t: "Credits", href: "credits/", ws: true }
  ];
  var FOOT_LINKS = [["About", "about/"], ["Contact", "contact/"], ["Privacy", "privacy/"], ["Terms of Use", "terms/"], ["Site Map", "sitemap/"]];

  // The live site (owner, 2026-10-24) shows only its finished pages: Home, 52 Weeks, Knight Move and Contact.
  // The full workshop tabs stay on the local preview (port 8099) and when a page is opened from disk.
  var LIVE = !FILE && location.port !== "8099";
  if (LIVE) {
    TABS = [
      { id: "home", t: "Home", href: "" },
      { id: "52weeks", t: "52 Weeks", href: "52weeks/" },
      { id: "cancelknight", t: "Knight Move", href: "cancelknight/" },
      { id: "contact", t: "Contact", href: "contact/" }
    ];
    FOOT_LINKS = [["Contact", "contact/"]];
  }

  var current = LIVE ? (location.pathname.split("/")[1] || "home").toLowerCase() : (document.body.getAttribute("data-tab") || "").toLowerCase();
  // Club Wyndham runs on Eastern Time (owner, 2026-10-25), so the masthead's date, week and clock are Eastern.
  function eastern() {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: new Date(+p.year, +p.month - 1, +p.day), time: p.hour + ":" + p.minute + " " + p.dayPeriod };
  }
  var et = eastern(), now = today(), wk = weekOf(et.date);

  function header() {
    var cur = TABS.filter(function (t) { return t.id === current; })[0];
    var lis = TABS.map(function (t, i) {
      var cls = t.ws ? (TABS[i - 1] && !TABS[i - 1].ws ? "ws ws-first" : "ws") : "";
      return '<li' + (cls ? ' class="' + cls + '"' : "") + '><a href="' + ROOT + t.href + '"' + (t.id === current ? ' aria-current="page"' : "") + ">" + t.t + "</a></li>";
    }).join("");
    return '<a class="skip" href="#main">Skip to Content</a>'
      + '<header class="mast">'
      + '<div class="wrap mast-top">'
      + '<div class="mast-side left"></div>'
      + '<a href="' + ROOT + '" class="logo" aria-label="Your Timeshare Guide, Home">' + LOGO_SVG + '<span class="logo-your">Your</span><span class="logo-main">Timeshare Guide</span></a>'
      + '<div class="mast-side right"><span class="ts-t">Today:</span> <span class="ts-d">' + longDate(et.date) + '</span><span class="ts-w">Week ' + wk.week + '</span>'
      + '<span class="ts-e" title="Club Wyndham runs on Eastern Time"><span class="ts-t">Eastern Time:</span> <span id="etClock">' + et.time + '</span></span>'
      + (LIVE ? "" : '<div class="search"><a href="' + ROOT + 'sitemap/"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Search the Guide</a></div>') + '</div>'
      + '<p class="logo-tag">Charts, Calculators and Resources for Club Wyndham and WorldMark Owners</p>'
      + '</div>'
      + '<nav class="nav" id="nav" aria-label="Main">'
      + '<div class="wrap nav-row">'
      + '<div class="nav-top"><button class="menu-btn" type="button" aria-expanded="false" aria-controls="navlist" id="menuBtn"><span class="bars"></span> Menu</button>'
      + (cur ? '<span class="menu-here">' + cur.t + '</span>' : "") + '</div>'
      + '<ul id="navlist">' + lis + '</ul>'
      + '</div></nav></header>';
  }

  function footer() {
    return '<footer class="site-foot"><div class="wrap foot">'
      + '<div class="foot-top">'
      + '<a href="' + ROOT + '" class="logo foot-logo" aria-label="Your Timeshare Guide, Home">' + LOGO_SVG + '<span class="logo-your">Your</span><span class="logo-main">Timeshare Guide</span></a>'
      + '<p class="foot-tag">Charts, calculators and resources to help you plan your next stay and get the most from the points you already own.</p>'
      + '<ul>' + FOOT_LINKS.map(function (l) { return '<li><a href="' + ROOT + l[1] + '">' + l[0] + "</a></li>"; }).join("") + "</ul>"
      + "</div>"
      + '<section class="notice" aria-labelledby="notice-h"><h2 id="notice-h">Important Notice</h2><div class="notice-lines">'
      + "<p><b>No Bookings Here.</b> This site is for information only. To book or change a reservation, use your official owner account or contact Club Wyndham.</p>"
      + "<p><b>Confirm Before You Decide.</b> Information can change and errors can happen. Check the current Member's Directory, the official owner website and your contract before making any decisions. Use this information at your own discretion. Your Timeshare Guide is not responsible for any loss or cost that results from relying on it.</p>"
      + "<p><b>Independent and Unofficial.</b> Not affiliated with or endorsed by Club Wyndham, WorldMark, RCI, Travel + Leisure Co. or Wyndham Destinations. Trademarks belong to their owners. Nothing here is legal, financial or tax advice.</p>"
      + "</div></section>"
      + '<div class="copy">&copy; ' + now.getFullYear() + ' Your Timeshare Guide' + (LIVE ? "" : ' &nbsp;&middot;&nbsp; <a href="' + ROOT + 'terms/">Terms of Use</a>') + '</div>'
      + "</div></footer>";
  }

  var h = document.getElementById("site-header"), f = document.getElementById("site-footer");
  if (h) h.outerHTML = header();
  if (f) f.outerHTML = footer();
  // Visitor counter (owner, 2026-10-24): GoatCounter (site code dagoat) counts visits on the live site only, after the page
  // has loaded. The home page footer shows the site's total once GoatCounter has a number to give.
  if (location.hostname === "yourtimeshareguide.com") addEventListener("load", function () {
    var gc = document.createElement("script");
    gc.async = true; gc.src = "https://gc.zgo.at/count.js"; gc.setAttribute("data-goatcounter", "https://dagoat.goatcounter.com/count");
    document.body.appendChild(gc);
    var copy = document.querySelector(".site-foot .copy");
    if (current !== "home" || !copy) return;
    fetch("https://dagoat.goatcounter.com/counter/TOTAL.json")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.count && d.count !== "0") copy.insertAdjacentHTML("beforeend", " &nbsp;&middot;&nbsp; Visitors: " + esc(d.count)); })
      .catch(function () {});
  });

  var clock = document.getElementById("etClock");
  if (clock) setInterval(function () { clock.textContent = eastern().time; }, 15000);

  var main = document.querySelector("main");
  if (main && !main.id) main.id = "main";

  // Phone and tablet: the Menu button opens the grid of squares
  var nav = document.getElementById("nav"), btn = document.getElementById("menuBtn");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var o = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", o ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
  }

  // Opened from disk: folder links (ending in /) need index.html, or the browser shows a folder listing.
  function fixLinks(scope) {
    if (!FILE) return;
    (scope || document).querySelectorAll("a[href]").forEach(function (a) {
      var raw = a.getAttribute("href");
      if (!raw || /^(https?:|mailto:|tel:|#|javascript:)/i.test(raw)) return;
      try {
        var u = new URL(raw, location.href);
        if (u.protocol === "file:" && /\/$/.test(u.pathname)) { u.pathname += "index.html"; a.setAttribute("href", u.href); }
      } catch (e) { /* leave it */ }
    });
  }
  fixLinks();
  if (FILE && window.MutationObserver) {
    new MutationObserver(function (list) {
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.matches && n.matches("a[href]")) fixLinks(n.parentNode); else fixLinks(n); } }); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Files outside the new site (the live site and the planning folder) for the Planning and Claude lists.
  // From the local server: /_live/ is C:\AllFiles\Claude\Website and /_plan/ is the planning folder (see tools/serve.mjs).
  // From disk: plain relative paths up to C:\AllFiles\Claude.
  function outside(path) {
    if (!path) return "";
    var enc = path.split("/").map(encodeURIComponent).join("/");
    if (/^NewSite\//.test(path)) return ROOT + enc.replace(/^NewSite\//, "").replace(/index\.html$/, "");
    if (FILE) return ROOT + "../" + enc;
    if (/^Website\//.test(path)) return "/_live/" + enc.replace(/^Website\/(_site\/)?/, "");
    if (/^yourtimeshareguide-planning\//.test(path)) return "/_plan/" + enc.replace(/^yourtimeshareguide-planning\//, "");
    return "";
  }

  // ---- Owner's "Archive This Page" checkbox (workshop only; remove before launch) ----
  // Saved with the Planning and Claude Keep/Archive choices: data/planning-choices.json through tools/serve.mjs
  // (also through the private share link, tools/share.mjs), mirrored in localStorage. Ids look like "NewSite/fees/index.html".
  var CH_KEY = "ytg-planning-choices", CH_API = ROOT + "api/planning-choices";
  function chLocal() { try { return JSON.parse(localStorage.getItem(CH_KEY) || "null") || { choices: [] }; } catch (e) { return { choices: [] }; } }
  function chLoad(done) {
    if (FILE || !window.fetch) return done(chLocal(), false);
    fetch(CH_API, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (o) { done(o && o.exists ? o : chLocal(), !!o); })
      .catch(function () { done(chLocal(), false); });
  }
  function chSave(id, name, choice, done) {
    chLoad(function (o) {
      var list = (o.choices || []).filter(function (c) { return c.id !== id; });
      list.push({ id: id, name: name, choice: choice, updated: new Date().toISOString() });
      var body = { saved: new Date().toISOString(), choices: list };
      try { localStorage.setItem(CH_KEY, JSON.stringify(body)); } catch (e) { /* storage blocked */ }
      if (FILE || !window.fetch) return done(false);
      fetch(CH_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { done(r.ok); }).catch(function () { done(false); });
    });
  }
  function pageId() {
    var rel = decodeURIComponent(location.href.split(/[?#]/)[0]).replace(decodeURIComponent(ROOT), "").replace(/index\.html$/, "");
    return "NewSite/" + rel + "index.html";
  }
  function archiveBox() {
    var foot = document.querySelector(".site-foot");
    if (!foot || current === "planning" || current === "claude") return;
    var id = pageId(), name = (document.querySelector("h1") || {}).textContent || document.title;
    var outer = document.createElement("div"), box = document.createElement("div");
    outer.className = "wrap"; box.className = "arch-box"; outer.appendChild(box);
    box.innerHTML = '<label><input type="checkbox"> Archive This Page</label><span class="arch-state" aria-live="polite"></span>'
      + '<span class="arch-note">Only you see this while the site is being built. Marked pages are listed on the <a href="' + ROOT + 'planning/#marked">Planning</a> tab.</span>';
    foot.parentNode.insertBefore(outer, foot);
    var cb = box.querySelector("input"), st = box.querySelector(".arch-state");
    chLoad(function (o) {
      (o.choices || []).forEach(function (c) { if (c.id === id) cb.checked = c.choice === "Archive"; });
      box.classList.toggle("on", cb.checked);
    });
    cb.addEventListener("change", function () {
      box.classList.toggle("on", cb.checked);
      st.textContent = "Saving";
      chSave(id, name.trim(), cb.checked ? "Archive" : "Not Decided", function (ok) { st.textContent = ok ? "Saved" : "Saved on This Device Only"; });
    });
  }
  // Planning tab: the new site's pages marked with that checkbox
  function markedList() {
    var spot = document.getElementById("marked");
    if (!spot) return;
    chLoad(function (o) {
      var rows = (o.choices || []).filter(function (c) { return /^NewSite\//.test(c.id) && c.choice === "Archive"; });
      spot.innerHTML = '<h2 class="sub-head">New Site Pages You Marked Archive</h2>'
        + (rows.length ? "<ul>" + rows.map(function (c) {
          return '<li><a href="' + ROOT + esc(c.id.replace(/^NewSite\//, "").replace(/index\.html$/, "")) + '">' + esc(c.name) + "</a> <span class=\"cite\">Marked " + mdy(new Date(c.updated)) + "</span></li>";
        }).join("") + "</ul>" : '<p class="cite">None yet. Select "Archive This Page" at the bottom of any page to add it here.</p>');
      fixLinks(spot);
    });
  }
  if (!LIVE) archiveBox();
  markedList();

  window.YTG = Object.assign(window.YTG || {}, { root: ROOT, file: FILE, mdy: mdy, longDate: longDate, today: today, addDays: addDays, addMonths: addMonths,
    weekOf: weekOf, firstFriday: firstFriday, weeksIn: weeksIn, cite: cite, directory: DIRECTORY, esc: esc, fixLinks: fixLinks, outside: outside, MONTHS: MONTHS });
})();
