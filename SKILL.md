---
name: read-jianying-draft
description: Read and batch edit local Jianying/CapCut draft_content.json files, including encrypted drafts, using the installed Jianying automation runtime. Use when Codex needs to inspect a local Jianying draft, recover full draft JSON, count tracks/material videos, diagnose "no eligible video track" errors, edit draft JSON fields, replace paths/text/video materials across drafts, or run offline batch draft-editing workflows.
---

# Read And Edit Jianying Draft

Use this skill to read and edit local Jianying draft JSON files through the installed offline runtime in `jianying-auto-master`. It supports encrypted `draft_content.json` by invoking the bundled Java/BCut reader and decrypting the generated `.rec` file.

For detailed human-facing examples and batch-edit recipes, read `references/usage-guide.md` when the user asks for a usage guide or step-by-step operation notes.

## Read

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js --draft "C:\path\to\draft_content.json"
```

Export full decoded JSON:

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js --draft "C:\path\to\draft_content.json" --json-out "D:\tool\decoded-draft.json"
```

API:

```js
const { readJianyingDraft } = require("C:\\Users\\60475\\.codex\\skills\\read-jianying-draft\\scripts\\read_jianying_draft.js");
const result = readJianyingDraft({ draftPath: "C:\\path\\to\\draft_content.json" });
console.log(result.summary);
```

## Batch Edit

Create an operations JSON file:

```json
{
  "set": [
    { "path": "fps", "value": 30 }
  ],
  "delete": [
    "materials.drafts"
  ],
  "replaceVideos": [
    { "index": 0, "to": "E:\\new-assets\\clip-01.mp4" },
    { "from": "D:\\old-assets", "replaceWith": "E:\\new-assets" }
  ],
  "replaceStrings": [
    { "from": "D:\\old-assets", "to": "E:\\new-assets" }
  ]
}
```

Dry-run one draft:

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json"
```

Apply one draft:

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json" --apply
```

Apply every `draft_content.json` under a projects folder:

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft-dir "C:\Users\60475\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft" --ops "D:\tool\ops.json" --apply
```

## Operation Format

- `set`: write a JSON path such as `materials.videos[0].path`.
- `delete`: remove a JSON path or array element.
- `replaceVideos`: replace `materials.videos[].path` by `index`, `id`, exact `path`, `material_name`, or path substring `from`; update `material_name` automatically from the new file name.
- `replaceStrings`: recursively replace string values anywhere in the draft.

Without `--apply`, editing is dry-run only. With `--apply`, the script writes plaintext JSON back to `draft_content.json`, matching the automation software's write behavior.

## Safety Rules

- Run edit commands once without `--apply` before writing.
- Keep automatic backups unless the user explicitly requests `--no-backup`.
- The edit script creates backups named `.codex-bak-YYYYMMDDHHMMSS`.
- If `Timelines\project.json` has `main_timeline_id`, the edit script also writes the timeline mirror file.
- The scripts are offline and should not contact any server.
- Temporary `.rec` files are deleted after reading unless `--keep-rec` is passed.

## Troubleshooting

If reading encrypted drafts fails, verify these local files exist:

- `resources\helper\win32\x64\jre\bin\java.exe`
- `resources\helper\win32\x64\jre\conf\security\policy\limited\exempt_US_export.policy`
- `resources\log\cache.log`
- `%APPDATA%\jianying-auto-master\config.json`