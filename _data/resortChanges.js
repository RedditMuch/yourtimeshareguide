// Resorts joining or leaving the system (planning #22), shown on 52weeks/resortchanges.njk.
// This list is started, not finished: add a row to `comingSoon` or `departed` as news comes in, and update `checked`.
// Every row cites a source; label anything that is not official as such (for example "Owner Report").
// Dates are mm/dd/yy.

const PORTFOLIO = {
  label: "Club Wyndham, Your Resort Portfolio Is Getting a Refresh",
  url: "https://clubwyndham.wyndhamdestinations.com/us/en/resorts/resort-news/2025/your-resort-portfolio-refresh",
};
const CLOSED_2025 = "Owners at the association voted to cease operations at the end of 2025 (12/31/25 is the vote's closing date, not a confirmed last day).";
const PRESS = {
  label: "Travel + Leisure Co. Press Release, 07/14/26 (Business Wire)",
  url: "https://www.businesswire.com/news/home/20260714008660/en/",
};
const OWNER = { label: "Owner Report (checked 10/11/26)" };
const NO_NOTICE = "Not in the 2025/2026 or 2026/2027 Directory. No notice found; the reason is unconfirmed.";

export default {
  checked: "2026-10-18",
  comingSoon: [
    { name: "Yes& Vacations Resorts", location: "Maui, HI and Las Vegas, NV", what: "Travel + Leisure Co. completed this purchase: seven Maui properties and one Las Vegas Strip resort. Not confirmed to join Club Wyndham or WorldMark, and the property names are not published yet.", source: PRESS },
    { name: "Spinnaker Resorts", location: "Hilton Head, SC; Ormond Beach, FL; Branson, MO; Williamsburg, VA", what: "Agreement announced 07/14/26, expected to close in the third quarter of 2026: six Hilton Head properties plus Ormond Beach, Branson and Williamsburg. No completion notice found. Not confirmed to join Club Wyndham or WorldMark.", source: PRESS },
  ],
  departed: [
    { name: "Club Wyndham Bay Voyage Inn", location: "Jamestown, RI", when: "12/31/25", what: CLOSED_2025 + " Club Wyndham's article calls it Newport Bay Voyage.", source: PORTFOLIO },
    { name: "Club Wyndham Bentley Brook", location: "Hancock, MA", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Branson at The Falls", location: "Branson, MO", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Newport Overlook", location: "Jamestown, RI", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Orlando International", location: "Orlando, FL", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Patriots' Place", location: "Williamsburg, VA", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Resort at Fairfield Bay", location: "Fairfield Bay, AR", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Resort at Fairfield Glade", location: "Fairfield Glade, TN", when: "12/31/25", what: CLOSED_2025, source: { label: "WATE 6 News, Fairfield Glade Closing (WARN Notice)", url: "https://digital-release.wate.com/news/cumberland-county-news/fairfield-glade-resort-to-close-workers-to-be-laid-off/" } },
    { name: "Club Wyndham Shawnee Village", location: "Shawnee-on-Delaware, PA", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "Club Wyndham Skyline Tower", location: "Atlantic City, NJ", when: "12/31/25", what: CLOSED_2025 + " Club Wyndham's article calls it Skyline Towers.", source: { label: "6abc, Skyline Tower Closing, 10/07/25", url: "https://6abc.com/post/more-100-workers-club-wyndham-skyline-tower-atlantic-city-nj-bracing-layoffs-business-prepares-close/17956642/" } },
    { name: "Kauai Beach Villas", location: "Lihue, HI", when: "12/31/25", what: CLOSED_2025, source: PORTFOLIO },
    { name: "El Cid El Moro Beach Hotel", location: "Mazatlan, Mexico", when: "Unconfirmed", what: "Club Wyndham removed its resort page and no points chart exists, although the 2026/2027 Directory still lists it (Page 198).", source: OWNER },
    { name: "El Cid Granada Hotel & Country Club", location: "Mazatlan, Mexico", when: "Unconfirmed", what: "Club Wyndham removed its resort page and no points chart exists, although the 2026/2027 Directory still lists it (Page 199).", source: OWNER },
    { name: "El Cid Marina Beach Hotel & Yacht Club", location: "Mazatlan, Mexico", when: "Unconfirmed", what: "Club Wyndham removed its resort page and no points chart exists, although the 2026/2027 Directory still lists it (Page 199).", source: OWNER },
    { name: "El Cid La Ceiba Beach Hotel", location: "Cozumel, Mexico", when: "Unconfirmed", what: "Removed from the season chart; the 2026/2027 Directory still lists it (Page 198).", source: OWNER },
    { name: "WorldMark Patriots' Place", location: "Williamsburg, VA", when: "After 2025/2026 Directory", what: "Not named in Club Wyndham's closing article; whether it closed with Club Wyndham Patriots' Place is unconfirmed.", source: { label: "Directory 2025/2026, Page 254" } },
    { name: "WorldMark Shawnee Village", location: "Shawnee-on-Delaware, PA", when: "After 2025/2026 Directory", what: "Not named in Club Wyndham's closing article; whether it closed with Club Wyndham Shawnee Village is unconfirmed.", source: { label: "Directory 2025/2026, Page 249" } },
    { name: "WorldMark Pagosa", location: "Pagosa Springs, CO", when: "After 2025/2026 Directory", what: "Club Wyndham's article says some Pagosa associations voted to close and inventory is consolidated; Club Wyndham Pagosa is still listed. Whether that is the cause is unconfirmed.", source: PORTFOLIO },
    { name: "WorldMark Schooner Landing", location: "Newport, OR", when: "After 2025/2026 Directory", what: "Not in the 2026/2027 Directory. No notice found; the reason is unconfirmed.", source: { label: "Directory 2025/2026, Page 248" } },
    { name: "Club Wyndham Crotched Mountain Resort", location: "Francestown, NH", when: "After 2023/2024 Directory", what: NO_NOTICE, source: { label: "Directory 2023/2024, Page 132" } },
    { name: "WorldMark Valley Isle", location: "Lahaina, HI", when: "After 2023/2024 Directory", what: NO_NOTICE, source: { label: "Directory 2023/2024, Page 251" } },
    { name: "Margaritaville Island Hotel Pigeon Forge", location: "Pigeon Forge, TN", when: "After 2023/2024 Directory", what: "Listed as an Associate Hotel in the 2023/2024 Directory. The hotel still operates; only the club listing ended.", source: { label: "Directory 2023/2024, Page 290" } },
  ],
};
