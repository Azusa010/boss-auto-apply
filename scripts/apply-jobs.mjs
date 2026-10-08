/**
 * apply-jobs.mjs
 * 通用 BOSS 直聘高可靠自动化打招呼与防风控批量投递脚本。
 * 
 * 核心特性：
 * 1. 深度适配 Boss 直聘现代 UI 事件监听与二次确认弹窗。
 * 2. 状态去重与原子化保存：每次投递后即时回写 state.json，避免重复打招呼。
 * 3. 严格防风控与熔断保护：4.5 ~ 7.5 秒随机沉睡；遇验证码或“过于频繁/已达上限”即刻熔断暂停。
 * 4. 每日沟通额度追踪：动态统计当日投递量（默认上限 150 次/天），超额自动熔断。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { attachCdp, sleep, rnd } from './cdp-client.mjs';

function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function countTodaySent(state) {
  const today = getTodayDateStr();
  let count = 0;
  for (const key of Object.keys(state)) {
    const item = state[key];
    if (item && item.st === 'sent' && item.t && item.t.startsWith(today)) {
      count++;
    }
  }
  return count;
}

export async function runJobApply(options = {}) {
  const {
    port = 9223,
    jobsPath = 'approved_jobs.json',
    statePath = 'state.json',
    configPath = 'profile.config.json',
    targetJobs = null
  } = options;

  let config = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {}
  }
  const dailyLimit = config?.quota?.dailyLimit || 150;

  let jobs = targetJobs;
  if (!jobs) {
    try {
      jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
    } catch (e) {
      throw new Error(`无法读取待投递岗位清单文件 [${jobsPath}]: ${e.message}`);
    }
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️ 待投递岗位列表为空，无需执行。');
    return { successCount: 0, total: 0 };
  }

  let state = {};
  if (existsSync(statePath)) {
    try {
      state = JSON.parse(readFileSync(statePath, 'utf8'));
    } catch {}
  }

  let todaySent = countTodaySent(state);
  console.log(`📊 今日投递额度统计: 今日已投 ${todaySent}/${dailyLimit}，剩余 ${Math.max(0, dailyLimit - todaySent)} 次`);

  if (todaySent >= dailyLimit) {
    console.log(`🛑 [额度熔断] 今日投递已达到平台上限 (${todaySent}/${dailyLimit})！已主动熔断终止投递，隔日再战。`);
    return { successCount: 0, total: jobs.length, rateLimited: true };
  }

  console.log(`🌐 连接 Chrome CDP (端口 ${port})...`);
  const cdp = await attachCdp(port);

  console.log(`🚀 开始执行批量精准投递，本批共 ${jobs.length} 个待投岗位...`);
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < jobs.length; i++) {
    // 检查是否达到每日上限
    if (todaySent >= dailyLimit) {
      console.log(`\n🛑 [额度熔断] 累计投递已达单日上限 (${todaySent}/${dailyLimit})，停止后续投递！`);
      break;
    }

    const j = jobs[i];
    const name = `${j.company} - ${j.title} (${j.salary})`;
    console.log(`\n[${i + 1}/${jobs.length}] 检查并投递: ${name}`);

    if (state[j.id]?.st === 'sent') {
      console.log(`   [=] 历史记录显示此前已投递成功，跳过`);
      skippedCount++;
      continue;
    }

    try {
      await cdp.navigate(j.url);
      await sleep(1500);

      const check = await cdp.evaluate(`(() => {
        const body = document.body.innerText || '';
        const btn = document.querySelector('a.btn-startchat') || document.querySelector('.btn-startchat');
        
        let hasCaptcha = false;
        const dialogs = document.querySelectorAll('.dialog-wrap, .dialog-box, [class*="dialog"], [class*="modal"], [class*="popup"], [class*="captcha"], [class*="verify"]');
        for (const d of dialogs) {
          if (d.offsetParent !== null && /安全验证|滑动验证|拖动滑块|拖动下方滑块|完成拼图|人机验证/.test(d.innerText)) {
            hasCaptcha = true;
            break;
          }
        }

        return {
          btnText: btn ? btn.innerText.trim() : null,
          hasBtn: !!btn,
          captcha: hasCaptcha,
          login: !document.querySelector('a[href*="/web/geek/chat"]') && /登录\\/注册/.test(body)
        };
      })()`);

      if (check.btnText === '继续沟通') {
        console.log('   [=] 按钮显示【继续沟通】，此前已向该 HR 打过招呼，记录并跳过');
        state[j.id] = { st: 'sent', t: new Date().toISOString() };
        skippedCount++;
        writeFileSync(statePath, JSON.stringify(state, null, 2));
        continue;
      }
      if (check.captcha) {
        console.log('🛑 [安全中断] 页面出现滑动验证码！立即暂停自动化，请在浏览器中手动完成验证。');
        break;
      }
      if (check.login) {
        console.log('🛑 [登录失效] 检测到登录凭证已过期，请在浏览器中重新扫码登录！');
        break;
      }
      if (!check.hasBtn) {
        console.log('   [-] 页面未找到沟通按钮（该岗位可能已下线或招满）');
        state[j.id] = { st: 'no-button', t: new Date().toISOString() };
        continue;
      }

      console.log('   ✉️ 触发【立即沟通】...');
      await cdp.evaluate(`(() => {
        const btn = document.querySelector('a.btn-startchat') || document.querySelector('.btn-startchat');
        if (btn) btn.click();
      })()`);
      await sleep(rnd(2500, 3500));

      // 检查弹窗并点击确认发送
      const post = await cdp.evaluate(`(() => {
        const body = document.body.innerText || '';
        const btn = document.querySelector('a.btn-startchat') || document.querySelector('.btn-startchat');
        const cont = btn && /继续沟通/.test(btn.innerText);
        const toast = (body.match(/已发送|打招呼成功|发送成功|操作过于频繁|过于频繁|今日.{0,8}(用完|上限)/) || [null])[0];
        
        // 查找弹窗中的确认/发送按钮
        const sendBtn = Array.from(document.querySelectorAll('button, a, div, span')).find(el => {
          return ['发送', '确定', '打招呼'].includes((el.innerText || '').trim()) && el.offsetParent && !/disable/.test(el.className);
        });
        if (sendBtn) sendBtn.click();

        let hasCaptcha = false;
        const dialogs = document.querySelectorAll('.dialog-wrap, .dialog-box, [class*="dialog"], [class*="modal"], [class*="popup"], [class*="captcha"], [class*="verify"]');
        for (const d of dialogs) {
          if (d.offsetParent !== null && /安全验证|滑动验证|拖动滑块|拖动下方滑块|完成拼图|人机验证/.test(d.innerText)) {
            hasCaptcha = true;
            break;
          }
        }

        return {
          isContinued: cont,
          toast: toast,
          clickedModalSend: !!sendBtn,
          captcha: hasCaptcha
        };
      })()`);

      if (post.clickedModalSend) {
        console.log(`   📩 检测到打招呼确认弹窗，已自动确认点击【发送】...`);
        await sleep(2000);
      }

      if (post.captcha) {
        console.log('🛑 [安全中断] 点击后出现验证码！立即暂停投递！');
        break;
      }
      if (/过于频繁|用完|上限/.test(post.toast || '')) {
        console.log(`🛑 [熔断拦截] 触发平台风控提示: ${post.toast}，立即终止投递！`);
        state[j.id] = { st: 'rate-limit', toast: post.toast, t: new Date().toISOString() };
        break;
      }

      // 再次确认最终按钮文字
      const finalCheck = await cdp.evaluate(`(() => {
        const btn = document.querySelector('a.btn-startchat') || document.querySelector('.btn-startchat');
        return btn ? btn.innerText.trim() : '';
      })()`);

      if (/继续沟通/.test(finalCheck) || post.isContinued || /已发送|打招呼成功|发送成功/.test(post.toast || '')) {
        successCount++;
        todaySent++;
        state[j.id] = { st: 'sent', t: new Date().toISOString() };
        console.log(`   ✅ 成功发送打招呼 (${successCount}/${jobs.length}) | 今日已投: ${todaySent}/${dailyLimit}，剩余: ${Math.max(0, dailyLimit - todaySent)}: ${name}`);
      } else {
        successCount++;
        todaySent++;
        state[j.id] = { st: 'sent', toast: post.toast, t: new Date().toISOString() };
        console.log(`   ✅ 打招呼请求已提交 | 今日已投: ${todaySent}/${dailyLimit}，剩余: ${Math.max(0, dailyLimit - todaySent)}: ${name}`);
      }

    } catch (err) {
      console.log(`   [x] 投递过程异常: ${err.message}`);
    }

    writeFileSync(statePath, JSON.stringify(state, null, 2));

    const wait = rnd(4500, 7500);
    console.log(`   ⏳ 模拟真人行为，随机防风控等待 ${(wait / 1000).toFixed(1)} 秒...`);
    await sleep(wait);
  }

  console.log(`\n🎉 本批次投递任务完成！成功沟通: ${successCount} 个 | 自动跳过已投: ${skippedCount} 个 | 总计处理: ${jobs.length} 个`);
  console.log(`📊 当日最终配额: 今日已投 ${todaySent}/${dailyLimit}，剩余 ${Math.max(0, dailyLimit - todaySent)} 次沟通机会`);
  cdp.close();
  return { successCount, skippedCount, total: jobs.length, todaySent, dailyLimit };
}

// 允许命令行直接执行
if (process.argv[1] && process.argv[1].endsWith('apply-jobs.mjs')) {
  runJobApply({
    port: parseInt(process.env.BOSS_PORT || '9223', 10),
    jobsPath: process.env.BOSS_JOBS || 'approved_jobs.json',
    statePath: process.env.BOSS_STATE || 'state.json',
    configPath: process.env.BOSS_CONFIG || 'profile.config.json'
  }).catch(console.error);
}
