// Private, temporary share link for feedback (planning #34). No dependencies.
//
//   node scripts/share.mjs [--hours 2 | --minutes 30]
//
// Builds the site, serves it on this computer behind a fresh password, and
// opens a Cloudflare "quick tunnel" so a friend can view it from anywhere.
// Everything stops by itself at expiry, on Ctrl+C, or when the window closes.
// The static server is scripts/serve.mjs (imported, bound to 127.0.0.1).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(repo);

const WORDS = ["maple", "river", "sunny", "cedar", "lemon", "tiger", "piano", "olive", "coral", "eagle",
  "grape", "happy", "ivory", "jolly", "koala", "lunar", "mango", "novel", "ocean", "peach",
  "quiet", "robin", "sandy", "tulip", "umber", "vivid", "wheat", "amber", "birch", "daisy",
  "ember", "fern", "green", "honey", "lilac", "mint", "north", "pearl", "rusty", "smile"];

function makePassword() {
  const w = () => WORDS[crypto.randomInt(WORDS.length)];
  return `${w()}-${w()}-${crypto.randomInt(100, 1000)}`;
}

const { values } = parseArgs({
  options: { hours: { type: "string" }, minutes: { type: "string" } },
});
let minutes = 120;
if (values.minutes !== undefined) minutes = Number(values.minutes);
else if (values.hours !== undefined) minutes = Number(values.hours) * 60;
if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
  console.error("Please give a time between 1 minute and 24 hours, for example: --hours 3");
  process.exit(1);
}

function findCloudflared() {
  const names = process.platform === "win32" ? ["cloudflared.exe"] : ["cloudflared"];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const n of names) {
      const p = path.join(dir, n);
      if (dir && fs.existsSync(p)) return p;
    }
  }
  const fallback = path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "cloudflared", "cloudflared.exe");
  return fs.existsSync(fallback) ? fallback : null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

let server = null;
let tunnel = null;
let timer = null;
let stopping = false;

function stop(reason, code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  if (reason) console.log(`\n${reason}`);
  if (tunnel && tunnel.pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(tunnel.pid), "/t", "/f"], { stdio: "ignore" });
    else tunnel.kill("SIGKILL");
  }
  if (server) {
    server.closeAllConnections?.();
    server.close();
  }
  console.log("The share link is stopped. Nobody can open it now.");
  process.exit(code);
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) process.on(sig, () => stop("Stopping...", 0));

const cloudflared = findCloudflared();
if (!cloudflared) {
  console.error("cloudflared is not installed. Ask Claude to install it (winget install Cloudflare.cloudflared).");
  process.exit(1);
}

console.log("Building the site...");
const build = spawnSync("npx eleventy", { shell: true, stdio: "inherit" });
if (build.status !== 0) {
  console.error("The site could not be built, so nothing was shared.");
  process.exit(1);
}

const password = makePassword();
const port = await freePort();
let wrongPasswords = 0;
server = createServer({ root: "_site", password });
server.on("request", (req, res) => {
  res.on("finish", () => {
    if (res.statusCode === 401) {
      // Browsers first ask without a password; only count real wrong tries.
      if (req.headers.authorization) wrongPasswords++;
      return;
    }
    if (res.statusCode !== 200 || req.method !== "GET") return;
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { return; }
    if (p.endsWith("/") || p.endsWith(".html")) {
      console.log(`${new Date().toLocaleTimeString()}  viewed ${p}`);
    }
  });
});
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});

const expiresAt = new Date(Date.now() + minutes * 60_000);
timer = setTimeout(() => stop("Time is up.", 0), minutes * 60_000);

console.log("Starting the private link (this takes a few seconds)...");
tunnel = spawn(cloudflared, ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`], {
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
// Safety net: if this program is killed abruptly (no chance to clean up), a tiny
// helper notices and stops the tunnel too, so nothing is left running.
const watchdog = `const [parent, child] = process.argv.slice(1).map(Number);
const alive = (p) => { try { process.kill(p, 0); return true; } catch { return false; } };
const t = setInterval(() => {
  if (!alive(child)) process.exit(0);
  if (!alive(parent)) { try { process.kill(child, "SIGKILL"); } catch {} process.exit(0); }
}, 1000);`;
spawn(process.execPath, ["-e", watchdog, String(process.pid), String(tunnel.pid)], { stdio: "ignore", detached: true, windowsHide: true }).unref();
tunnel.on("exit", (code) => {
  if (!stopping) stop(`The connection ended unexpectedly (code ${code}).`, 1);
});

const url = await new Promise((resolve) => {
  const fail = setTimeout(() => resolve(null), 60_000);
  let buf = "";
  const onData = (d) => {
    buf = (buf + d.toString()).slice(-4000);
    const m = buf.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && m[0] !== "https://api.trycloudflare.com") { clearTimeout(fail); resolve(m[0]); }
  };
  tunnel.stdout.on("data", onData);
  tunnel.stderr.on("data", onData);
});
if (!url) stop("The private link did not start within 60 seconds. Check the internet connection and try again.", 1);

function whenText(d) {
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const days = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return `${time} ${days === 0 ? "today" : days === 1 ? "tomorrow" : "on " + d.toLocaleDateString("en-US", { weekday: "long" })}`;
}

const link = `${url}/52weeks/index.html`;
const message = [
  "Hi! Here is a private preview of the timeshare guide website. I would love your feedback.",
  "",
  `Link: ${link}`,
  "User name: anything (type any word)",
  `Password: ${password}`,
  "",
  `The link stops working at ${whenText(expiresAt)}.`,
].join("\n");

console.log("\n==================== SEND THIS TO YOUR FRIEND ====================\n");
console.log(message);
console.log("\n==================================================================");
const clip = spawnSync("clip", { input: message, shell: true });
console.log(clip.status === 0 ? "\n(This message is already copied. Just paste it into an email or text.)" : "\n(Copy the message above.)");
console.log("\nKeep this window open. The link works only while this window is open and the computer is on.");
console.log("Press Ctrl+C or close this window to stop sharing early.");
console.log("Page views will appear below.\n");

if (process.platform === "win32") spawn("cmd", ["/c", "start", "", link], { stdio: "ignore", detached: true }).unref();

setInterval(() => {
  if (wrongPasswords) {
    console.log(`${new Date().toLocaleTimeString()}  ${wrongPasswords} wrong password attempt(s)`);
    wrongPasswords = 0;
  }
}, 60_000).unref();
