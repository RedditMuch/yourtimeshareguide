// A small static file server for the built site (_site/). No dependencies.
//
//   node scripts/serve.mjs [--port 8090] [--root _site] [--host 127.0.0.1] [--password <pw>]
//
// - Serves index.html for folder paths.
// - Returns 404 for missing files and refuses paths that climb out of the root.
// - With --password, every request needs HTTP Basic auth. Any username is
//   accepted; only the password is checked (constant-time comparison).
//   Used by the browser checks (tests/) and reusable for private share links.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseArgs } from "node:util";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function sha(value) {
  return crypto.createHash("sha256").update(value).digest();
}

// Compares hashes, so length differences leak nothing.
function passwordMatches(header, password) {
  if (!header || !header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const given = decoded.slice(decoded.indexOf(":") + 1);
  return crypto.timingSafeEqual(sha(given), sha(password));
}

export function createServer({ root, password }) {
  const rootDir = path.resolve(root);
  const server = http.createServer((req, res) => {
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
      res.end(req.method === "HEAD" ? undefined : body);
    };

    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "Method not allowed", { Allow: "GET, HEAD" });

    if (password && !passwordMatches(req.headers.authorization, password)) {
      return send(401, "Password required", { "WWW-Authenticate": 'Basic realm="Private preview", charset="UTF-8"' });
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      return send(400, "Bad request");
    }
    if (pathname.includes("\0") || pathname.split(/[\/]/).includes("..")) return send(403, "Forbidden");

    let file = path.join(rootDir, pathname);
    if (file !== rootDir && !file.startsWith(rootDir + path.sep)) return send(403, "Forbidden");

    fs.stat(file, (err, stat) => {
      if (!err && stat.isDirectory()) {
        // Like GitHub Pages: /folder becomes /folder/, so relative links inside it work.
        if (!pathname.endsWith("/")) {
          const url = new URL(req.url, "http://localhost");
          return send(301, "Moved", { Location: `${url.pathname}/${url.search}` });
        }
        file = path.join(file, "index.html");
        fs.stat(file, (err2, stat2) => (err2 ? send(404, "Not found") : sendFile(file, stat2)));
      } else if (err || !stat.isFile()) {
        send(404, "Not found");
      } else {
        sendFile(file, stat);
      }
    });

    function sendFile(filePath, stat) {
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Content-Length": stat.size,
        "Cache-Control": "no-cache",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(filePath).on("error", () => res.destroy()).pipe(res);
    }
  });
  // Keep idle connections open longer than clients expect (Node closes after 5 s), which avoids "socket hang up" races.
  server.keepAliveTimeout = 65_000;
  return server;
}

if (import.meta.url === new URL(process.argv[1], "file:///").href || process.argv[1]?.endsWith("serve.mjs")) {
  const { values } = parseArgs({
    options: {
      port: { type: "string", default: "8090" },
      root: { type: "string", default: "_site" },
      host: { type: "string", default: "127.0.0.1" },
      password: { type: "string" },
    },
  });
  if (!fs.existsSync(values.root)) {
    console.error(`Folder not found: ${values.root}. Run "npm run build" first.`);
    process.exit(1);
  }
  createServer({ root: values.root, password: values.password }).listen(Number(values.port), values.host, () => {
    console.log(`Serving ${path.resolve(values.root)} at http://${values.host}:${values.port}/${values.password ? " (password required)" : ""}`);
  });
}
