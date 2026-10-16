// The home page's links (root index.njk), as data.
// Groups: Start Here (live, significant work), More From the Guide (live Starburst pages),
// In-Progress (built, not published yet: no links), Under Construction (needed, not built: no links).

export default {
  live: {
    id: "welcome-live",
    label: "Start Here",
    links: [
      { title: "52-Week Season Chart", href: "/52weeks/seasons-v2.html", season: "prime", desc: "All 52 weeks, season colors and points by room type." },
      { title: "Buy the Numbers", href: "/52weeks/buythenumbers.html", season: "quiet", desc: "See what a points purchase costs and what it earns." },
      { title: "Thrifty Points", href: "/52weeks/thriftypoints.html", season: "high", desc: "Find where your points can take you, with VIP prices, and save the list." },
      { title: "Buy the Perks", href: "/52weeks/buytheperks.html", season: "value", desc: "See which perks come with each points level, and what they are worth." },
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
  progress: {
    id: "welcome-progress",
    label: "In Progress",
    tag: "In-Progress",
    items: [
      { title: "Booking Windows and Deadlines", desc: "When you can book, upgrade and cancel, from 14 months to 15 days before check-in. Needs a Club Wyndham source." },
      { title: "Points to Maintenance Credit", desc: "What your points are worth as maintenance fee credit. Needs the conversion fee confirmed." },
      { title: "Helpful Links", desc: "Official Club Wyndham and Wyndham Rewards links in one place." },
      { title: "Owner Questions", desc: "Plain answers about Housekeeping Credits and Reservation Transactions. Needs wording re-checked." },
    ],
  },
  construction: {
    id: "welcome-construction",
    label: "Under Construction",
    tag: "Under Construction",
    items: [
      { title: "Owner Toolkit", desc: "One page for every calculator, with a single My Ownership box. Needs the design system pieces first." },
      { title: "Frequently Asked Questions", desc: "Answers to what owners ask most. Needs the questions and sourced answers." },
      { title: "Step-by-Step Booking Guides", desc: "Booking walkthroughs and little-known owner benefits. Needs writing." },
      { title: "Cancelling Within the Rescission Period", desc: "A guide to cancelling a purchase in time. Needs writing and a legal read." },
      { title: "Current Owner Offers", desc: "A section for current offers. Needs the owner's decision." },
      { title: "New and Departing Resorts", desc: "Coming soon and recently departed resorts. Needs the owner's decision." },
      { title: "Resort Phone List and Local Discounts", desc: "Resort phone numbers and discounts near each resort. Needs collecting." },
      { title: "Club Wyndham Access Resorts", desc: "A numbered list of the Club Wyndham Access resorts. Needs collecting." },
      { title: "Club Wyndham Website Errors", desc: "Broken links and mistakes on Club Wyndham's own website. Needs a recheck." },
      { title: "Associate Resorts Points Charts", desc: "Points charts for the Associate resorts in the season chart. Needs data." },
      { title: "Report an Error or Contact the Owner", desc: "A way for readers to send corrections. Needs the owner's decision." },
    ],
  },
};
