// The temporary welcome page's links (52weeks/welcome.njk), as data.
// Working name: the owner approves the final name and place before it is published.

export default {
  live: {
    id: "welcome-live",
    label: "Start Here",
    links: [
      { title: "52-Week Season Chart", href: "/52weeks/seasons-v2.html", desc: "All 52 weeks, season colors and points by room type." },
      { title: "Buy the Numbers", href: "/52weeks/buythenumbers.html", desc: "See what a points purchase costs and what it earns." },
    ],
  },
  more: {
    id: "welcome-more",
    label: "More From the Guide",
    links: [
      { title: "Points Value Calculator", href: "/starburst/calculator.html", desc: "What do your points really cost you? Compare with what Wyndham pays and charges." },
      { title: "Club Wyndham Fees", href: "/starburst/fees.html", desc: "All the charges in the Member's Directory, with page numbers." },
      { title: "Directory Errors", href: "/starburst/errors.html", desc: "Mistakes we found in the official 2026/2027 directory, including a wrong 2029 calendar." },
      { title: "Resources", href: "/starburst/resources.html", desc: "Official phone numbers, links, and owner communities." },
    ],
  },
};
