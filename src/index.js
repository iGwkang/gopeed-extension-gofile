import { resolveAccountToken } from './gofile/auth.js';
import { collectFiles } from './gofile/walk.js';

function extractContentId(rawUrl) {
  const text = String(rawUrl || '').trim();
  const matched = text.match(/gofile\.io\/(?:d\/)?([A-Za-z0-9]+)/i);
  if (matched && matched[1]) {
    return matched[1];
  }

  try {
    const url = new URL(text);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  } catch (e) {
    // 忽略
  }

  throw new Error('无效的 Gofile 链接：缺少内容编号');
}

gopeed.events.onResolve(async (ctx) => {
  const rawUrl = ctx.req.rawUrl || ctx.req.url;
  gopeed.logger.info(`正在解析 Gofile 链接：${rawUrl}`);

  try {
    const contentId = extractContentId(rawUrl);
    gopeed.logger.info(`内容编号：${contentId}`);

    const auth = await resolveAccountToken();
    const { name, files } = await collectFiles(contentId, auth.token);

    gopeed.logger.info(`已解析 ${files.length} 个文件，根目录「${name}」`);

    ctx.res = {
      name,
      files,
    };
  } catch (err) {
    const message = (err && err.message) || String(err);
    gopeed.logger.error(`Gofile 解析失败：${message}`);
    throw new Error(message);
  }
});
