// Site-wide settings for .njk pages: the name and the header menu.
// Links are root-absolute: the site is served at the domain root.
// The layout marks the menu item for the current page with aria-current="page".
export default {
  name: "Your Timeshare Guide",
  home: "/52weeks/index.html",
  logoBand: "/52weeks/logo-band.svg",
  icon: "/52weeks/logo-icon.svg",
  menu: [
    { title: "Home", url: "/52weeks/index.html" },
    { title: "Season chart", url: "/52weeks/seasons-v2.html" },
    { title: "Find a stay", url: "/52weeks/planner.html" },
    { title: "Resorts", url: "/52weeks/resorts.html" },
    { title: "Fees", url: "/52weeks/fees.html" },
  ],
};
