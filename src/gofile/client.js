import { API_BASE } from './constants.js';
import { buildApiHeaders } from './headers.js';
import { clearAccountToken, resolveAccountToken } from './auth.js';
import { clearWtScriptCache } from './liveToken.js';
import { gofileFetch } from './net.js';

function mapApiError(status) {
  switch (status) {
    case 'error-notFound':
      return 'Gofile 内容不存在或已过期';
    case 'error-passwordRequired':
      return '该文件夹受密码保护，当前扩展不支持密码文件夹';
    case 'error-rateLimit':
      return '触发 Gofile 限流，请稍后重试，或在设置中填写 Account Token';
    case 'error-notPremium':
      return '网站令牌被拒绝，请确认网络/代理正常后重试（扩展会自动更新令牌）';
    case 'error-wrongToken':
      return '账号令牌无效，请重试或清空扩展存储后重试';
    default:
      return `Gofile 接口错误：${status}`;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(page) {
  return [
    'contentFilter=',
    `page=${page}`,
    'pageSize=1000',
    'sortField=name',
    'sortDirection=1',
  ].join('&');
}

/**
 * 获取单页文件夹内容，并在鉴权/令牌失败时自动恢复重试。
 */
export async function fetchContentsPage(contentId, accountToken, page = 1) {
  let token = accountToken;
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = `${API_BASE}/contents/${encodeURIComponent(contentId)}?${buildQuery(page)}`;
    const resp = await gofileFetch(url, {
      method: 'GET',
      headers: await buildApiHeaders(token),
    });
    let body;
    try {
      body = await resp.json();
    } catch (e) {
      throw new Error(
        `Gofile 接口响应异常（HTTP ${resp.status}）。请检查网络/代理是否可访问 api.gofile.io。`,
      );
    }

    if (body.status === 'ok') {
      return { data: body.data, token };
    }

    const status = body.status || `http-${resp.status}`;
    gopeed.logger.warn(
      `获取内容 ${contentId} 失败，状态=${status}，第 ${attempt} 次尝试`,
    );

    if (status === 'error-rateLimit' && attempt < maxAttempts) {
      await sleep(attempt * 2000);
      continue;
    }

    if (
      (status === 'error-notPremium' || status === 'error-wrongToken') &&
      attempt < maxAttempts
    ) {
      clearWtScriptCache();
      if (status === 'error-wrongToken') {
        clearAccountToken();
        const refreshed = await resolveAccountToken({ forceRefresh: true });
        token = refreshed.token;
      }
      continue;
    }

    throw new Error(mapApiError(status));
  }

  throw new Error(mapApiError('error-rateLimit'));
}

/**
 * 分页拉取文件夹下全部子项。
 */
export async function fetchAllContents(contentId, accountToken) {
  let page = 1;
  let folder = null;
  let token = accountToken;
  const children = {};

  for (;;) {
    const result = await fetchContentsPage(contentId, token, page);
    token = result.token;
    const data = result.data;

    if (!folder) {
      folder = Object.assign({}, data);
      delete folder.children;
    }

    const pageChildren = data.children || {};
    Object.assign(children, pageChildren);

    if (
      data.password &&
      (data.passwordStatus === 'passwordWrong' ||
        data.passwordStatus === 'passwordRequired')
    ) {
      throw new Error('该文件夹受密码保护，当前扩展不支持密码文件夹');
    }

    const totalPages =
      data.totalPages != null
        ? data.totalPages
        : data.pages != null
          ? data.pages
          : data.totalChildCount != null && data.pageSize
            ? Math.ceil(data.totalChildCount / data.pageSize)
            : null;

    const pageSize = data.pageSize || 1000;
    const got = Object.keys(pageChildren).length;

    if (totalPages != null) {
      if (page >= totalPages) break;
    } else if (got < pageSize) {
      break;
    }

    page += 1;
    if (page > 100) {
      gopeed.logger.warn('分页超过 100 页，已停止继续拉取');
      break;
    }
  }

  if (
    Object.keys(children).length === 0 &&
    folder &&
    (folder.isPasswordProtected || folder.hasPassword || folder.password)
  ) {
    throw new Error('该文件夹受密码保护，当前扩展不支持密码文件夹');
  }

  return { folder, children, token };
}
