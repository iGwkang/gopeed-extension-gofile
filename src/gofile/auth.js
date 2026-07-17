import { API_BASE, GOFILE_ORIGIN, STORAGE_TOKEN_KEY } from './constants.js';
import { gofileFetch } from './net.js';

async function createGuestAccount() {
  const resp = await gofileFetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: {
      Origin: GOFILE_ORIGIN,
      Referer: `${GOFILE_ORIGIN}/`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });
  let data;
  try {
    data = await resp.json();
  } catch (e) {
    throw new Error(
      `创建 Gofile 游客账号失败（HTTP ${resp.status}，响应非 JSON）。请检查网络/代理。`,
    );
  }
  if (data.status !== 'ok' || !data.data || !data.data.token) {
    throw new Error(
      `创建 Gofile 游客账号失败（状态：${data.status || resp.status}）`,
    );
  }
  return data.data.token;
}

/**
 * 解析账号令牌：设置项 Account Token > 本地缓存 > 创建游客账号。
 */
export async function resolveAccountToken(options = {}) {
  const apiToken = (gopeed.settings.apiToken || '').trim();
  if (apiToken) {
    return { token: apiToken, fromSettings: true };
  }

  if (!options.forceRefresh) {
    const cached = gopeed.storage.get(STORAGE_TOKEN_KEY);
    if (cached) {
      return { token: cached, fromSettings: false };
    }
  } else {
    gopeed.storage.remove(STORAGE_TOKEN_KEY);
  }

  gopeed.logger.info('正在创建 Gofile 游客账号');
  const token = await createGuestAccount();
  gopeed.storage.set(STORAGE_TOKEN_KEY, token);
  return { token, fromSettings: false };
}

export function clearAccountToken() {
  gopeed.storage.remove(STORAGE_TOKEN_KEY);
}
