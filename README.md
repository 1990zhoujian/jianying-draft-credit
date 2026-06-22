# 剪映草稿读取与批量编辑 Codex Skill

这是一个给 Codex 使用的 skill，用于读取和批量编辑本地剪映/CapCut `draft_content.json` 草稿文件。它支持明文草稿，也支持通过本地剪映自动化运行时读取加密草稿。

仓库地址：

```text
https://github.com/1990zhoujian/jianying-draft-credit
```

## 功能

- 读取本地 `draft_content.json`。
- 读取加密草稿并导出完整 JSON。
- 统计草稿轨道数、视频/图片素材数量、时长等信息。
- 批量修改草稿 JSON 字段。
- 按序号、素材 id、素材名、原路径或路径片段替换视频/图片素材路径。
- 写回前 dry-run，先确认会修改什么。
- 写回时自动备份原草稿。

## 环境要求

- Windows。
- Node.js 可用。
- 本机已有 `jianying-auto-master` 运行时。

默认运行时目录：

```text
D:\tool\jianying-auto-master
```

如果你的运行时不在这个目录，调用脚本时传入 `--app-root`。

加密草稿读取依赖这些本地文件：

```text
resources\helper\win32\x64\jre\bin\java.exe
resources\helper\win32\x64\jre\conf\security\policy\limited\exempt_US_export.policy
resources\log\cache.log
%APPDATA%\jianying-auto-master\config.json
```

## 安装到 Codex

把仓库 clone 到 Codex skills 目录：

```powershell
git clone https://github.com/1990zhoujian/jianying-draft-credit.git "$env:USERPROFILE\.codex\skills\read-jianying-draft"
```

然后重启 Codex，让 skill 生效。

## 让 Codex 调用

可以直接对 Codex 说：

```text
使用 read-jianying-draft skill，读取这个剪映草稿：
C:\path\to\draft_content.json
```

```text
使用 read-jianying-draft skill，把这个草稿第 0 个视频素材替换为 E:\new-assets\clip-01.mp4，先 dry-run，不要写回。
```

```text
使用 read-jianying-draft skill，把草稿目录下所有 D:\old-assets 批量替换成 E:\new-assets，先 dry-run，确认后再 apply。
```

## 手动读取草稿

读取单个草稿：

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js" --draft "C:\path\to\draft_content.json"
```

导出完整解密 JSON：

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js" --draft "C:\path\to\draft_content.json" --json-out "D:\tool\decoded-draft.json"
```

指定运行时目录：

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\read_jianying_draft.js" --draft "C:\path\to\draft_content.json" --app-root "D:\path\to\jianying-auto-master"
```

## 批量编辑草稿

先创建操作文件，例如 `D:\tool\ops.json`：

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
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js" --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json"
```

确认 dry-run 输出正确后，再加 `--apply` 写回：

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js" --draft "C:\path\to\draft_content.json" --ops "D:\tool\ops.json" --apply
```

批量处理整个草稿目录：

```powershell
node "$env:USERPROFILE\.codex\skills\read-jianying-draft\scripts\edit_jianying_drafts.js" --draft-dir "C:\Users\you\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft" --ops "D:\tool\ops.json" --apply
```

## 操作类型

### set

设置 JSON 路径：

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

按序号替换：

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

### replaceStrings

递归替换草稿内所有字符串字段：

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

## 安全说明

- 第一次一定先 dry-run，不要加 `--apply`。
- 写回时默认自动备份，备份名类似 `.codex-bak-YYYYMMDDHHMMSS`。
- 如果草稿存在 `Timelines\project.json` 和 `main_timeline_id`，脚本会同时写入时间线镜像草稿。
- 脚本离线运行，不访问服务器。
- 不建议使用 `--no-backup`，除非你已经手动备份整个草稿目录。

## 更多示例

完整中文使用指南见：

[references/usage-guide.md](references/usage-guide.md)