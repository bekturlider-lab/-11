import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BLOCKED_COUNTRIES } from "./config.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);
const forbiddenIllustration = await readFile(resolve(root, "assets", "region-blocked.jpg"));
const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/news.js", ["news.js", "text/javascript; charset=utf-8"]]
]);

const forbiddenPage = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Доступ ограничен</title>
<style>*{box-sizing:border-box}body{min-height:100vh;display:grid;place-items:center;margin:0;padding:24px;background:#fff}.message{width:min(100%,766px)}.message img{display:block;width:100%;height:auto}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style></head>
<body><main class="message"><h1 class="sr-only">Доступ к сайту из вашего региона ограничен</h1><img src="data:image/jpeg;base64,${forbiddenIllustration.toString("base64")}" alt="404 — страница не найдена"></main></body></html>`;

function countryFromRequest(request) {
  const geoCountry = request.geo?.country;
  const country = geoCountry || request.headers["cf-ipcountry"]
    || request.headers["x-vercel-ip-country"] || request.headers["x-country-code"];
  return typeof country === "string" ? country.trim().toUpperCase() : "";
}

function geoRestriction(request, response) {
  if (!BLOCKED_COUNTRIES.includes(countryFromRequest(request))) return false;
  response.writeHead(403, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, private, max-age=0",
    "cdn-cache-control": "no-store",
    "surrogate-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(request.method === "HEAD" ? undefined : forbiddenPage);
  return true;
}

createServer(async (request, response) => {
  if (geoRestriction(request, response)) return;

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "allow": "GET, HEAD", "cache-control": "no-store" });
    response.end();
    return;
  }

  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  let file = files.get(pathname);
  if (!file && /^\/(?:news\/[a-z0-9-]+|category\/[a-z0-9-]+|search)\/?$/.test(pathname)) {
    file = files.get("/");
  }

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : "Не найдено");
    return;
  }

  try {
    const contents = await readFile(resolve(root, file[0]));
    response.writeHead(200, {
      "content-type": file[1],
      "x-content-type-options": "nosniff",
      "cache-control": file[0] === "index.html" ? "no-cache" : "public, max-age=300"
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    console.error(`Unable to serve ${file[0]}:`, error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : "Не удалось загрузить страницу");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Qazaq Daily: http://127.0.0.1:${port}`);
});
