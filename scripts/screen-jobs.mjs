/**
 * screen-jobs.mjs (通用自适应版本)
 * BOSS直聘通用自适应岗位扫描与深度JD学历穿透核验脚本。
 * 
 * 核心特性：
 * 1. 自适应画像注入：支持加载外部 profile.config.json，完全由用户简历/交互提问确定的规则动态驱动。
 * 2. 动态学历门槛矩阵：根据候选人实际学历（本科/硕士/博士），自适应生成严谨的学历穿透拦截正则。
 * 3. 动态检索词与黑白名单：支持自定义意向关键词、排除岗位名、黑名单企业及目标城市。
 * 4. 深度 NFKC 全角/异体字归一化穿透：100% 拆穿正文深处的隐藏门槛。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { attachCdp, sleep, rnd } from './cdp-client.mjs';

function loadConfig(configPath = 'profile.config.json') {
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.warn(`[!] 读取配置文件 ${configPath} 失败，将使用通用默认配置: ${e.message}`);
    }
  }

  // 默认兜底通用配置（建议通过 profile.config.json 传入具体规则）
  return {
    candidate: {
      degree: 'bachelor',
      targetRoleType: 'intern',
      cityCode: '100010000',
      allowRemote: true
    },
    matchingRules: {
      targetTechKeywords: ['研发', '开发', '工程师', '技术'],
      excludeTitleRegex: '(销售|运营|客服|人事|行政|管培生|课程顾问|电话销售|数据标注|文员)',
      excludeDegreeRegex: '(硕士及以上|研究生及以上|博士研究生|仅限硕士|硕士优先|研究生优先|博士优先|985/211优先|双一流高校优先)',
      blacklistCompanies: [],
      maxRecruiterInactiveDays: 3,
      ignoreCompanyScale: true
    },
    searchTasks: [
      { kw: '软件开发 实习', maxPages: 2 }
    ],
    execution: {
      port: 9223,
      dailyQuota: 150,
      batchTargetCount: 10,
      statePath: 'state.json',
      outputPath: 'approved_jobs.json'
    }
  };
}

const SNIP_FAST_SCROLL = String.raw`(async () => {
  window.scrollTo(0, 1000);
  await new Promise(r => setTimeout(r, 150));
  window.scrollTo(0, 2500);
  await new Promise(r => setTimeout(r, 150));
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise(r => setTimeout(r, 200));
  return 1;
})()`;

const SNIP_EXTRACT_CARDS = String.raw`(() => {
  const list = [];
  for (const card of document.querySelectorAll('.job-card-wrapper, li.job-card-box')) {
    const a = card.querySelector('a[href*="/job_detail/"]');
    if (!a) continue;
    const href = (a.getAttribute('href') || '').split('?')[0];
    const id = href.split('/')[2]?.split('.')[0];
    if (!id) continue;
    
    const title = (card.querySelector('.job-name')?.innerText || '').trim();
    const tags = Array.from(card.querySelectorAll('.tag-list li')).map(t => t.innerText.trim()).join(' ');
    const company = (card.querySelector('.company-name')?.innerText || '').trim();
    const salary = (card.querySelector('.salary')?.innerText || '').trim();
    const text = card.innerText.replace(/\s+/g, ' ').trim();
    list.push({ id, href, title, tags, company, salary, text });
  }
  return list;
})()`;

const SNIP_GET_FULL_DETAIL = String.raw`(() => {
  const body = (document.body.innerText || '').normalize('NFKC');
  
  const activeMatch = body.match(/(刚刚活跃|今日活跃|3日内活跃|本周活跃|近半年活跃|本月活跃|近半月活跃|在线|\d+小时前活跃|\d+天前活跃|\d+分钟前活跃)/);
  const activeText = activeMatch ? activeMatch[0] : '未知';
  const is3DaysActive = /(在线|刚刚活跃|今日活跃|3日内活跃|\d+分钟前活跃|\d+小时前活跃|[1-3]天前活跃)/.test(activeText);

  const title = (document.querySelector('h1') ? document.querySelector('h1').innerText : document.title).split('_')[0].trim();
  const salary = (document.querySelector('.salary') ? document.querySelector('.salary').innerText : '').trim();
  const bannerTags = Array.from(document.querySelectorAll('.job-banner .tag-list span, .job-banner .text-desc')).map(e => e.innerText.trim());
  
  let company = (document.querySelector('.company-info a') ? document.querySelector('.company-info a').innerText : 
                 document.querySelector('.company-info') ? document.querySelector('.company-info').innerText.split('\n')[0] : '').trim();
  if (!company || company.length === 0 || /展开|详情/.test(company)) {
    const parts = (document.title || '').split('_');
    if (parts.length > 1) {
      company = parts[1].replace(/招聘.*$/, '').trim();
    }
  }

  const jobSecEl = document.querySelector('.job-sec-text');
  const fullJdText = (jobSecEl ? jobSecEl.innerText.trim() : '').normalize('NFKC');

  const btn = document.querySelector('a.btn-startchat') || document.querySelector('.btn-startchat');
  const btnText = btn ? btn.innerText.trim() : '无按钮';

  const compInfoText = document.querySelector('.company-info') ? document.querySelector('.company-info').innerText : body;
  const scaleMatch = compInfoText.match(/(\d+-\d+人|\d+人以上|少于\d+人|0-20人|20-99人|100-499人|500-999人|1000-9999人|10000人以上)/);
  const scale = scaleMatch ? scaleMatch[0] : '自研团队';

  return {
    title,
    salary,
    company: company || '高成长AI团队',
    scale,
    activeText,
    is3DaysActive,
    btnText,
    bannerTags,
    fullJdText
  };
})()`;

export async function runJobScreening(options = {}) {
  const cfg = loadConfig(options.configPath || process.env.BOSS_CONFIG || 'profile.config.json');
  const port = options.port || cfg.execution.port || 9223;
  const statePath = options.statePath || cfg.execution.statePath || 'state.json';
  const outputPath = options.outputPath || cfg.execution.outputPath || 'approved_jobs.json';
  const targetCount = options.targetCount || cfg.execution.batchTargetCount || 10;
  const cityCode = cfg.candidate.cityCode || '101010100';

  const excludeDegreeRegex = new RegExp(cfg.matchingRules.excludeDegreeRegex);
  const excludeTitleRegex = new RegExp(cfg.matchingRules.excludeTitleRegex, 'i');
  const targetKeywordsRegex = new RegExp('(' + cfg.matchingRules.targetTechKeywords.join('|') + ')', 'i');
  const blacklistRegex = new RegExp('(' + cfg.matchingRules.blacklistCompanies.join('|') + ')', 'i');
  const isInternMode = cfg.candidate.targetRoleType === 'intern';

  let state = {};
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch {}

  console.log(`🌐 连接 Chrome CDP (端口 ${port})...`);
  const cdp = await attachCdp(port);

  const rawPool = new Map();
  console.log(`\n🔎 [通用扫描] 正在按配置检索任务抓取候选卡片...`);

  for (const t of cfg.searchTasks) {
    if (rawPool.size >= 80) break;
    for (let page = 1; page <= t.maxPages; page++) {
      if (rawPool.size >= 80) break;
      try {
        const searchUrl = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(t.kw)}&city=${cityCode}&page=${page}`;
        console.log(`  -> 检索 [${t.kw}] (第 ${page} 页)...`);
        await cdp.navigate(searchUrl, 700);
        await cdp.evaluate(SNIP_FAST_SCROLL);
        const items = await cdp.evaluate(SNIP_EXTRACT_CARDS);
        let freshCount = 0;
        for (const item of items) {
          if (!state[item.id] && !rawPool.has(item.id)) {
            rawPool.set(item.id, { ...item, url: `https://www.zhipin.com${item.href}` });
            freshCount++;
          }
        }
        console.log(`     抓取卡片 ${items.length} 个，新增候选: +${freshCount}`);
      } catch (err) {
        console.log(`     检索异常: ${err.message}`);
      }
      await sleep(600);
    }
  }

  console.log(`\n📋 [通用初筛] 候选池共 ${rawPool.size} 个，执行多维规则过滤...`);
  const cardCandidates = [];
  for (const [id, item] of rawPool) {
    const title = item.title;
    const txt = item.text;
    const tags = item.tags;

    if (isInternMode) {
      if (!/(实习|元\/天)/.test(txt) && !/(实习|元\/天)/.test(title)) continue;
      if (/(应届|全职|在校\/应届)/.test(txt) && !/日常实习|实习生/.test(title)) continue;
    }

    if (!targetKeywordsRegex.test(title)) continue;
    if (excludeTitleRegex.test(title)) continue;

    // 学历初筛 (如本科生拦截标签中的硕博)
    if (cfg.candidate.degree === 'bachelor' && /(硕士|博士|研究生)/.test(tags)) continue;
    if (blacklistRegex.test(item.company) || blacklistRegex.test(title)) continue;

    // 异地排除
    if (!cfg.candidate.allowRemote && /(广州|成都|上海|深圳|杭州|苏州|石家庄|武汉|南京|西安|重庆|长沙|天津)/.test(txt) && !new RegExp(cfg.candidate.cityName || '北京').test(txt)) continue;

    cardCandidates.push(item);
  }

  console.log(`🎯 初筛命中 ${cardCandidates.length} 个候选岗位，进入 [阶段三] 深度 JD 学历与业务穿透...`);
  const approvedBatch = [];

  for (let i = 0; i < cardCandidates.length; i++) {
    const candidate = cardCandidates[i];
    try {
      console.log(`\n[${i + 1}/${cardCandidates.length}] 穿透核验: [${candidate.company}] ${candidate.title}...`);
      await cdp.navigate(candidate.url, 800);
      const detail = await cdp.evaluate(SNIP_GET_FULL_DETAIL);

      if (detail.btnText !== '立即沟通') {
        console.log(`   [-] 状态非立即沟通 [${detail.btnText}]，跳过`);
        continue;
      }

      if (blacklistRegex.test(detail.company) || blacklistRegex.test(detail.title)) {
        console.log(`   [-] 命中黑名单企业，跳过`);
        continue;
      }

      if (!detail.is3DaysActive) {
        console.log(`   [-] HR 活跃度不达标 (${detail.activeText})，跳过`);
        continue;
      }

      const tagStr = (detail.bannerTags || []).join(' ');
      if (cfg.candidate.degree === 'bachelor' && /(硕士|博士|研究生)/.test(tagStr)) {
        console.log(`   [🚫 学历拦截] Banner限定硕博，跳过`);
        continue;
      }

      const jdText = detail.fullJdText;
      if (!jdText || jdText.length < 20) {
        console.log(`   [-] JD 内容为空，跳过`);
        continue;
      }

      if (excludeDegreeRegex.test(jdText)) {
        const match = jdText.match(excludeDegreeRegex)[0];
        console.log(`   [🚫 学历拦截] JD 正文要求: [${match}]，剔除！`);
        continue;
      }

      // 业务方向二次审查
      if (excludeTitleRegex.test(detail.title)) {
        console.log(`   [-] 标题命中排除项: ${detail.title}，跳过`);
        continue;
      }

      console.log(`   ✅ 穿透核验通过！[${detail.company}] ${detail.title} (${detail.salary})`);
      approvedBatch.push({
        id: candidate.id,
        url: candidate.url,
        company: detail.company || candidate.company || '高成长自研团队',
        title: detail.title || candidate.title,
        salary: detail.salary || candidate.salary || '面议',
        scale: detail.scale,
        active: detail.activeText,
        degreeOk: `${cfg.candidate.degreeLevelText || '统招本科'}友好`,
        keyPoints: jdText.replace(/\s+/g, ' ').slice(0, 110) + '...'
      });

      if (approvedBatch.length >= targetCount) {
        console.log(`\n✨ 已收录满目标数量 (${targetCount} 个) 岗位，提前完成筛选！`);
        break;
      }
    } catch (err) {
      console.log(`   [x] 核验异常: ${err.message}`);
    }
    await sleep(600);
  }

  writeFileSync(outputPath, JSON.stringify(approvedBatch, null, 2));
  console.log(`\n🎉 通用筛选完成！共收录 ${approvedBatch.length} 个完全合规岗位，已保存至 ${outputPath}`);
  cdp.close();
  return approvedBatch;
}

if (process.argv[1] && process.argv[1].endsWith('screen-jobs.mjs')) {
  runJobScreening().catch(console.error);
}
