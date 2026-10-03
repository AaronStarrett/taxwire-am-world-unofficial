import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(import.meta.dirname, "../dist");
const port = Number(process.argv[2] || 4173);
const prefix = process.env.SITE_BASE_PATH || "/";
const mime = {
  ".txt": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
};
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (!pathname.startsWith(prefix)) {
      res.writeHead(404).end("Outside site base");
      return;
    }
    let target = resolve(root, "." + "/" + pathname.slice(prefix.length));
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(target)).isDirectory())
      target = resolve(target, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(
    `Taxwire Account Manager World listening on http://127.0.0.1:${port}/`,
  ),
);
