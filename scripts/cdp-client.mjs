/**
 * cdp-client.mjs
 * 纯原生 Node.js (>=20) WebSocket/fetch CDP 连接客户端，零第三方依赖。
 * 用于连接独立 Chrome 实例，执行页面跳转、DOM 计算与物理鼠标事件派发。
 */

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const rnd = (min, max) => min + Math.random() * (max - min);

export async function attachCdp(port = 9223) {
  let list;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`);
    list = await res.json();
  } catch (err) {
    throw new Error(`无法连接 CDP 端口 ${port}，请确保独立 Chrome 已启动 (运行 scripts/launch-chrome.ps1): ${err.message}`);
  }

  const page = list.find((t) => t.type === 'page' && !/^(chrome|devtools|chrome-extension)/.test(t.url));
  if (!page) {
    throw new Error(`未检测到可用页面目标，请确保浏览器已打开常规网页窗口。`);
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  let messageId = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const handler = pending.get(msg.id);
        pending.delete(msg.id);
        handler(msg);
      }
    } catch {}
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, (msg) => {
        if (msg.error) {
          reject(new Error(`CDP [${method}] 错误: ${msg.error.message}`));
        } else {
          resolve(msg.result);
        }
      });
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.delete(id)) {
          reject(new Error(`CDP [${method}] 调用超时`));
        }
      }, 25000);
    });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`evaluate 执行失败: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}`);
    }
    return res.result.value;
  };

  const navigate = async (url, waitAfter = rnd(2000, 3000)) => {
    try {
      await evaluate(`window.location.href = ${JSON.stringify(url)}`);
    } catch {
      try {
        await send('Page.navigate', { url });
      } catch {}
    }
    for (let i = 0; i < 30; i++) {
      await sleep(250);
      try {
        const state = await evaluate('document.readyState');
        if (state === 'complete') break;
      } catch {}
    }
    await sleep(waitAfter);
  };

  const dispatchPhysicalClick = async (x, y) => {
    if (x < 0 || y < 0) throw new Error(`无效的点击坐标: (${x}, ${y})`);
    // 派发真实的物理鼠标事件链，彻底绕过前端反爬监听
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await sleep(50);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await sleep(80);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };

  const close = () => {
    try {
      ws.close();
    } catch {}
  };

  return {
    ws,
    send,
    evaluate,
    navigate,
    dispatchPhysicalClick,
    close
  };
}
