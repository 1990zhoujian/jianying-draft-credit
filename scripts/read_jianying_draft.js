const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const crypto = require("crypto");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i];
    if (!item.startsWith("--")) {
      if (!args.draft) args.draft = item;
      continue;
    }
    const key = item.slice(2);
    if (["print-json", "keep-rec", "help"].includes(key)) {
      args[key] = true;
    } else {
      args[key] = argv[++i];
    }
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  node read_jianying_draft.js --draft <draft_content.json> [--app-root <jianying-auto-master>] [--json-out <file>] [--print-json] [--keep-rec]",
  ].join("\n");
}

function fixChecksum20(source) {
  const text = String(source || "17817920560000006500000000");
  const chars = text.padEnd(20, "0").split("");
  let sum = 0;
  for (let i = 0; i < 19; i++) sum += Number(chars[i] || "0");
  chars[19] = String(sum % 10);
  return chars.join("");
}

function getBcutK6(source, keyName, home, now = new Date()) {
  const quarter = Math.trunc(now.getMonth() / 3) + 1;
  const year = now.getFullYear();
  const homeLen = home.length;
  const keyLen = keyName.length;
  const digit = (index) => Number(source[index] || "0");
  const len = source.length;
  return [
    (digit(2) + 1 + homeLen * 3 + quarter * 2) % 10,
    ((digit(3) + 3 + homeLen * 5) % 4) * 2 + 1,
    (digit(len - 6) + 5 + homeLen * 7) % 10,
    (digit(len - 5) + 4 + quarter + homeLen * 9) % 10,
    (digit(len - 7) + 5 + keyLen + homeLen) % 10,
    (digit(len - 8) + digit(len - 9) + keyLen * 3) % 10,
    (quarter * 2 + 1 + keyLen * 5 + homeLen * 6) % 10,
    (year + homeLen + quarter * 7) % 10,
    (quarter + year) % 10,
    0,
    0,
    0,
    1,
    0,
    0,
    2,
  ].join("");
}

function decryptRec(recText, key) {
  const aesKey = crypto.createHash("md5").update(key, "utf8").digest();
  const decipher = crypto.createDecipheriv("aes-128-ecb", aesKey, null);
  decipher.setAutoPadding(true);
  return decipher.update(recText, "hex", "utf8") + decipher.final("utf8");
}

function summarizeDraft(draft, draftPath, encrypted) {
  return {
    status: "success",
    draftPath,
    encrypted,
    duration: draft.duration ?? null,
    fps: draft.fps ?? null,
    tracks: Array.isArray(draft.tracks) ? draft.tracks.length : null,
    videos:
      draft.materials && Array.isArray(draft.materials.videos)
        ? draft.materials.videos.length
        : null,
  };
}

function readConfig(userData) {
  const configPath = path.join(userData, "config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function readJianyingDraft(options) {
  const appRoot = path.resolve(options.appRoot || "D:\\tool\\jianying-auto-master");
  const draftPath = path.resolve(options.draftPath || options.draft || "");
  if (!draftPath || !fs.existsSync(draftPath)) {
    throw new Error(`Missing draft_content.json: ${draftPath}`);
  }

  const raw = fs.readFileSync(draftPath, "utf8");
  if (raw.trim().startsWith("{")) {
    const draft = JSON.parse(raw);
    return { jsonText: raw, draft, summary: summarizeDraft(draft, draftPath, false) };
  }

  const keyName = options.keyName || "jianying-auto-master";
  const userData = options.userData || path.join(process.env.APPDATA || "", keyName);
  const config = readConfig(userData);
  const source = fixChecksum20(config.g6);
  const bcutK6 = getBcutK6(source, keyName, process.env.USERPROFILE || "");

  const java = path.join(appRoot, "resources", "helper", "win32", "x64", "jre", "bin", "java.exe");
  const jar = path.join(appRoot, "resources", "helper", "win32", "x64", "jre", "conf", "security", "policy", "limited", "exempt_US_export.policy");
  const dirnameLike = path.join(appRoot, "resources", "app.asar", "build", "electron", "utils");
  const recPath = `${draftPath}.rec`;

  for (const required of [java, jar, path.join(appRoot, "resources", "log", "cache.log")]) {
    if (!fs.existsSync(required)) throw new Error(`Missing runtime file: ${required}`);
  }

  if (fs.existsSync(recPath)) fs.rmSync(recPath, { force: true });
  const result = cp.spawnSync(
    java,
    ["-jar", jar, dirnameLike, "unused", draftPath, keyName, userData, source, bcutK6],
    { encoding: "utf8", cwd: appRoot, timeout: options.timeoutMs || 120000, windowsHide: true }
  );

  if (!fs.existsSync(recPath)) {
    const reason = result.error ? result.error.message : result.stderr || result.stdout || "no output";
    throw new Error(`BCut did not generate .rec: ${reason}`);
  }

  const jsonText = decryptRec(fs.readFileSync(recPath, "utf8"), bcutK6);
  if (!options.keepRec) fs.rmSync(recPath, { force: true });
  const draft = JSON.parse(jsonText);
  return {
    jsonText,
    draft,
    summary: {
      ...summarizeDraft(draft, draftPath, true),
      bcutK6,
      source,
    },
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.draft) {
    console.log(usage());
    process.exit(args.help ? 0 : 2);
  }
  const result = readJianyingDraft({
    draftPath: args.draft,
    appRoot: args["app-root"],
    userData: args["user-data"],
    keyName: args["key-name"],
    keepRec: args["keep-rec"],
  });

  if (args["json-out"]) {
    fs.mkdirSync(path.dirname(path.resolve(args["json-out"])), { recursive: true });
    fs.writeFileSync(args["json-out"], result.jsonText, "utf8");
  }

  if (args["print-json"]) {
    process.stdout.write(result.jsonText);
  } else {
    console.log(JSON.stringify(result.summary, null, 2));
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(JSON.stringify({ status: "error", message: error.message }, null, 2));
    process.exit(1);
  }
}

module.exports = { readJianyingDraft, getBcutK6, fixChecksum20, decryptRec };
