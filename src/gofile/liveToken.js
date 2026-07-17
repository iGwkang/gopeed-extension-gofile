import vm from 'vm';
import { DEFAULT_LANG, DEFAULT_UA, GOFILE_ORIGIN } from './constants.js';
import { gofileFetch } from './net.js';

const STORAGE_SALT_KEY = 'wtSalt';
const STORAGE_SCRIPT_KEY = 'wtScript';
const STORAGE_SCRIPT_AT_KEY = 'wtScriptAt';
const SCRIPT_TTL_MS = 6 * 60 * 60 * 1000;

let memoryScript = null;
let memoryScriptAt = 0;

function readStoredScript() {
  const at = Number(gopeed.storage.get(STORAGE_SCRIPT_AT_KEY) || 0);
  const code = gopeed.storage.get(STORAGE_SCRIPT_KEY);
  if (code && at && Date.now() - at < SCRIPT_TTL_MS) {
    return code;
  }
  return null;
}

function writeStoredScript(code) {
  gopeed.storage.set(STORAGE_SCRIPT_KEY, code);
  gopeed.storage.set(STORAGE_SCRIPT_AT_KEY, String(Date.now()));
}

async function loadWtScript(userAgent) {
  const now = Date.now();
  if (memoryScript && now - memoryScriptAt < SCRIPT_TTL_MS) {
    return memoryScript;
  }

  const cached = readStoredScript();
  if (cached) {
    memoryScript = cached;
    memoryScriptAt = now;
    return cached;
  }

  const resp = await gofileFetch(`${GOFILE_ORIGIN}/dist/js/wt.obf.js`, {
    headers: {
      'User-Agent': userAgent,
      Origin: GOFILE_ORIGIN,
      Referer: `${GOFILE_ORIGIN}/`,
    },
  });
  if (!resp.ok) {
    throw new Error(`下载 Gofile 官方令牌脚本失败（HTTP ${resp.status}）`);
  }
  const code = await resp.text();
  if (!code || code.length < 100) {
    throw new Error('Gofile 官方令牌脚本内容为空');
  }

  memoryScript = code;
  memoryScriptAt = now;
  writeStoredScript(code);
  return code;
}

function createWtContext(userAgent, lang, extra = {}) {
  const context = vm.createContext({
    navigator: { language: lang, userAgent },
    document: { cookie: '' },
    console: {
      log() {},
      info() {},
      warn() {},
      error() {},
      debug() {},
    },
    generateWT: null,
    _sha256: null,
    atob,
    btoa,
    TextEncoder,
    TextDecoder,
    ...extra,
  });
  context.window = context;
  context.self = context;
  context.globalThis = context;
  return context;
}

/**
 * 执行官方脚本并自动缓存最新盐值，供本地回退使用。
 */
function runOfficialScript(code, userAgent, lang) {
  const captured = [];
  const context = createWtContext(userAgent, lang, {
    __captureSaltInput: function (input) {
      captured.push(String(input));
    },
  });

  const wrapped = `
${code}
;(function () {
  if (typeof _sha256 === 'function') {
    var __orig = _sha256;
    _sha256 = function (input) {
      if (typeof __captureSaltInput === 'function') {
        __captureSaltInput(String(input));
      }
      return __orig(input);
    };
  }
})();
`;

  new vm.Script(wrapped).runInContext(context);

  if (typeof context.generateWT !== 'function') {
    throw new Error('官方令牌脚本未导出生成函数');
  }

  return { context, captured };
}

function cacheSaltFromCaptured(captured) {
  if (!captured.length) return;
  const parts = captured[0].split('::');
  const salt = parts[parts.length - 1];
  if (salt && salt.length >= 6) {
    gopeed.storage.set(STORAGE_SALT_KEY, salt);
    gopeed.logger.debug(`已自动缓存网站令牌盐值：${salt}`);
  }
}

/**
 * 从官方脚本自动生成网站令牌（普通用户无需任何手动操作）。
 */
export async function generateWebsiteTokenLive(accountToken, options = {}) {
  const userAgent = options.userAgent || DEFAULT_UA;
  const lang = options.lang || DEFAULT_LANG;
  const code = await loadWtScript(userAgent);

  const { context, captured } = runOfficialScript(code, userAgent, lang);
  const token = context.generateWT(accountToken);
  if (!token || typeof token !== 'string') {
    throw new Error('官方令牌脚本返回了空令牌');
  }

  cacheSaltFromCaptured(captured);
  return token;
}

/** 读取插件自动缓存的盐值 */
export function getCachedWtSalt() {
  return (gopeed.storage.get(STORAGE_SALT_KEY) || '').trim() || '';
}

export function clearWtScriptCache() {
  memoryScript = null;
  memoryScriptAt = 0;
  gopeed.storage.remove(STORAGE_SCRIPT_KEY);
  gopeed.storage.remove(STORAGE_SCRIPT_AT_KEY);
}
