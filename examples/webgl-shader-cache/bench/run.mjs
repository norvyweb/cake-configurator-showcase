// npm run bench  (CHROME_PATH=/path/to/chrome to use an installed browser)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const sampleRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };

// node_modules is either next to the sample or at the workspace root
const findModules = (start) => [join(start, "node_modules"), join(start, "..", "..", "node_modules")];

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  const candidates = path.startsWith("/node_modules/")
    ? findModules(sampleRoot).map((dir) => join(dir, path.slice("/node_modules/".length)))
    : [join(sampleRoot, path)];
  for (const file of candidates) {
    if (!file.startsWith(resolve(sampleRoot, "..", ".."))) continue;
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
      return res.end(body);
    } catch {}
  }
  res.writeHead(404).end();
});

await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const { port } = server.address();
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const rounds = Number(process.env.ROUNDS) || 5;
const rows = [];
try {
  for (const mode of ["recreate", "pool"]) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/bench/index.html?mode=${mode}&rounds=${rounds}`);
    rows.push(await page.waitForFunction(() => window.__result, null, { timeout: 60000 }).then((h) => h.jsonValue()));
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.table(rows.map(({ mode, variants, switches, programLinks, liveProgramsAtEnd }) => ({ mode, variants, switches, programLinks, liveProgramsAtEnd })));
