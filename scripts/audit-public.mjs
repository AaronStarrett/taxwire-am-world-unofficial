import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import { gzipSync } from "node:zlib";
const root = resolve(import.meta.dirname, "..");
const errors = [];
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (
      [".git", ".local", "node_modules", "private", ".private"].includes(e.name)
    )
      continue;
    const p = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const files = await walk(root);
let raw = 0,
  gzip = 0,
  initial = 0;
for (const file of files) {
  const path = relative(root, file).replaceAll("\\", "/");
  const info = await stat(file);
  if (info.size > 50 * 1024 * 1024)
    errors.push(`${path}: exceeds project 50 MB asset limit`);
  if (
    /\.(pem|key)$|(^|\/)\.env($|\.)|training-export|world-save/.test(path) &&
    !path.startsWith("public/compatibility/")
  )
    errors.push(`${path}: forbidden private/secret export filename`);
  if (path.startsWith("dist/")) {
    raw += info.size;
    gzip += gzipSync(await readFile(file)).length;
    if (path.endsWith(".map"))
      errors.push(`${path}: public source map forbidden`);
  }
  if (
    ![
      ".txt",
      ".js",
      ".mjs",
      ".ts",
      ".tsx",
      ".json",
      ".md",
      ".html",
      ".css",
      ".svg",
      ".yml",
      ".yaml",
      ".cmd",
      ".ps1",
    ].includes(extname(file))
  )
    continue;
  const data = await readFile(file, "utf8");
  if (
    /(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{25,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
      data,
    )
  )
    errors.push(`${path}: potential secret`);
  if (
    /(?:interview details|private learner background|resume\.pdf)/i.test(
      data,
    ) &&
    path.startsWith("dist/")
  )
    errors.push(`${path}: unexpected private-content reference`);
  if (path.startsWith("dist/")) {
    if (/C:\\Users\\|D:\\|127\.0\.0\.1|localhost:\d{2,}|file:\/\//.test(data))
      errors.push(
        `${path}: hosted build contains local host/filesystem reference`,
      );
    if (/(?:google-analytics|gtag\(|api\.openai\.com|segment\.io)/.test(data))
      errors.push(`${path}: unexpected network/analytics adapter`);
    if (
      path.endsWith(".html") ||
      /assets\/index-/.test(path) ||
      /assets\/react-vendor/.test(path)
    )
      initial += gzipSync(data).length;
  }
}
if (raw > 8 * 1024 * 1024)
  errors.push("Build exceeds initial raw 8 MB whole-game budget");
if (gzip > 3 * 1024 * 1024)
  errors.push("Build exceeds initial gzip 3 MB whole-game budget");
console.log(
  JSON.stringify(
    {
      filesReviewed: files.length,
      buildBytes: raw,
      buildGzipBytes: gzip,
      initialGzipEstimate: initial,
      errors,
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
