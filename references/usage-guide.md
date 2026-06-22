# read-jianying-draft Skill 使用指南

这份指南用于手动调用或让 Codex 调用 `read-jianying-draft` skill，完成本地剪映/CapCut 草稿读取、解密、检查和批量编辑。

## 1. 能做什么

- 读取本地 `draft_content.json`，包括加密草稿。
- 导出完整解密后的草稿 JSON。
- 统计草稿中的轨道数、素材视频/图片数量、时长等信息。
- 批量修改草稿字段。
- 批量替换视频/图片素材路径。
- 批量替换草稿中的字符串路径。
- 写回草稿前先 dry-run，确认会修改哪些草稿。

默认使用的软件根目录是：

```text
D:\tool\jianying-auto-master
```

## 2. 读取单个草稿

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js --draft "C:\path\to\draft_content.json"
```

成功时会输出类似：

```json
{
  "status": "success",
  "encrypted": true,
  "duration": 5000000,
  "tracks": 5,
  "videos": 2
}
```

## 3. 导出完整草稿 JSON

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js --draft "C:\path\to\draft_content.json" --json-out "D:\tool\decoded-draft.json"
```

如需直接打印完整 JSON：

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js --draft "C:\path\to\draft_content.json" --print-json
```

## 4. 批量编辑的基本流程

先创建一个操作文件，例如 `D:\tool\ops.json`：

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

先 dry-run，不写回：

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json"
```

确认输出中 `changed: true`、修改数量正确后，再写回：

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json" --apply
```

## 5. 批量处理整个草稿目录

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft-dir "C:\Users\60475\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft" --ops "D:\tool\ops.json"
```

确认 dry-run 正确后：

```powershell
node C:\Users\60475\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js --draft-dir "C:\Users\60475\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft" --ops "D:\tool\ops.json" --apply
```

## 6. 操作文件格式

### set

设置指定 JSON 路径：

```json
{
  "set": [
    {
      "path": "fps",
      "value": 30
    }
  ]
}
```

支持数组下标：

```json
{
  "set": [
    {
      "path": "materials.videos[0].path",
      "value": "E:\\new-assets\\clip-01.mp4"
    }
  ]
}
```

### delete

删除字段或数组项：

```json
{
  "delete": [
    "materials.drafts",
    "materials.videos[1]"
  ]
}
```

### replaceVideos

替换 `materials.videos[]` 中的视频/图片素材路径。

按素材序号替换：

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

按素材 id 替换：

```json
{
  "replaceVideos": [
    {
      "id": "8F78C0BA-9D33-4c29-A461-A66771155DBC",
      "to": "E:\\new-assets\\background.png"
    }
  ]
}
```

按原路径精确替换：

```json
{
  "replaceVideos": [
    {
      "path": "D:\\old-assets\\old.png",
      "to": "E:\\new-assets\\new.png"
    }
  ]
}
```

按路径片段批量替换：

```json
{
  "replaceVideos": [
    {
      "from": "D:\\old-assets",
      "replaceWith": "E:\\new-assets"
    }
  ]
}
```

可选字段：

- `material_name_to`: 指定新的素材名；不填时自动取新路径文件名。
- `type`: 指定素材类型，例如 `video` 或 `photo`。
- `duration`: 修改素材时长。
- `width`: 修改素材宽度。
- `height`: 修改素材高度。

### replaceStrings

递归替换草稿里所有字符串字段：

```json
{
  "replaceStrings": [
    {
      "from": "D:\\old-assets",
      "to": "E:\\new-assets"
    }
  ]
}
```

这个操作范围最大，适合整体迁移素材盘符或根目录。写回前务必 dry-run。

## 7. 安全规则

- 第一次一定不要加 `--apply`，先看 dry-run 结果。
- 默认会自动备份，备份名类似 `draft_content.json.codex-bak-YYYYMMDDHHMMSS`。
- 不建议使用 `--no-backup`，除非已经手动备份整个草稿目录。
- 如果存在 `Timelines\project.json` 和 `main_timeline_id`，脚本会同时写主草稿和时间线镜像草稿。
- 脚本离线运行，不会访问服务器。
- 加密草稿读取时会临时生成 `.rec` 文件，默认读取后删除。

## 8. 让 Codex 直接执行的说法

可以直接对 Codex 说：

```text
使用 read-jianying-draft skill，帮我 dry-run 检查这个草稿有几条视频轨道：
C:\path\to\draft_content.json
```

```text
使用 read-jianying-draft skill，把这个草稿第 0 个视频素材替换为 E:\new-assets\clip-01.mp4，先 dry-run，不要写回。
```

```text
使用 read-jianying-draft skill，把剪映草稿目录下所有 D:\old-assets 批量替换成 E:\new-assets，先 dry-run，确认后再 apply。
```

## 9. 常见问题

如果提示读取失败，检查这些文件是否存在：

```text
D:\tool\jianying-auto-master\resources\helper\win32\x64\jre\bin\java.exe
D:\tool\jianying-auto-master\resources\helper\win32\x64\jre\conf\security\policy\limited\exempt_US_export.policy
D:\tool\jianying-auto-master\resources\log\cache.log
%APPDATA%\jianying-auto-master\config.json
```

如果提示没有修改，常见原因是：

- `replaceVideos` 的 `index`、`id`、`path` 或 `from` 没匹配到素材。
- 目标路径和原路径相同。
- 操作 JSON 格式不合法。

如果剪映打开后素材仍异常，优先检查：

- 新素材路径是否真实存在。
- 图片/视频格式是否被剪映支持。
- 是否同时写入了时间线镜像草稿。
