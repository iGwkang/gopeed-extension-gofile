import { fetchAllContents } from './client.js';
import { buildDownloadHeaders } from './headers.js';

function joinPath(base, name) {
  if (!base) return name || '';
  if (!name) return base;
  return `${base}/${name}`;
}

/**
 * 递归收集 Gofile 文件夹下的全部文件。
 */
export async function collectFiles(rootContentId, accountToken) {
  const files = [];
  let token = accountToken;

  async function walk(contentId, relativePath) {
    const result = await fetchAllContents(contentId, token);
    token = result.token;
    const { folder, children } = result;
    const downloadHeaders = buildDownloadHeaders(token);
    const entries = Object.keys(children || {}).map((k) => children[k]);

    for (let i = 0; i < entries.length; i++) {
      const item = entries[i];
      if (item.type === 'file') {
        if (!item.link) {
          gopeed.logger.warn(`跳过无下载链接的文件：${item.name}`);
          continue;
        }
        files.push({
          name: item.name,
          path: relativePath || '',
          size: item.size || 0,
          req: {
            url: item.link,
            extra: {
              header: downloadHeaders,
            },
          },
        });
      } else if (item.type === 'folder') {
        const childPath = joinPath(relativePath, item.name || item.id);
        gopeed.logger.info(`进入子文件夹：${childPath}`);
        await walk(item.id || item.code, childPath);
      } else {
        gopeed.logger.debug(
          `跳过未知类型 ${item.type}：${item.name || item.id}`,
        );
      }
    }

    return folder;
  }

  const rootFolder = await walk(rootContentId, '');
  const name =
    (rootFolder && rootFolder.name) ||
    (rootFolder && rootFolder.code) ||
    rootContentId ||
    'gofile';

  if (files.length === 0) {
    throw new Error('该 Gofile 文件夹中没有可下载的文件');
  }

  return { name, files, token };
}
