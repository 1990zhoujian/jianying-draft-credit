# read-jianying-draft Codex Skill

Read and batch edit local Jianying/CapCut `draft_content.json` files, including encrypted drafts, through a local Jianying automation runtime.

## What This Skill Provides

- Read plaintext or encrypted Jianying/CapCut drafts.
- Export decoded draft JSON.
- Count tracks, video/photo materials, duration, and basic draft metadata.
- Batch edit draft JSON fields.
- Replace video/photo material paths by index, id, material name, exact path, or path prefix.
- Dry-run edits before writing.
- Create backups before applying changes.

## Requirements

- Windows.
- Node.js available in `PATH`.
- A local `jianying-auto-master` runtime with these files:
  - `resources\helper\win32\x64\jre\bin\java.exe`
  - `resources\helper\win32\x64\jre\conf\security\policy\limited\exempt_US_export.policy`
  - `resources\log\cache.log`
  - `%APPDATA%\jianying-auto-master\config.json`

The default runtime path is `D:\tool\jianying-auto-master`. If your runtime is elsewhere, pass `--app-root`.

## Install For Codex

Clone this repository into your Codex skills directory:

```powershell
git clone https://github.com/<owner>/read-jianying-draft-skill.git "$env:USERPROFILE\.codex\skills\read-jianying-draft"
```

Restart Codex so the skill is discovered.

## Read A Draft

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js" --draft "C:\path\to\draft_content.json"
```

Export decoded JSON:

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js" --draft "C:\path\to\draft_content.json" --json-out "D:\tool\decoded-draft.json"
```

Use a custom runtime path:

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js" --draft "C:\path\to\draft_content.json" --app-root "D:\path\to\jianying-auto-master"
```

## Batch Edit

Create `ops.json`:

```json
{
  "replaceVideos": [
    {
      "index": 0,
      "to": "E:\\new-assets\\clip-01.mp4"
    }
  ]
}
```

Dry-run first:

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js" --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json"
```

Apply after confirming the dry-run:

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js" --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json" --apply
```

Batch edit every draft below a folder:

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js" --draft-dir "C:\Users\you\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft" --ops "D:\tool\ops.json" --apply
```

## Operation Types

- `set`: set a JSON path such as `materials.videos[0].path`.
- `delete`: delete a JSON path or array item.
- `replaceVideos`: replace `materials.videos[].path`.
- `replaceStrings`: recursively replace string values anywhere in the draft.

See [references/usage-guide.md](references/usage-guide.md) for the full Chinese usage guide and examples.

## Safety

- Always run without `--apply` first.
- Backups are enabled by default and named `.codex-bak-YYYYMMDDHHMMSS`.
- If `Timelines\project.json` has `main_timeline_id`, the edit script also writes the timeline mirror draft.
- The scripts are offline and do not contact any server.

