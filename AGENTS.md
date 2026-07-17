## Learned User Preferences

- 面向用户的文案（manifest、README、设置项描述）优先使用中文，不要默认写成英文。
- 扩展设置里 Account Token 的标题保持英文 `Account Token`，不要改成中文别名（如「接口令牌」）。
- 优先零配置：网站令牌/盐值等应在插件内自动生成；不要要求普通用户执行 Node/CLI 捕获命令。

## Learned Workspace Facts

- 本仓库是 Gopeed 扩展，用于解析并下载 Gofile.io 分享链接（如 `https://gofile.io/d/{id}`），支持嵌套子目录；不支持密码保护文件夹。
- 扩展网络请求走 Gopeed 代理；出现 TLS handshake timeout 或卡在创建游客账号时，通常需在 Gopeed 中配置可访问 Gofile 的代理。
- 账号鉴权顺序：设置中的 Account Token > `gopeed.storage` 缓存的游客令牌 > 新建游客账号；并非每次下载都新建游客账号。
- 网站令牌在解析时由扩展自动从 Gofile 官方脚本生成，并缓存盐值供网络波动时本地回退。
- 通过 Git 安装时必须提交构建产物 `dist/index.js`，因为 Gopeed 安装扩展时不会执行 `npm install`。
