/**
 * 封装 fetch，将网络/TLS 失败转换为可读的中文错误提示。
 */
export async function gofileFetch(url, init) {
  try {
    return await fetch(url, init);
  } catch (err) {
    const raw = ((err && err.message) || String(err)).toLowerCase();
    if (
      raw.includes('tls') ||
      raw.includes('handshake') ||
      raw.includes('timeout') ||
      raw.includes('connection') ||
      raw.includes('network') ||
      raw.includes('eof') ||
      raw.includes('reset')
    ) {
      throw new Error(
        `无法连接 Gofile（${err.message || err}）。请在 Gopeed 设置中启用代理/系统代理后重试；国内网络通常需要代理才能访问 gofile.io / api.gofile.io。`,
      );
    }
    throw err;
  }
}
