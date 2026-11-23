# Gopeed 扩展 — Gofile 下载器

将任意 [Gofile.io](https://gofile.io) 分享链接粘贴到 Gopeed，扩展会自动解析文件夹并开始下载。

支持：

- 公开文件夹（`https://gofile.io/d/{id}`）
- 嵌套子目录（通过 `path` 保留目录结构）
- 零配置游客账号（可选填写 Account Token）

## 安装

### 从 Git 安装（推荐）

1. 打开 Gopeed → **扩展**
2. 粘贴本仓库地址并安装：

```text
https://github.com/igwkang/gopeed-extension-gofile
```

> 若远程仓库地址有变化，请同步修改 `manifest.json` 中的 `repository.url` 与 `homepage`。

### 本地开发安装

1. 安装依赖并构建：

```bash
npm install
npm run build
```

2. 在 Gopeed **扩展**页连续点击 **安装** 按钮 **5 次**，开启开发者模式。
3. 选择本项目根目录（包含 `manifest.json` 的文件夹）。
4. 开发时可使用监听构建：

```bash
npm run dev
```

## 使用方法

1. 复制 Gofile 链接，例如 `https://gofile.io/d/xxxxxxxx`
2. 在 Gopeed 中用该链接创建任务（走解析流程，不要勾选「直接下载」）
3. 勾选需要的文件并开始下载

### 网络 / 代理（重要）

部分网络环境无法直连 Gofile（`gofile.io` / `api.gofile.io`），常见报错：

```text
net/http: TLS handshake timeout
```

若出现上述错误，或日志停在「正在创建 Gofile 游客账号」：

1. 打开 Gopeed → **设置 → 代理**
2. 启用**系统代理**，或配置可访问 Gofile 的代理
3. 重新尝试同一链接（扩展的网络请求会走 Gopeed 代理）

代理不可用时，扩展无法创建游客账号，也无法列出文件。

当前不支持密码保护文件夹。

### 限流 / 会员

若触发 Gofile 限流，可在扩展设置中填写 **Account Token**（Gofile 个人资料页 → Developer Information → Account Token）。留空则继续使用自动创建的游客账号。

### 网站令牌（自动）

网站令牌由扩展在解析时**自动生成**，普通用户无需任何配置或命令。

扩展会自动下载 Gofile 官方脚本（`/js/wt.obf.js`）并生成令牌；成功后还会缓存最新盐值，供网络波动时本地回退。

### 大文件下载 / 连接数（Connections）（重要）

Gofile 的 CDN 支持 Range 下载，但 **Gopeed 默认多连接（例如 16）** 在部分大文件上会出现只下完约 **1 MB** 后速度归零、任务一直显示「运行中」的情况。这是 Gopeed 多段并行与 Gofile 的配合问题，并非分享链接失效。

**建议：**

1. 创建任务后，在任务设置里将 **Connections 设为 1**（必要时可试 2～4）。
2. 或在 Gopeed **设置** 中降低 HTTP 任务的默认连接数，再下载 Gofile 大文件。
3. 若任务卡住：暂停/继续无效时，删除任务并重启 Gopeed，再重新用分享链接创建任务（不要勾选「直接下载」）。

## 调试

日志位于 Gopeed 安装目录下的 `logs/extension.log`。调试级别日志仅在开发者模式安装的扩展中生效。

## 开发命令

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 构建 `dist/index.js` |
| `npm run dev` | 监听文件变化并重新构建 |

`dist/index.js` 是 `manifest.json` 指定的运行入口；通过 Git 安装时必须提交该文件（Gopeed 安装时不会执行 `npm install`）。

## 许可证

MIT

---

## English — Large downloads & Connections

Gofile CDN supports byte-range requests, but **Gopeed’s default multi-connection download** (e.g. 16 connections) may stall after roughly **1 MB**: speed drops to zero while the task still shows as running. This is a Gopeed ↔ Gofile interaction issue, not a broken share link.

**Workaround:**

1. Set **Connections to 1** in the task settings (2–4 may work for some files).
2. Or lower the default HTTP connection count in Gopeed **Settings** before downloading large Gofile files.
3. If stuck: remove the task and restart Gopeed, then create the task again from the `gofile.io/d/...` link (do not use direct download).

### v1.0.7 — Website token script path

Gofile moved the website token script from `/dist/js/wt.obf.js` to **`/js/wt.obf.js`**. This release updates the fetch URL, refreshes the fallback salt, and uses `Accept: */*` on download requests.
