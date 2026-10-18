// The Club Wyndham Access (CWA) resorts, read from the 2026/2027 directory data
// (52weeks/reference-data.js) so the list has one source. Used by 52weeks/cwaresorts.njk.
import fs from "node:fs";
import vm from "node:vm";

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL("../52weeks/reference-data.js", import.meta.url), "utf8"), sandbox);

const sortName = (name) => name.replace(/^Club Wyndham (at )?/i, "");

const resorts = sandbox.window.REFERENCE.resorts
  .filter((r) => r.club_wyndham_access === "Yes")
  .sort((a, b) => sortName(a.name).localeCompare(sortName(b.name)))
  .map((r, i) => ({
    number: i + 1,
    id: r.resort_id,
    name: r.name,
    address: r.address.replace(/\n/g, ", "),
    city: r.city,
    state: r.state_province,
    stateCode: r.state_code,
    country: r.country,
    phone: r.phone,
    bookPage: r.printed_pages[0],
  }));

export default {
  checked: "2026-10-18",
  edition: "2026/2027",
  directoryUrl: "https://media.travelandleisure.com/WD/email/2025/0625-2025/cw-directory/index.html",
  searchBarOffset: 4,
  resorts,
};
