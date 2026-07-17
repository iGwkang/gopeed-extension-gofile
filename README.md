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

扩展会自动下载 Gofile 官方脚本并生成令牌；成功后还会缓存最新盐值，供网络波动时本地回退。

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
