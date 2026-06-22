const fs = require("fs");
const path = require("path");
const { readJianyingDraft } = require("./read_jianying_draft");

function parseArgs(argv) {
  const args = { draft: [] };
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (item === "--draft") args.draft.push(argv[++i]);
    else if (item === "--draft-dir") args.draftDir = argv[++i];
    else if (item === "--ops") args.ops = argv[++i];
    else if (item === "--app-root") args.appRoot = argv[++i];
    else if (item === "--json-out-dir") args.jsonOutDir = argv[++i];
    else if (item === "--apply") args.apply = true;
    else if (item === "--keep-rec") args.keepRec = true;
    else if (item === "--no-backup") args.noBackup = true;
    else if (item === "--help") args.help = true;
    else if (!item.startsWith("--")) args.draft.push(item);
  }
  return args;
}

function findDrafts(root) {
  const out = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.isFile() && item.name === "draft_content.json") out.push(full);
    }
  }
  walk(root);
  return out;
}

function parsePath(expr) {
  const parts = [];
  String(expr).split(".").forEach((part) => {
    const re = /([^\[\]]+)|\[(\d+)\]/g;
    let match;
    while ((match = re.exec(part))) {
      parts.push(match[1] !== undefined ? match[1] : Number(match[2]));
    }
  });
  return parts;
}

function setAt(root, expr, value) {
  const parts = parsePath(expr);
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = parts[i + 1];
    if (cur[key] == null) cur[key] = typeof next === "number" ? [] : {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function deleteAt(root, expr) {
  const parts = parsePath(expr);
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) cur = cur == null ? undefined : cur[parts[i]];
  if (cur == null) return false;
  const key = parts[parts.length - 1];
  if (Array.isArray(cur) && typeof key === "number") cur.splice(key, 1);
  else delete cur[key];
  return true;
}

function replaceStrings(value, from, to, stats) {
  if (typeof value === "string") {
    if (!value.includes(from)) return value;
    stats.stringReplacements++;
    return value.split(from).join(to);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = replaceStrings(value[i], from, to, stats);
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) value[key] = replaceStrings(value[key], from, to, stats);
  }
  return value;
}

function normalizePathText(value) {
  return String(value || "").replace(/\\/g, "/");
}

function baseName(value) {
  return path.basename(normalizePathText(value));
}

function hasSelector(rule) {
  return rule.index !== undefined || rule.id || rule.path || rule.material_name || rule.from;
}

function videoMatches(video, rule, index) {
  if (!hasSelector(rule)) return false;
  if (rule.index !== undefined && Number(rule.index) !== index) return false;
  if (rule.id && video.id !== rule.id) return false;
  if (rule.path && normalizePathText(video.path) !== normalizePathText(rule.path)) return false;
  if (rule.material_name && video.material_name !== rule.material_name) return false;
  if (rule.from && !normalizePathText(video.path).includes(normalizePathText(rule.from))) return false;
  return true;
}

function replaceVideos(draft, rules, stats) {
  const videos = draft && draft.materials && Array.isArray(draft.materials.videos) ? draft.materials.videos : [];
  for (const rule of rules || []) {
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      if (!videoMatches(video, rule, i)) continue;
      const oldPath = video.path || "";
      const nextPath = rule.to || (rule.from ? normalizePathText(oldPath).split(normalizePathText(rule.from)).join(normalizePathText(rule.replaceWith || "")) : oldPath);
      if (!nextPath || nextPath === oldPath) continue;
      video.path = nextPath;
      video.material_name = rule.material_name_to || baseName(nextPath);
      if (rule.type) video.type = rule.type;
      if (rule.duration !== undefined) video.duration = rule.duration;
      if (rule.width !== undefined) video.width = rule.width;
      if (rule.height !== undefined) video.height = rule.height;
      stats.videoReplacements++;
    }
  }
}
function applyOperations(draft, ops) {
  const stats = { set: 0, delete: 0, stringReplacements: 0, videoReplacements: 0 };
  for (const op of ops.set || []) {
    setAt(draft, op.path, op.value);
    stats.set++;
  }
  for (const expr of ops.delete || []) {
    if (deleteAt(draft, expr)) stats.delete++;
  }
  replaceVideos(draft, ops.replaceVideos, stats);
  for (const op of ops.replaceStrings || []) replaceStrings(draft, op.from, op.to, stats);
  return stats;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function backupFile(file) {
  if (!fs.existsSync(file)) return null;
  const backup = `${file}.codex-bak-${timestamp()}`;
  fs.copyFileSync(file, backup);
  return backup;
}

function timelineMirrorPath(draftPath) {
  const dir = path.dirname(draftPath);
  const projectPath = path.join(dir, "Timelines", "project.json");
  if (!fs.existsSync(projectPath)) return null;
  try {
    const project = JSON.parse(fs.readFileSync(projectPath, "utf8"));
    if (!project.main_timeline_id) return null;
    const mirror = path.join(dir, "Timelines", project.main_timeline_id, path.basename(draftPath));
    return fs.existsSync(path.dirname(mirror)) ? mirror : null;
  } catch {
    return null;
  }
}

function writeDraft(draftPath, jsonText, options) {
  const backups = [];
  if (!options.noBackup) {
    const mainBackup = backupFile(draftPath);
    if (mainBackup) backups.push(mainBackup);
  }
  fs.writeFileSync(draftPath, jsonText, "utf8");
  const mirror = timelineMirrorPath(draftPath);
  if (mirror) {
    if (!options.noBackup) {
      const mirrorBackup = backupFile(mirror);
      if (mirrorBackup) backups.push(mirrorBackup);
    }
    fs.writeFileSync(mirror, jsonText, "utf8");
  }
  return { backups, mirror };
}

function collectDrafts(args) {
  const drafts = [...args.draft];
  if (args.draftDir) drafts.push(...findDrafts(args.draftDir));
  return [...new Set(drafts.map((item) => path.resolve(item)))];
}

function editOne(draftPath, ops, args) {
  const read = readJianyingDraft({ draftPath, appRoot: args.appRoot, keepRec: args.keepRec });
  const before = read.summary;
  const stats = applyOperations(read.draft, ops);
  const jsonText = JSON.stringify(read.draft);
  const changed = jsonText !== read.jsonText;
  let write = null;
  if (args.apply && changed) write = writeDraft(draftPath, jsonText, { noBackup: args.noBackup });
  if (args.jsonOutDir) {
    fs.mkdirSync(args.jsonOutDir, { recursive: true });
    const out = path.join(args.jsonOutDir, `${path.basename(path.dirname(draftPath))}.draft_content.json`);
    fs.writeFileSync(out, jsonText, "utf8");
  }
  return { draftPath, dryRun: !args.apply, changed, before, stats, write };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.ops || (!args.draft.length && !args.draftDir)) {
    console.log("Usage: node edit_jianying_drafts.js --draft <draft_content.json> --ops <ops.json> [--apply]");
    process.exit(args.help ? 0 : 2);
  }
  const ops = JSON.parse(fs.readFileSync(args.ops, "utf8"));
  const results = collectDrafts(args).map((draftPath) => editOne(draftPath, ops, args));
  console.log(JSON.stringify({ status: "success", count: results.length, applied: !!args.apply, results }, null, 2));
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }, null, 2));
    process.exit(1);
  }
}

module.exports = { editOne, applyOperations, collectDrafts, setAt, deleteAt, replaceVideos };
