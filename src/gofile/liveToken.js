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

function cacheSaltFromInput(sampleInput) {
  if (!sampleInput) return;
  const parts = String(sampleInput).split('::');
  const salt = parts[parts.length - 1];
  if (salt && salt.length >= 6) {
    gopeed.storage.set(STORAGE_SALT_KEY, salt);
    gopeed.logger.debug(`已自动缓存网站令牌盐值：${salt}`);
  }
}

/**
 * 在当前 Gopeed 运行时内执行官方脚本（不要新建 VM，避免跨 runtime 传对象报错）。
 */
function runOfficialScriptInPlace(code, accountToken, userAgent, lang) {
  const source = `
(function () {
  var navigator = {
    language: ${JSON.stringify(lang)},
    userAgent: ${JSON.stringify(userAgent)}
  };
  var document = { cookie: '' };
  var self = typeof self !== 'undefined' ? self : this;
  var window = typeof window !== 'undefined' ? window : this;

  ${code}

  if (typeof generateWT !== 'function') {
    throw new Error('官方令牌脚本未导出生成函数');
  }

  var __captured = [];
  if (typeof _sha256 === 'function') {
    var __origSha = _sha256;
    _sha256 = function (input) {
      __captured.push(String(input));
      return __origSha(input);
    };
  }

  var token = generateWT(${JSON.stringify(accountToken)});
  return {
    token: token,
    saltInput: __captured.length ? __captured[0] : ''
  };
})();
`;

  // 使用当前 runtime 的 eval，避免 createContext 跨 VM 传 Object
  const result = vm.runInThisContext(source);
  if (!result || !result.token) {
    throw new Error('官方令牌脚本返回了空令牌');
  }
  return result;
}

/**
 * 从官方脚本自动生成网站令牌（普通用户无需任何手动操作）。
 */
export async function generateWebsiteTokenLive(accountToken, options = {}) {
  const userAgent = options.userAgent || DEFAULT_UA;
  const lang = options.lang || DEFAULT_LANG;
  const code = await loadWtScript(userAgent);

  const result = runOfficialScriptInPlace(code, accountToken, userAgent, lang);
  cacheSaltFromInput(result.saltInput);
  return result.token;
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
