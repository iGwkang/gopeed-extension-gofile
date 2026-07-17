/**
 * 下载 Gofile 官方 wt.obf.js，执行生成函数并输出当前盐值。
 * 用法：node scripts/capture-salt.mjs
 */
import vm from 'vm';
import { writeFileSync } from 'fs';
import { createHash } from 'crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const code = await fetch('https://gofile.io/dist/js/wt.obf.js', {
  headers: { 'User-Agent': UA },
}).then((r) => r.text());

const captured = [];
const sandbox = {
  console,
  navigator: { language: 'en-US', userAgent: UA },
  document: { cookie: '' },
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  crypto: globalThis.crypto,
  Date,
  Math,
  String,
  Array,
  Object,
  Number,
  Boolean,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  undefined,
  Uint8Array,
  ArrayBuffer,
  TextEncoder,
  TextDecoder,
  setTimeout,
  clearTimeout,
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(code, sandbox, { timeout: 5000 });

const orig = sandbox._sha256;
sandbox._sha256 = function patched(input) {
  captured.push(String(input));
  return orig.apply(this, arguments);
};

const token = 'PROBE_TOKEN_12345';
sandbox.generateWT(token);

if (!captured.length) {
  console.error('未能从官方脚本中捕获哈希输入');
  process.exit(1);
}

const parts = captured[0].split('::');
const salt = parts[parts.length - 1];
const tw = Math.floor(Date.now() / 1000 / 14400);
const check = createHash('sha256')
  .update(`${UA}::en-US::${token}::${tw}::${salt}`)
  .digest('hex');

console.log('当前 Gofile 网站令牌盐值：', salt);
console.log('示例哈希输入：', captured[0]);
console.log('校验是否与官方生成一致：', check === sandbox.generateWT(token));

writeFileSync(
  'scripts/current-salt.json',
  JSON.stringify(
    {
      salt,
      sampleInput: captured[0],
      userAgent: UA,
      lang: 'en-US',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
