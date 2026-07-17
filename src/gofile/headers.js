import { DEFAULT_LANG, DEFAULT_UA, GOFILE_ORIGIN } from './constants.js';
import { generateWebsiteToken } from './websiteToken.js';
import { generateWebsiteTokenLive, getCachedWtSalt } from './liveToken.js';

export function getUserAgent() {
  return DEFAULT_UA;
}

/**
 * 构建接口请求头。
 * 优先自动加载官方脚本生成令牌；失败时用自动缓存的盐值/内置盐值本地计算。
 */
export async function buildApiHeaders(accountToken, options = {}) {
  const userAgent = getUserAgent();
  let websiteToken;

  if (!options.forceLocal) {
    try {
      websiteToken = await generateWebsiteTokenLive(accountToken, { userAgent });
      gopeed.logger.debug('已自动生成网站令牌');
    } catch (err) {
      gopeed.logger.warn(
        `自动生成网站令牌失败，改用本地计算：${err.message || err}`,
      );
    }
  }

  if (!websiteToken) {
    const salt =
      (gopeed.settings.wtSalt || '').trim() ||
      getCachedWtSalt() ||
      undefined;
    websiteToken = generateWebsiteToken(accountToken, { userAgent, salt });
  }

  return {
    Authorization: `Bearer ${accountToken}`,
    'X-Website-Token': websiteToken,
    'X-BL': DEFAULT_LANG,
    'User-Agent': userAgent,
    Origin: GOFILE_ORIGIN,
    Referer: `${GOFILE_ORIGIN}/`,
    Accept: 'application/json, text/plain, */*',
  };
}

export function buildDownloadHeaders(accountToken) {
  const userAgent = getUserAgent();
  return {
    'User-Agent': userAgent,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `${GOFILE_ORIGIN}/`,
    Origin: GOFILE_ORIGIN,
    Cookie: `accountToken=${accountToken}`,
  };
}
