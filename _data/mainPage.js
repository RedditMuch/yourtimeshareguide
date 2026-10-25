// The main page's links (52weeks/index.njk), as data. The page draws them with
// the LinkList and Card components, so a page is added or renamed here only.
//
// Each link: title, href (relative to 52weeks/), desc (one plain line), and an
// optional tag { text, tone } where tone is "", "success", "caution" or "danger".
// Group ids match the links other 52weeks pages already use (index.html#directory-plan).

const needsServer = { text: "Needs a server", tone: "caution" };

export default {
  columns: [
    {
      id: "hub-52weeks",
      title: "52weeks",
      text: "The Owner Atlas pages. This is the version being built out.",
      featured: {
        title: "Season chart v2",
        href: "./",
        tag: { text: "In progress", tone: "success" },
        desc: "Every resort's seasons and points, week by week, with filters for collection, place, bedrooms and room type.",
      },
      groups: [
        {
          id: "directory-plan",
          label: "Plan a stay",
          links: [
            { title: "Season chart (original)", href: "seasons.html", desc: "The first Owner Atlas chart: all 52 weeks, season colors and points by room type." },
            { title: "Find a stay", href: "planner.html", desc: "Nearby resorts, flexible dates and points budgets." },
            { title: "Compare stays", href: "compare.html", desc: "Rooms, amenities, points and costs side by side." },
            { title: "Booking date calculator", href: "booking.html", desc: "Booking, upgrade and cancellation dates for a trip." },
          ],
        },
        {
          id: "directory-resort",
          label: "Know your resort",
          links: [
            { title: "Resorts & contacts", href: "resorts.html", desc: "Amenities, photos, area maps and resort phone numbers." },
            { title: "Room location guide", href: "rooms.html", desc: "Room numbers, buildings and sourced view information." },
            { title: "Floor plans & resort maps", href: "layouts.html", desc: "Published room layouts and property maps." },
          ],
        },
        {
          id: "directory-reference",
          label: "Owner reference",
          links: [
            { title: "VIP benefits", href: "vip.html", desc: "Qualification, discounts, upgrades and tier comparison." },
            { title: "Reservation windows", href: "windows.html", desc: "Booking periods, eligibility and minimum stays." },
            { title: "Fees & charges", href: "fees.html", desc: "Amounts, allowances and when a charge applies." },
            { title: "Owner services", href: "resorts.html?view=services", desc: "Reservations, VIP support and billing contacts." },
          ],
        },
        {
          id: "directory-records",
          label: "Your records",
          links: [
            { title: "Browser shortlist", href: "planner.html?view=saved", desc: "Quick choices saved on this browser and device." },
            { title: "Saved stays", href: "stays.html", tag: needsServer, desc: "Account-saved choices, room requests and trip briefings." },
            { title: "Trip briefing", href: "briefing.html", tag: needsServer, desc: "A printable briefing for one saved stay: costs, availability and notes." },
            { title: "Points ledger", href: "ledger.html", tag: needsServer, desc: "Use Years, point balances and housekeeping." },
          ],
        },
        {
          id: "directory-other",
          label: "Other",
          links: [
            { title: "Owner directory", href: "directory.html", tag: { text: "Old copy" }, desc: "An earlier copy of this page, with the original Owner Atlas logo." },
          ],
        },
      ],
    },
    {
      id: "hub-starburst",
      title: "starburst",
      text: "The original six-page site, kept for comparison.",
      groups: [
        {
          id: "starburst-pages",
          label: "Pages",
          links: [
            { title: "Home", href: "../starburst/index.html", desc: "What the site is, who it's for and how it works." },
            { title: "Points Value Calculator", href: "../starburst/calculator.html", desc: "Your cost per 1,000 points, compared with Wyndham's own prices." },
            { title: "Season Finder", href: "../starburst/seasons.html", desc: "Every week of the year, color-coded by season, with points by suite size and a trip cost calculator." },
            { title: "Every Fee in One Place", href: "../starburst/fees.html", desc: "All charges in the Member's Directory 2026/2027, with page numbers." },
            { title: "Directory Errors", href: "../starburst/errors.html", desc: "Mistakes found in the 2026/2027 Member's Directory, including a wrong 2029 week calendar." },
            { title: "Helpful Resources", href: "../starburst/resources.html", desc: "Official Club Wyndham links and phone numbers, owner perks and owner communities." },
          ],
        },
      ],
    },
  ],

  download: {
    id: "directory-download",
    label: "Download",
    level: 2, // after both columns, so not under the starburst heading
    links: [{ title: "52-week spreadsheet", href: "Wyndham_Weekly_Season_Heatmap.xlsx", download: true, tag: { text: "Excel" } }],
  },

  // "About this directory & data coverage"
  coverage: [
    { name: "Season chart", value: "52 weeks" },
    { name: "Exact room variants", value: "609 room variants" },
    { name: "Resort directory", value: "232 listings" },
    { name: "Room guide", value: "291 room records" },
    { name: "Plans & maps", value: "760 source assets" },
    { name: "VIP benefits", value: "5 tiers" },
    { name: "Reservation windows", value: "22 rules" },
    { name: "Fee reference", value: "28 charges" },
  ],

  // The radius choices of the search form (35 miles is selected).
  radius: { options: [10, 25, 35, 50, 100, 250], selected: 35 },
};
