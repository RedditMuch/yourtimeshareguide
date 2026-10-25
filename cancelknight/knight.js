/* The Cancellation Knight Move: the calendar as a chess board. Last day to cancel = check-in minus 15 days
   (26/27 Directory - Page 281; data/reservation-timeline.js rule "cancel-deadline", at {days: 15}). */
(function () {
  "use strict";
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var CANCEL_DAYS = 15, ROWS = 4;
  // How long each step stays on screen, long enough to read its caption (slowed 2026-10-23)
  var WAIT = { 1: 1800, 2: 2200, 3: 1600, 4: 2600 };
  // Quick extra examples after the first one, as squares on the board (for a Monday 12/21 check-in: the 16th, 25th, 20th, 13th)
  var DEMO = [{ r: 2, c: 3 }, { r: 3, c: 5 }, { r: 3, c: 0 }, { r: 2, c: 0 }];
  var demo = null, PLAY = "Watch the Knight Move";
  var chosen = false;   // false until a full check-in date is entered; the board then shows an example date
  var Y = null, ci = null, target = null, rowStart = [];
  var step = 0, sub = 0, timer = null, hop = null, playing = false;
  var q = new URLSearchParams(location.search);
  var frameMode = q.has("frame");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mdy(d) { return Y.mdy(d); }
  function parse(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if (!m) return null; var d = new Date(2000, +m[2] - 1, +m[3]); d.setFullYear(+m[1]); return d; }   // setFullYear keeps a typed year like 0019 as is (new Date would make it 1919)
  function long(d) { return pad(d.getMonth() + 1) + "/" + pad(d.getDate()) + "/" + d.getFullYear(); }
  // A typed check-in date: m/d/yy or mm/dd/yyyy. Two digit years mean 2000 to 2099; four digit years from 1900 to 2199
  function typed(v) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec((v || "").trim()); if (!m) return null;
    var y = m[3].length === 2 ? 2000 + +m[3] : +m[3], d = new Date(2000, +m[1] - 1, +m[2]); d.setFullYear(y);
    return y >= 1900 && y <= 2199 && d.getMonth() === +m[1] - 1 && d.getDate() === +m[2] ? d : null;   // rejects 02/30 and the like
  }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  // A usable check-in date: two digit years (00 to 99) mean 2000 to 2099; four digit years from 1900 to 2199 count as typed
  function full(d) {
    if (!d) return null;
    var y = d.getFullYear();
    if (y < 100) { d = new Date(d); d.setFullYear(2000 + y); return d; }
    return y >= 1900 && y <= 2199 ? d : null;
  }
  function same(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  // Knight positions as {r: row 0..2, c: -1 (grey edge) .. 6}
  // The check-in square: the chosen date (bottom row), or one of the quick examples while it plays
  function home() { return demo || { r: ROWS - 1, c: ci.getDay() }; }
  function posFor(s) {
    var h = home(), cr = h.r, cc = h.c;
    return [null, { r: cr, c: cc }, { r: cr - 1, c: cc }, { r: cr - 2, c: cc }, { r: cr - 2, c: cc - 1 }][s];
  }
  function cell(p) { return $("kn-board").querySelector('[data-r="' + p.r + '"][data-c="' + p.c + '"]'); }
  function dateAt(p) { return Y.addDays(rowStart[p.r], p.c); }
  function mark() {
    var old = $("kn-board").querySelectorAll(".chk,.land");
    for (var i = 0; i < old.length; i++) old[i].classList.remove("chk", "land");
    if (chosen || demo) cell(posFor(1)).classList.add("chk");   // no check-in square until a date is entered
  }
  function unDemo() { if (demo) { demo = null; mark(); } }

  function build() {
    // With a date: the check-in week is the bottom row. Without one: the current week is the top row
    var t0 = Y.today(), start = chosen ? Y.addDays(ci, -ci.getDay()) : Y.addDays(t0, -t0.getDay() + (ROWS - 1) * 7);
    rowStart = [];
    for (var i = 0; i < ROWS; i++) rowStart.push(Y.addDays(start, (i - (ROWS - 1)) * 7));
    target = Y.addDays(ci, -CANCEL_DAYS);
    var h = '<div class="kn-h">Week Of</div><div class="kn-h edge">Saturday From the Week Before</div>';
    DAYS.forEach(function (d) { h += '<div class="kn-h"><span class="long">' + d + '</span><span class="short">' + d.slice(0, 3) + '</span></div>'; });
    var cells = "";
    rowStart.forEach(function (s, r) {
      cells += '<div class="kn-lab">Week of ' + mdy(s) + "</div>";
      for (var c = -1; c < 7; c++) {
        var d = Y.addDays(s, c);                       // c = -1 is the Saturday just before this row
        var cls = c < 0 ? "gr" : ((r + c) % 2 ? "dk" : "lt");
        var lab = c < 0 ? "Saturday " + mdy(d) : (chosen && r === ROWS - 1 && c === ci.getDay() ? "Check-in " : "") + mdy(d);
        cells += '<div class="kn-c ' + cls + '" data-r="' + r + '" data-c="' + c + '" role="img" aria-label="' + lab + '">' +
          '<span class="kn-n">' + d.getDate() + "</span>" + (d.getDate() === 1 ? '<span class="kn-m">' + pad(d.getMonth() + 1) + "/01</span>" : "") + "</div>";
      }
    });
    $("kn-board").innerHTML = h + cells;
    mark();
    $("kn-board").setAttribute("role", "group");
    $("kn-board").setAttribute("aria-label", "Calendar for the four weeks ending with the check-in week");
    // text version
    $("kn-result").innerHTML = chosen ? "<b>" + DAYS[target.getDay()] + " " + (target.getFullYear() < 2000 || target.getFullYear() > 2099 ? long(target) : mdy(target)) + "</b><span>by 11:59 p.m. Eastern</span>" : '<span class="kn-none">Choose a Check-In Date</span>';
    $("kn-sub").textContent = chosen ? "Check-in " + mdy(ci) + ", minus 15 days, is " + mdy(target) + "." : "Enter a check-in date to see your own dates.";
    $("kn-steps").innerHTML = !chosen ?
      "<li>Find your check-in date on the calendar and put your knight on it.</li>" +
      "<li>Move the knight up two rows. That is 14 days earlier.</li>" +
      "<li>Move it one square to the left. That is one more day. A Sunday check-in steps off the board into the grey edge, which holds the Saturday before.</li>" +
      "<li>That square is your last day to cancel and get your points back, by 11:59 p.m. ET.</li>" :
      "<li>Find " + mdy(ci) + " on the calendar and put your knight on it. This is your check-in day.</li>" +
      "<li>Move the knight up two rows. That is 14 days earlier: " + mdy(Y.addDays(ci, -14)) + ".</li>" +
      "<li>Move it one square to the left. That is one more day: " + mdy(target) + "." +
      (ci.getDay() === 0 ? " Your check-in day is the first square of its row, so the knight steps off the board into the grey edge, which holds the day before that row starts." : "") + "</li>" +
      "<li>Your last day to cancel and get your points back is <strong>" + mdy(target) + "</strong>, by 11:59 p.m. ET.</li>";
    $("kn-cite").innerHTML = '<span class="kn-src-h">Sources:</span>' + Y.cite(281, 285, true) + "<br>" + Y.cite(282, 286, true);
  }

  function caption(s) {
    return [
      chosen ? "Your Check-In Week Is the Bottom Row" : "Choose Your Check-In Date Above",
      "1. Put Your Knight on Check-In Day",
      "2. Up Two Rows (14 Days Earlier)",
      "3. Left One Square (One More Day)",
      "4. This Is Your Last Day to Cancel: <b>" + mdy(target) + "</b> by 11:59 p.m. ET"
    ][s];
  }

  function place(s, instant) {
    var k = $("kn-knight"), wrap = $("kn-wrap");
    if (!s) { k.classList.remove("on"); return; }
    var c = cell(posFor(s)); if (!c) return;
    var w = wrap.getBoundingClientRect(), r = c.getBoundingClientRect();
    var size = Math.max(26, Math.min(r.width, r.height) * 0.52);
    k.style.setProperty("--kz", size + "px");
    if (instant) { var t = k.style.transition; k.style.transition = "none"; }
    k.style.left = (r.left - w.left + r.width / 2) + "px";
    k.style.top = (r.top - w.top + r.height / 2) + "px";
    k.classList.add("on");
    if (instant) { void k.offsetWidth; k.style.transition = t || ""; }
  }

  function drawPath(s) {
    var svg = $("kn-path"), wrap = $("kn-wrap"), w = wrap.getBoundingClientRect(), d = "";
    function ctr(p) { var r = cell(p).getBoundingClientRect(); return [r.left - w.left + r.width / 2, r.top - w.top + r.height / 2]; }
    if (s >= 3) { var a = ctr(posFor(1)), b = ctr(posFor(3)); d = "M" + a[0] + " " + a[1] + " L" + b[0] + " " + b[1]; }
    if (s >= 4) { var e = ctr(posFor(4)); d += " L" + e[0] + " " + e[1]; }
    svg.innerHTML = d ? '<path d="' + d + '"/>' : "";
  }

  function paint(instant) {
    var li = $("kn-steps").children;   // light up the matching step in the list beside the board
    for (var i = 0; i < li.length; i++) li[i].classList.toggle("on", i === step - 1);
    $("kn-cap").innerHTML = caption(step);
    var last = $("kn-board").querySelector(".land");
    if (last) last.classList.remove("land");
    var fin = [0, 1, 3, 4, 4][step];
    clearTimeout(hop);
    if (!instant && !reduce && sub === 1 && fin === 3) {
      sub = 2; place(2, false);
      hop = setTimeout(function () { sub = 3; place(3, false); drawPath(3); }, 400);
    } else {
      sub = fin; place(sub, true); drawPath(sub);
    }
    if (step === 4) cell(posFor(4)).classList.add("land");
  }
  function go(n, instant) { step = Math.max(0, Math.min(4, n)); paint(instant); }
  function stop() { playing = false; clearTimeout(timer); clearTimeout(hop); $("kn-play").textContent = PLAY; }
  // The steps still to show for the chosen date, then the quick examples, then back to the chosen date
  function plan() {
    var L = [];
    for (var s = step + 1; s <= 4; s++) L.push([go.bind(null, s, false), WAIT[s]]);
    DEMO.filter(function (p) { return !(p.r === ROWS - 1 && p.c === ci.getDay()); }).forEach(function (p) {
      var d = dateAt(p), t = Y.addDays(d, -CANCEL_DAYS);
      L.push([function () { demo = p; mark(); $("kn-path").innerHTML = ""; place(1, true); $("kn-cap").innerHTML = "Another One: Check-In <b>" + mdy(d) + "</b>"; }, 1300]);
      L.push([function () { place(3, false); drawPath(3); }, 1100]);
      L.push([function () { place(4, false); drawPath(4); cell(posFor(4)).classList.add("land"); $("kn-cap").innerHTML = "Check-In " + mdy(d) + " &rarr; Last Day to Cancel <b>" + mdy(t) + "</b>"; }, 2400]);
    });
    L.push([function () { demo = null; mark(); go(4, true); stop(); }, 0]);
    return L;
  }
  function play() {
    if (demo || step >= 4) { demo = null; mark(); go(0, true); }
    playing = true; $("kn-play").textContent = "Playing the Knight Move";
    var L = plan(), i = 0;
    clearTimeout(timer);
    timer = setTimeout(function nx() { if (!playing || i >= L.length) return; var a = L[i++]; a[0](); timer = setTimeout(nx, a[1]); }, 300);
  }

  function setDate(d) {
    ci = d; stop(); build(); step = 0; sub = 0; paint(true);
  }

  // Smooth view for the explainer video: ?frame=1&p=0..3&g=0..1
  // p: 0-1 knight appears on check-in, 1-2 up two rows, 2-3 left one square; g = glow strength on the landing square
  function tween(p, g) {
    var wrap = $("kn-wrap"), w = wrap.getBoundingClientRect(), k = $("kn-knight");
    function ctr(s) { var r = cell(posFor(s)).getBoundingClientRect(); return { x: r.left - w.left + r.width / 2, y: r.top - w.top + r.height / 2, z: Math.min(r.width, r.height) * 0.52 }; }
    var a = ctr(1), b = ctr(3), c = ctr(4), x, y, t;
    if (p <= 1) { x = a.x; y = a.y; } else if (p <= 2) { t = p - 1; x = a.x; y = a.y + (b.y - a.y) * t; } else { t = Math.min(1, p - 2); x = b.x + (c.x - b.x) * t; y = b.y; }
    k.style.setProperty("--kz", Math.max(26, a.z) + "px");
    k.style.left = x + "px"; k.style.top = y + "px";
    k.style.opacity = Math.max(0, Math.min(1, p / 0.6)); k.classList.add("on");
    var s = p <= 1 ? 1 : p <= 2 ? 2 : p < 3 ? 3 : 4;
    $("kn-cap").innerHTML = caption(s);
    var d = "";
    if (p > 1) d = "M" + a.x + " " + a.y + " L" + a.x + " " + (p <= 2 ? y : b.y);
    if (p > 2) d += " L" + x + " " + y;
    var ft = document.getElementById("kn-vfoot");
    if (!ft) { ft = document.createElement("p"); ft.id = "kn-vfoot"; ft.className = "kn-vfoot"; $("kn-wrap").parentNode.appendChild(ft); }
    ft.innerHTML = "Check-In <b>" + mdy(ci) + "</b>" + (p >= 3 ? ' &nbsp;&rarr;&nbsp; Last Day to Cancel <b class="r">' + mdy(target) + "</b>" : "");
    $("kn-path").innerHTML = d ? '<path d="' + d + '"/>' : "";
    if (p >= 3) { var el0 = cell(posFor(4)); el0.classList.add("land"); el0.style.animation = "none"; }
    if (g > 0) {
      var el = cell(posFor(4)); el.classList.add("land"); el.style.animation = "none";
      el.style.boxShadow = "inset 0 0 0 4px #a8321f,0 0 " + Math.round(8 + 22 * g) + "px " + Math.round(3 + 12 * g) + "px rgba(255,213,74," + (0.55 + 0.4 * g).toFixed(2) + ")";
    }
  }


  // ---- Four month view: a plain running calendar. The knight travels from one check-in day to the next, flashes it,
  // jumps up two and left one, and shows "By 11:59 PM". A Sunday steps off the left edge, then an arrow takes it to the
  // Saturday at the end of the row above (a normal calendar has no Saturday to the left of Sunday).
  var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var k4 = { m0: null, end: null, timer: null, on: false, n: 0, last: null };
  function build4() {
    var box = $("kn4-months"); if (!box) return;
    var t = Y.today(), m0 = new Date(t.getFullYear(), t.getMonth(), 1), end = new Date(t.getFullYear(), t.getMonth() + 3, 0);
    var d = Y.addDays(m0, -m0.getDay()), last = Y.addDays(end, 6 - end.getDay()), h = "";
    DAYS.forEach(function (n) { h += '<div class="k4-h">' + n.slice(0, 3) + "</div>"; });
    for (; d <= last; d = Y.addDays(d, 1)) {
      var off = d < m0 || d > end;
      h += '<div class="k4-c' + (off ? " off" : d.getMonth() % 2 ? " m1" : "") + '" data-d="' + iso(d) + '"><span>' + (d.getDate() === 1 ? MN[d.getMonth()] + " 1" : d.getDate()) + "</span></div>";
    }
    box.innerHTML = h;
    $("kn4-knight").innerHTML = $("kn-knight").innerHTML;
    k4.m0 = m0; k4.end = end;
    $("kn4-cap").innerHTML = "Press Play to Watch the Knight Find Each Last Day to Cancel";
  }
  function c4(d) { return $("kn4-months").querySelector('[data-d="' + iso(d) + '"]'); }
  function ctr4(el) {
    var w = $("kn4-wrap").getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - w.left + r.width / 2, y: r.top - w.top + r.height / 2, w: r.width, h: r.height };
  }
  function move4(p, ms) {
    var k = $("kn4-knight");
    k.style.transition = ms ? "left " + ms + "ms ease-in-out,top " + ms + "ms ease-in-out,opacity .25s" : "none";
    k.style.setProperty("--kz", Math.max(20, Math.min(p.h * 0.5, 30)) + "px");
    k.style.left = (p.x + p.w * 0.22) + "px"; k.style.top = (p.y - p.h * 0.26) + "px"; k.classList.add("on");   // up and right, clear of the label
  }
  function erase4() {
    var all = $("kn4-months").querySelectorAll(".lin,.lout,.flash,.hl");
    for (var i = 0; i < all.length; i++) all[i].classList.remove("lin", "lout", "flash", "hl");
    $("kn4-ghost").hidden = true; $("kn4-path").innerHTML = "";
  }
  // A check-in day 20+ days into the range; every third one is a Sunday; not the same row as the last one
  function pick4() {
    var span = Math.round((k4.end - k4.m0) / 864e5) - 20, d, tries = 0;
    do {
      d = Y.addDays(k4.m0, 20 + Math.floor(Math.random() * span));
      if (k4.n % 3 === 1) d = Y.addDays(d, d.getDay() ? 7 - d.getDay() : 0);
      else if (!d.getDay()) d = Y.addDays(d, 1 + Math.floor(Math.random() * 6));
    } while ((d > k4.end || (k4.last && Math.abs(d - k4.last) < 12 * 864e5)) && ++tries < 50);
    k4.n++; k4.last = d;
    return d;
  }
  function day4(d) { return DAYS[d.getDay()] + " " + mdy(d); }
  // Dotted road map line between square centers (not the knight, which sits off center)
  function line4(a, b) { $("kn4-path").innerHTML += '<path d="M' + a.x + " " + a.y + " L" + b.x + " " + b.y + '"/>'; }
  function arrow4(a, b) {
    var mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 70;
    $("kn4-path").innerHTML += '<defs><marker id="k4-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>' +
      '<path class="k4-arrow" d="M' + a.x + " " + a.y + " Q" + mx + " " + my + " " + (b.x - b.w * 0.3) + " " + b.y + '" marker-end="url(#k4-ah)"/>';
  }
  // One example: light up the check-in day first so you can see where the knight is going, then the knight goes
  // there, jumps up two rows and left one, and the landing square says "Cancel by 11:59 PM"
  function example4() {
    var ci = pick4(), up = Y.addDays(ci, -14), to = Y.addDays(ci, -CANCEL_DAYS), sun = !ci.getDay();
    var a = c4(ci), b = c4(up), z = c4(to), L = [], first = !$("kn4-knight").classList.contains("on");
    L.push([function () { erase4(); a.classList.add("hl", "lin"); $("kn4-cap").innerHTML = "Next Check-In: <b>" + day4(ci) + "</b>"; }, first ? 500 : 700]);
    L.push([function () { move4(ctr4(a), first ? 0 : 650); }, first ? 400 : 850]);
    L.push([function () { move4(ctr4(b), 400); line4(ctr4(a), ctr4(b)); $("kn4-cap").innerHTML = "Up Two Rows: " + day4(up); }, 550]);
    if (sun) {
      L.push([function () {
        var p = ctr4(b), g = $("kn4-ghost");
        g.style.left = (p.x - p.w * 1.5) + "px"; g.style.top = (p.y - p.h / 2) + "px"; g.style.width = p.w + "px"; g.style.height = p.h + "px";
        g.textContent = to.getDate(); g.hidden = false;
        move4({ x: p.x - p.w, y: p.y, w: p.w, h: p.h }, 400); line4(p, { x: p.x - p.w, y: p.y });
        $("kn4-cap").innerHTML = "Left One: Off the Calendar, the Day Before Is Saturday the " + to.getDate();
      }, 900]);
      L.push([function () { var p = ctr4(b); arrow4({ x: p.x - p.w, y: p.y }, ctr4(z)); $("kn4-cap").innerHTML = "That Saturday Is at the End of the Row Above"; }, 800]);
      L.push([function () { move4(ctr4(z), 700); }, 750]);
    } else {
      L.push([function () { move4(ctr4(z), 350); line4(ctr4(b), ctr4(z)); }, 450]);
    }
    L.push([function () { z.classList.add("lout"); $("kn4-cap").innerHTML = "Last Day to Cancel: <b>" + day4(to) + "</b> by 11:59 PM"; }, 1500]);
    return L;
  }
  function stop4() { k4.on = false; clearTimeout(k4.timer); $("kn4-play").textContent = "Play"; }
  function play4() {
    if (k4.on) { stop4(); return; }
    k4.on = true; $("kn4-play").textContent = "Pause";
    var L = [], i = 0;
    (function nx() {
      if (!k4.on) return;
      if (i >= L.length) { L = example4(); i = 0; }
      var s = L[i++]; s[0](); k4.timer = setTimeout(nx, reduce ? Math.max(s[1], 1500) : s[1]);
    })();
  }

  function init() {
    Y = window.YTG;
    var inp = $("kn-date");
    var EXAMPLE = Y.addDays(Y.today(), 60), d0 = full(parse(q.get("date")));
    chosen = !!d0; inp.value = d0 ? long(d0) : ""; d0 = d0 || EXAMPLE;
    ci = d0;
    build();
    build4();
    if (frameMode) {
      document.body.classList.add("kn-frame");
      if (q.has("vid")) document.body.classList.add("kn-vid");
      if (q.has("p")) { tween(parseFloat(q.get("p")) || 0, parseFloat(q.get("g")) || 0); window.__kframe = true; return; }
      var f = +q.get("frame") || 0;
      // frame -> [step, substep, glow]
      var F = [[0, 0], [1, 1], [2, 2], [2, 3], [3, 4], [4, 4, 1], [4, 4, 2]][Math.min(f, 6)];
      step = F[0]; sub = F[1];
      $("kn-cap").innerHTML = caption(step);
      place(F[1], true); drawPath(F[1]);
      if (F[2]) { var c = cell(posFor(4)); c.classList.add("land"); c.style.animation = "none"; c.style.boxShadow = F[2] === 2 ? "inset 0 0 0 5px #a8321f,0 0 0 4px #ffd54a" : "inset 0 0 0 4px #a8321f"; }
      window.__kframe = true;
      return;
    }
    paint(true);
    if ($("kn4-months")) $("kn4-play").addEventListener("click", play4);
    // Updates as the date is typed; an empty box goes back to the example
    function onDate() { var d = typed(inp.value);
      if (d) { chosen = true; setDate(d); } else if (chosen || !inp.value) { chosen = false; setDate(EXAMPLE); } }
    // Slashes go in by themselves after the month and the day
    inp.addEventListener("input", function (e) {
      inp.value = inp.value.replace(/[^\d\/]/g, "");
      if (/^insert/.test(e.inputType || "") && /^\d{2}$|^\d{1,2}\/\d{2}$/.test(inp.value)) inp.value += "/";
      onDate();
    });
    // On leaving the box the year is written out in full (01/01/00 becomes 01/01/2000)
    inp.addEventListener("blur", function () { var d = typed(inp.value); if (d) inp.value = long(d); });
    // Calendar button: opens the browser's own date picker on a hidden date box
    var pick = $("kn-pick");
    $("kn-pickbtn").addEventListener("click", function () {
      pick.value = chosen ? iso(ci) : "";
      try { pick.showPicker(); } catch (e) { pick.focus(); pick.click(); }
    });
    pick.addEventListener("change", function () { var d = full(parse(pick.value)); if (d) { inp.value = long(d); onDate(); } });
    // No date yet: point to the date box instead of playing
    $("kn-play").addEventListener("click", function () { if (!chosen) { $("kn-cap").innerHTML = "Choose Your Check-In Date Above First"; inp.focus(); return; } if (!playing) play(); });
    window.addEventListener("resize", function () { place(sub, true); drawPath(sub); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
