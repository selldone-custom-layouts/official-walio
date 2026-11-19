#!/usr/bin/env node
/*
 * A Node port of selldone/cli's package_layout.py + validate_layout_package.py
 * (.agents/skills/package-selldone-storefront-layout/scripts), for a computer without Python.
 * Same checks, same archive: explicit directory members (unix 40755, stored), files deflated at level 9,
 * os.walk order (each folder's sub-folders, then its files, both sorted), the ZIP re-read and checked before it
 * replaces the old one. release.sh uses it only when `python` does not run.
 *
 * usage: node scripts/package-layout.mjs <build-root> <output.zip> [--manifest manifest.json] [--force]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const PACKAGE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const DRIVE_RE = /^[A-Za-z]:/;

const report = () => ({ errors: [], warnings: [], notes: [] });
const merge = (a, b) => (a.errors.push(...b.errors), a.warnings.push(...b.warnings), a.notes.push(...b.notes), a);
const printReport = (r) => {
  r.notes.forEach((n) => console.log(`INFO: ${n}`));
  r.warnings.forEach((w) => console.log(`WARNING: ${w}`));
  r.errors.forEach((e) => console.error(`ERROR: ${e}`));
  console.log(r.errors.length ? "FAIL: Artifact is not deployable." : "PASS: Selldone storefront Layout artifact is valid.");
};

function validateManifest(file) {
  const r = report();
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return r.errors.push(`Deployment manifest does not exist: ${file}`), r;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return r.errors.push(`Cannot read valid JSON from ${file}: ${e.message}`), r;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return r.errors.push("Deployment manifest must be a JSON object."), r;
  const { package: pkg, version, name } = data;
  if (typeof pkg !== "string") r.errors.push("manifest.package must be a string.");
  else {
    if (pkg.length < 12 || pkg.length > 64) r.errors.push("manifest.package must contain 12-64 characters.");
    if (!PACKAGE_RE.test(pkg)) r.errors.push("manifest.package must be a lowercase slug using letters, digits, and single hyphens.");
  }
  if (typeof version !== "string") r.errors.push("manifest.version must be a string.");
  else {
    if (version.length < 1 || version.length > 64) r.errors.push("manifest.version must contain 1-64 characters.");
    if (!VERSION_RE.test(version)) r.errors.push("manifest.version must use lowercase letters, digits, dots, and hyphens in canonical form.");
  }
  if (typeof name !== "string" || name.length < 8 || name.length > 255) r.errors.push("manifest.name must be a string containing 8-255 characters.");
  if (!("description" in data)) r.errors.push("manifest.description must be present; use null when empty.");
  else if (data.description !== null && typeof data.description !== "string") r.errors.push("manifest.description must be a string or null.");
  if (data.storefront !== true) r.errors.push("manifest.storefront must be true for a storefront Layout.");
  if (typeof data.backoffice !== "boolean") r.errors.push("manifest.backoffice must be a boolean.");
  if (typeof pkg === "string" && typeof version === "string") r.notes.push(`Manifest target: ${pkg}@${version}`);
  r.warnings.push("Version uniqueness cannot be verified offline.");
  return r;
}

const wrapperCandidates = (names) => names.filter((n) => n !== "app/shop.js" && n.toLowerCase().endsWith("/app/shop.js")).sort();

function validateDirectory(root) {
  const r = report();
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return r.errors.push(`Build directory does not exist: ${root}`), r;
  const shopJs = path.join(root, "app", "shop.js");
  const isFile = (p) => fs.existsSync(p) && fs.lstatSync(p).isFile();
  if (!fs.existsSync(path.join(root, "app")) || !fs.statSync(path.join(root, "app")).isDirectory()) r.errors.push("Missing exact build directory: app/");
  if (!isFile(shopJs)) r.errors.push("Missing exact main entry: app/shop.js");
  else if (fs.statSync(shopJs).size === 0) r.errors.push("Main entry app/shop.js is empty.");
  if (!isFile(path.join(root, "app", "shop.css"))) r.errors.push("Missing runtime stylesheet: app/shop.css");
  const names = [];
  let files = 0;
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      names.push(rel + (ent.isDirectory() ? "/" : ""));
      if (ent.isSymbolicLink()) r.errors.push(`Symlinks are not allowed in the build artifact: ${rel}`);
      else if (ent.isFile()) files++;
      else if (ent.isDirectory()) walk(full);
      else r.errors.push(`Unsupported filesystem entry in build artifact: ${rel}`);
    }
  };
  walk(root);
  if (names.some((n) => n === "dist/" || n.startsWith("dist/"))) r.errors.push("Build root contains a nested dist/ wrapper; validate the contents of dist/ instead.");
  if (!isFile(shopJs)) {
    const c = wrapperCandidates(names);
    if (c.length) r.errors.push("Main entry is wrapped too deeply; expected app/shop.js, found: " + c.slice(0, 5).join(", "));
  }
  r.notes.push(`Build directory: ${path.resolve(root)} (${files} files)`);
  return r;
}

function unsafeName(name) {
  if (!name) return "empty member name";
  if (name.includes("\0")) return "NUL byte in member name";
  if (name.includes("\\")) return "backslash path separator";
  if (name.startsWith("/") || DRIVE_RE.test(name)) return "absolute or drive-prefixed path";
  if (name.split("/").includes("..")) return "parent traversal component";
  return null;
}

async function validateZip(file) {
  const r = report();
  if (!fs.existsSync(file)) return r.errors.push(`ZIP archive does not exist: ${file}`), r;
  const size = fs.statSync(file).size;
  if (size > MAX_ARCHIVE_BYTES) r.errors.push(`ZIP is ${size} bytes; maximum upload size is ${MAX_ARCHIVE_BYTES} bytes (50 MiB).`);
  let zip;
  try {
    /* checkCRC32 reads every member, like ZipFile.testzip() */
    zip = await JSZip.loadAsync(fs.readFileSync(file), { checkCRC32: true });
  } catch (e) {
    return r.errors.push(`Cannot open a valid ZIP archive at ${file}: ${e.message}`), r;
  }
  const names = Object.keys(zip.files);
  for (const n of names) {
    const p = unsafeName(n);
    if (p) r.errors.push(`Unsafe ZIP member ${JSON.stringify(n)}: ${p}`);
    const mode = zip.files[n].unixPermissions;
    if (mode && (mode & 0o170000) === 0o120000) r.errors.push(`Symlink ZIP member is not allowed: ${n}`);
  }
  if (names.some((n) => n === "dist/" || n.startsWith("dist/"))) r.errors.push("ZIP contains a forbidden dist/ wrapper at the archive root.");
  if (!names.includes("app/")) r.errors.push("Missing explicit ZIP directory member: app/");
  if (!names.includes("app/shop.js")) {
    r.errors.push("Missing exact ZIP main entry: app/shop.js");
    const c = wrapperCandidates(names);
    if (c.length) r.errors.push("Main entry is wrapped too deeply; expected app/shop.js, found: " + c.slice(0, 5).join(", "));
  } else {
    const e = zip.files["app/shop.js"];
    if (e.dir || (await e.async("uint8array")).length === 0) r.errors.push("ZIP main entry app/shop.js must be a nonempty file.");
  }
  if (!names.includes("app/shop.css")) r.errors.push("Missing runtime stylesheet ZIP member: app/shop.css");
  else if (zip.files["app/shop.css"].dir) r.errors.push("ZIP member app/shop.css must be a file.");
  if (names.includes("manifest.json")) r.warnings.push("Root manifest.json inside the ZIP is not the deployment manifest; the CLI uploads that separately.");
  r.notes.push(`ZIP archive: ${path.resolve(file)} (${names.length} members, ${size} bytes)`);
  return r;
}

async function createArchive(root, output, force) {
  root = path.resolve(root);
  output = path.resolve(output);
  if (fs.existsSync(output) && !force) return console.error(`ERROR: Output already exists: ${output}. Pass --force to replace it.`), 1;
  if (output === root || output.startsWith(root + path.sep)) return console.error("ERROR: Output ZIP must be outside the build directory."), 1;
  const zip = new JSZip();
  const sorted = (dir) => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const walk = (dir, rel) => {
    const ents = sorted(dir);
    const dirs = ents.filter((e) => e.isDirectory());
    const files = ents.filter((e) => e.isFile());
    for (const d of dirs) zip.file((rel ? rel + "/" : "") + d.name + "/", null, { dir: true, unixPermissions: 0o40755, compression: "STORE" });
    for (const f of files) zip.file((rel ? rel + "/" : "") + f.name, fs.readFileSync(path.join(dir, f.name)), { compression: "DEFLATE", compressionOptions: { level: 9 } });
    for (const d of dirs) walk(path.join(dir, d.name), (rel ? rel + "/" : "") + d.name);
  };
  walk(root, "");
  const tmp = `${output}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(tmp, await zip.generateAsync({ type: "nodebuffer", platform: "UNIX" }));
    const r = await validateZip(tmp);
    printReport(r);
    if (r.errors.length) return 1;
    fs.renameSync(tmp, output);
    console.log(`CREATED: ${output} (${fs.statSync(output).size} bytes)`);
    return 0;
  } catch (e) {
    console.error(`ERROR: Cannot create ZIP archive: ${e.message}`);
    return 1;
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const mi = args.indexOf("--manifest");
const manifest = mi >= 0 ? args[mi + 1] : null;
const pos = args.filter((a, i) => !a.startsWith("--") && (mi < 0 || i !== mi + 1));
if (pos.length !== 2) {
  console.error("usage: node scripts/package-layout.mjs <build-root> <output.zip> [--manifest manifest.json] [--force]");
  process.exit(2);
}
const build = validateDirectory(pos[0]);
if (!manifest) build.warnings.push("Deployment manifest was not checked; pass --manifest manifest.json.");
else merge(build, validateManifest(manifest));
printReport(build);
process.exit(build.errors.length ? 1 : await createArchive(pos[0], pos[1], force));
