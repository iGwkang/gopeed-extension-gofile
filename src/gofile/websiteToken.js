import { sha256 } from 'js-sha256';
import { DEFAULT_LANG, DEFAULT_UA, DEFAULT_WT_SALT } from './constants.js';

/**
 * 按 Gofile 官方规则本地计算网站令牌：
 * sha256(浏览器标识::语言::账号令牌::时间窗口::盐值)
 */
export function generateWebsiteToken(accountToken, options = {}) {
  const userAgent = options.userAgent || DEFAULT_UA;
  const lang = options.lang || DEFAULT_LANG;
  const salt = options.salt || DEFAULT_WT_SALT;
  const now = options.now != null ? options.now : Date.now();
  const timeWindow = Math.floor(now / 1000 / 14400);
  const payload = `${userAgent}::${lang}::${accountToken}::${timeWindow}::${salt}`;
  return sha256(payload);
}
