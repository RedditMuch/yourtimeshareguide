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

// 255 short, common words. Three words plus two digits is about 30 bits,
// and sharing stops after MAX_WRONG wrong tries, so guessing is not practical.
const WORDS = [
  "apple", "amber", "anchor", "angel", "apron", "arrow", "aspen", "atlas", "autumn", "badge",
  "baker", "banjo", "barn", "basil", "beach", "bean", "bear", "beaver", "bell", "berry",
  "birch", "bird", "bison", "blue", "boat", "bone", "book", "boots", "bread", "brick",
  "bridge", "brook", "broom", "bubble", "bucket", "bunny", "butter", "cabin", "cake", "camel",
  "candle", "canoe", "canyon", "cape", "card", "carrot", "castle", "cedar", "chair", "cherry",
  "chess", "chick", "cider", "circle", "clay", "cliff", "clock", "cloud", "clover", "coast",
  "cocoa", "coral", "cotton", "cow", "crab", "crane", "creek", "crown", "daisy", "dance",
  "delta", "denim", "desert", "dove", "dragon", "dream", "drum", "duck", "eagle", "earth",
  "echo", "elbow", "elm", "ember", "engine", "fable", "falcon", "farm", "feather", "fern",
  "ferry", "field", "finch", "fire", "fish", "flag", "flame", "flute", "fog", "forest",
  "fox", "frog", "garden", "garlic", "ginger", "glove", "goat", "gold", "goose", "grape",
  "grass", "green", "guitar", "hammer", "harbor", "hat", "hawk", "hazel", "heart", "hedge",
  "heron", "hill", "honey", "horse", "hotel", "house", "igloo", "iron", "island", "ivory",
  "jacket", "jelly", "jewel", "juice", "jungle", "kayak", "kettle", "kite", "kitten", "koala",
  "ladder", "lake", "lamp", "lantern", "lemon", "lily", "lime", "lion", "lizard", "lunar",
  "magnet", "mango", "maple", "marble", "meadow", "melon", "mint", "mirror", "moon", "moose",
  "mouse", "music", "nest", "night", "north", "nutmeg", "oak", "oasis", "ocean", "olive",
  "onion", "orange", "otter", "owl", "paddle", "panda", "paper", "parrot", "peach", "pear",
  "pearl", "pebble", "pepper", "piano", "pie", "pillow", "pine", "pizza", "planet", "plum",
  "pond", "poppy", "puppy", "quail", "queen", "quilt", "rabbit", "radio", "rain", "raven",
  "river", "robin", "rocket", "rose", "ruby", "sail", "salad", "salmon", "sand", "scarf",
  "seal", "shell", "silver", "sketch", "sled", "smile", "snow", "soap", "spoon", "spring",
  "squid", "star", "stone", "storm", "sugar", "summer", "sun", "swan", "table", "tea",
  "tent", "tiger", "toast", "tomato", "towel", "tower", "train", "tree", "tulip", "turtle",
  "valley", "velvet", "violet", "walnut", "water", "whale", "wheat", "willow", "wind", "winter",
  "wolf", "wool", "yellow", "yogurt", "zebra",
];
const MAX_WRONG = 20;

function makePassword() {
  const w = () => WORDS[crypto.randomInt(WORDS.length)];
  return `${w()}-${w()}-${w()}-${crypto.randomInt(10, 100)}`;
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
fs.rmSync("_site", { recursive: true, force: true });
const build = spawnSync("npm run build", { shell: true, stdio: "inherit" });
if (build.status !== 0 || !fs.existsSync("_site")) {
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
      if (req.headers.authorization && ++wrongPasswords >= MAX_WRONG) {
        setImmediate(() => stop(`Sharing was stopped because the wrong password was tried ${MAX_WRONG} times. Run share.cmd again for a new link and password.`, 0));
      }
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
// Also check the clock, because a sleeping computer can make a timer run late.
setInterval(() => { if (Date.now() >= expiresAt.getTime()) stop("Time is up.", 0); }, 30_000);

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
  "Password: (I will send it in a separate message)",
  "",
  `The link stops working at ${whenText(expiresAt)}.`,
].join("\n");

console.log("\n==================== SEND THIS TO YOUR FRIEND ====================\n");
console.log(message);
console.log("\n==================================================================");
console.log("\nPASSWORD (send it in a separate message):  " + password);
const clip = spawnSync("clip", { input: message, shell: true });
console.log(clip.status === 0
  ? "\nThe message above is copied (without the password). Paste it into an email or text, then send the password in a separate message."
  : "\nCopy the message above, and send the password in a separate message.");
console.log("\nKeep this window open. The link works only while this window is open and the computer is on.");
console.log("Press Ctrl+C or close this window to stop sharing early.");
console.log("Page views will appear below.\n");

if (process.platform === "win32") spawn("cmd", ["/c", "start", "", link], { stdio: "ignore", detached: true }).unref();

let reported = 0;
setInterval(() => {
  if (wrongPasswords > reported) {
    console.log(`${new Date().toLocaleTimeString()}  ${wrongPasswords} wrong password attempt(s) so far`);
    reported = wrongPasswords;
  }
}, 30_000).unref();
