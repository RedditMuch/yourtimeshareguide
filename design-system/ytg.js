/* @ds-bundle: {"format":4,"namespace":"YTG","components":[{"name":"Progress"}]} */
/* Your Timeshare Guide: the few components that need a script. Plain JavaScript,
   no libraries. The website loads this same file as /assets/js/ytg.js. */
window.YTG = (function () {
  "use strict";

  /* Progress: the 52-week band fills January to December, week by week.
     el is a .ytg-progress element (markup in components/Progress/README.md). */
  function progress(el) {
    var bar = el.querySelector('[role="progressbar"]');
    var value = el.querySelector(".ytg-progress__value");
    return {
      /* Known amount done, 0 to 1. Fills whole weeks only. */
      set: function (fraction) {
        var f = Math.max(0, Math.min(1, Number(fraction) || 0));
        var weeks = Math.floor(f * 52);
        var percent = Math.round(f * 100);
        el.classList.remove("ytg-progress--waiting");
        el.style.setProperty("--ytg-progress", (weeks / 52) * 100 + "%");
        if (bar) bar.setAttribute("aria-valuenow", String(percent));
        if (value) value.textContent = percent + "%";
      },
      /* Amount unknown: a bright window sweeps across the year. */
      wait: function () {
        el.classList.add("ytg-progress--waiting");
        if (bar) bar.removeAttribute("aria-valuenow");
        if (value) value.textContent = "";
      },
      /* Change the words ("Loading the season chart", "Updating the chart"). */
      label: function (text) {
        var label = el.querySelector(".ytg-progress__text");
        if (label) label.textContent = text;
      },
    };
  }

  /* Show an indicator only if the wait passes `delay` ms (300 by default), so quick
     actions don't flash. Returns a function to call when the work is done. */
  function showAfter(el, delay) {
    var timer = setTimeout(function () { el.hidden = false; }, delay == null ? 300 : delay);
    return function done() {
      clearTimeout(timer);
      el.hidden = true;
    };
  }

  /* Mark a region (class ytg-region) busy while it updates: dimmed, and announced
     as busy to screen readers. */
  function busy(region, on) {
    region.setAttribute("aria-busy", on ? "true" : "false");
  }

  return { progress: progress, showAfter: showAfter, busy: busy };
})();
