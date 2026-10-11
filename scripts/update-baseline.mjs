// Re-records tests/baseline.json from the current state of the built site.
// Run through `npm run test:update-baseline` (which builds first). See README.md, "Checks".
import { spawnSync } from "node:child_process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npx, ["playwright", "test", "--reporter=line"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, UPDATE_BASELINE: "1" },
});
process.exit(result.status ?? 1);
