# 🤖 BOSS 直聘智能求职 Agent Skill (BOSS Zhipin Auto-Apply)

<div align="center">

[![Agent Skill](https://img.shields.io/badge/Type-Agent%20Skill-8A2BE2.svg?style=flat-square&logo=openai)](https://github.com/Azusa010/boss-auto-apply)
[![Compatible Agents](https://img.shields.io/badge/Compatible-Antigravity%20%7C%20Claude%20%7C%20Cursor%20%7C%20Windsurf-success.svg?style=flat-square)]()
[![Chrome CDP Native](https://img.shields.io/badge/Chrome-CDP%20Native-orange.svg?style=flat-square&logo=google-chrome)](https://chromedevtools.github.io/devtools-protocol/)
[![Zero External Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Node)-brightgreen.svg?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**专为 AI Coding Agent（智能体）打造的通用求职技能。**  
告别手动配置与写死规则，装载本 Skill 后，你的 AI Agent 将化身为**7×24小时专属求职助理**：自动阅读你的简历、动态推导画像、独立唤起真实浏览器穿透核验岗位正文、人机协同确认，并受控执行防风控投递与 150 次/天额度熔断！

[🚨 风险提示与防封指南](#-风险提示与防封号安全守则重要必读) • [🤖 让 Agent 直接使用](#-方式一让-ai-agent-直接接管推荐) • [💻 开发者手动运行](#-方式二开发者手动运行-cli-模式) • [🛡️ 核心黑科技](#-核心技术亮点为什么传统爬虫驱动会挂) • [⚙️ 配置详解](#-规则配置文件-profileconfigjson) • [⚠️ 免责声明与合规告示](#-免责声明与合规告示-legal-disclaimer--safe-harbor)

</div>

> [!CAUTION]
> **重要警示：任何商业招聘平台的自动化脚本均存在被风控或封号的潜在风险！**  
> 本 Skill 虽内置了 WMI 独立进程隔离、原生 CDP 物理点击、随机拟人停顿、全 JD 学历穿透清洗与 150 次/天硬上限熔断等多重防风控黑科技，但**无法承诺 100% 绝对规避平台风控**。使用前请务必仔细阅读 [🚨 风险提示与防封号安全守则](#-风险提示与防封号安全守则重要必读) 并遵守真实求职规范。

---

## 💡 为什么做成 Agent Skill？

市面上传统的求职脚本大多存在三个致命问题：

1. **规则写死**：换个专业、换个城市、换个学历就得去源码里改一大堆复杂的正则表达式；
2. **极易风控封号**：Selenium/Playwright 打开浏览器自带 WebDriver 指纹，BOSS 页面直接闪退、无限滑块或阻断；
3. **盲投乱投**：只看卡片外层标签（卡片写本科，JD 正文写要求硕士/985），不仅浪费宝贵的每日额度，还容易给 HR 留下不良记录。

**本项目的核心形态是一个 Agent Skill**。它为智能体提供了标准的认知定义（`SKILL.md`）、画像解析工具、WMI 系统级浏览器唤起底座、零依赖 CDP 物理点击驱动及每日 150 次额度守护者。Agent 可以根据你的真实意向，像一个懂求职的真人工程师一样全流程自主完成工作！

---

## 🚨 风险提示与防封号安全守则（重要必读）

### 1. 为什么使用自动化会有封号与风控风险？

BOSS 直聘作为国内头部招聘平台，部署了业界极高强度的风控与反作弊系统（涵盖行为时序模型、设备网络指纹、高频操作探测、HR 反馈画像等多维体系）：

1. **高频爬取与瞬时点击特征**：若短时间内快速翻页、秒级查看大量岗位 JD、并在短时间内连续发起“立即沟通”，其访问时序曲线明显脱离人类生理极限，极易直接触发底层风控阈值；
2. **单日额度聚集消耗**：平台为每位求职者设定了每日主动沟通上限 **150 次**。如果在一个小时甚至十几分钟内迅速耗尽配额，或者连续多日高强度打满，极易被系统标记为“脚本群发”或“非正常求职者”；
3. **安全核验弹窗（极验滑块 / 人脸识别）**：当系统判定环境或行为异常时，会下发极验滑块（Geetest）或短信验证码；严重异常时甚至会要求在**移动端进行真人人脸活体认证**。若自动化脚本无法感知继续强行操作，将导致风控等级瞬间拉满；
4. **低质投递与 HR 反馈惩罚**：若未做精准匹配盲目全投，导致投递不符合岗位基本要求（如学历、工作地、技术栈不符），HR 若频繁点击“不合适”或“举报骚扰”，将直接连带导致个人账号被降权打入小黑屋；
5. **平台惩罚机制梯度**：
   - 🟡 **轻度（限频/限额）**：当日打招呼功能被临时禁用，提示“操作过于频繁”或今日沟通额度提前清零；
   - 🟠 **中度（功能冻结）**：账号被临时封禁 24 小时至 7 天，强制要求人脸识别认证解封；
   - 🔴 **重度（永久封号）**：账号永久封禁、实名身份证与手机号被列入平台黑名单，无法再次注册或解封。

---

### 2. 本 Skill 已内置的防风控与抗封护城河

为了将封号风险降至最低，本项目绝不使用粗暴的爬虫手法，在底层架构上做了大量拟人化设计：

- 🛡️ **WMI 独立系统 Chrome 唤起**：坚决摒弃原生 Playwright/Selenium 驱动，通过 Windows WMI 唤起本地真实独立 Chrome，彻底根除 `navigator.webdriver` 自动化标识；
- 🖱️ **原生 CDP 物理级鼠标操作**：基于 DevTools Protocol 派发底层操作系统级 `Input.dispatchMouseEvent` 物理轨迹（MouseMove -> MouseDown -> MouseUp），绕过 DOM 层面的 JS 人机监听；
- ⏳ **拟人化随机沉睡节奏**：每次浏览与打招呼之间强制保留 **4.5 ~ 7.5 秒** 的随机等待时间，真实模拟人类阅读与操作停顿；
- 🎯 **JD 正文穿透核验 + 人机协同双保险**：在投递前深度穿透正文排查学历与技术匹配，且**强制生成 Markdown 清单等待用户人工确认**，杜绝错投乱投引起的 HR 投诉；
- 🛑 **主动安全熔断机制**：单日接近或达到 150 次时自动熔断停止；若遇到滑块或验证码弹窗立即停止投递并告警，坚决杜绝盲目重试。

---

### 3. 🛡️ 用户的防封黄金安全守则（切记遵守！）

**自动化是求职的辅助器，绝不能当作“无脑轰炸机”。** 为了您宝贵的主账号安全，请务必遵守以下原则：

1. **切忌贪多求快，小批量适度投递**：
   - 推荐**每次单批次筛选 10 ~ 20 个** 精准岗位投递；
   - 单日投递量建议控制在 **30 ~ 60 次** 优质沟通即可。**极不建议每天顶格打满 150 次**，留有余地最安全。
2. **模拟真人作息，挑选黄金时段投递**：
   - 推荐在工作日 HR 在线高峰期运行（**上午 09:30 ~ 11:30**，**下午 14:00 ~ 18:00**）；
   - **切勿在深夜或凌晨（如 00:00 ~ 06:00）运行**，夜间高频操作极易被平台直接判定异常。
3. **遇到滑块或验证码，严禁暴力重试**：
   - 脚本检测到验证码会自动停止退出。此时请**在独立 Chrome 窗口中手动滑动完成验证**；
   - 人工验证通过后，**建议将账号静置 1 ~ 2 小时**后再继续投递，切忌反复拉起脚本。
4. **保持主号正常的“真人使用习惯”**：
   - 在投递之余，日常多用手机 BOSS App 查看 HR 回复、正常打字沟通、浏览公司主页；
   - 正常的聊天互动和 APP 端活跃度能显著提升平台对该账号的真人信任评级。

---

### 第一步：将本 Skill 装入你的 Agent

**方法 A：直接对 Agent 发送安装指令**
> `帮我安装这个 skill: https://github.com/Azusa010/boss-auto-apply`

**方法 B：克隆到对应 Agent 技能目录**
```powershell
# 针对当前项目（Project-level Skill）
git clone https://github.com/Azusa010/boss-auto-apply.git .agents/skills/boss-auto-apply

# 或者针对全局智能体（Global Skill，对所有项目生效）
git clone https://github.com/Azusa010/boss-auto-apply.git ~/.gemini/config/skills/boss-auto-apply
# （如使用 Claude / Cursor / Windsurf 等，放到对应 Agent 识别的 skills 目录下即可）
```

### 第二步：用自然语言向 Agent 发送指令

无需记忆任何脚本命令，你只需要把简历放在当前工作区，对 Agent 说一句话：

> **“帮我读一下当前目录里的简历，在 BOSS 直聘筛选匹配的实习岗位并准备投递”**

或者在没有简历时直接吩咐：

> **“我想找杭州的 Java 后端校招岗位，帮我自动在 BOSS 直聘上筛选真实合适的岗位”**

---

### 🧠 Agent 自主执行流 (Agent Autonomy Flow)

一旦唤醒，Agent 将严格按照 `SKILL.md` 的规范自主闭环以下流程：

```mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant Agent as AI Agent (智能体)
    participant Browser as 独立系统 Chrome
    participant Boss as BOSS 直聘平台

    User->>Agent: "帮我找找匹配的岗位并投递"
    Note over Agent: 1. 画像感知 (阅读简历 / 交互提问)
    alt 工作区存在简历
        Agent->>Agent: 自动调用 parse-resume.py 抽取学历、年届、技术栈
    else 无简历文件
        Agent->>User: 发起标准 4 连问 (身份/学历/技术方向/城市偏好)
        User->>Agent: 回答问题
    end
    Agent->>Agent: 动态生成专属 profile.config.json

    Note over Agent,Browser: 2. 独立浏览器环境唤起
    Agent->>Browser: 调用 launch-chrome.ps1 (WMI 独立进程唤起真实 Chrome)
    Agent->>Browser: 检查用户登录状态 (若未登录引导用户扫码)

    Note over Agent,Boss: 3. 增量扫描与深度穿透核验
    Agent->>Browser: 运行 screen-jobs.mjs
    Browser->>Boss: 检索岗位列表 -> 过滤3日内活跃HR -> 深入岗位详情正文
    Note over Agent: 拆穿卡片虚假标签，Unicode NFKC 穿透过滤硕博/名校门槛
    Agent->>User: 4. 输出结构化 Markdown 岗位审查表格，请求确认

    Note over User,Agent: 5. 人机协同审查协议
    User->>Agent: "确认投递" 或 "剔除第2个，其余投递"

    Note over Agent,Boss: 6. 批量精准投递与 150 次额度管理
    Agent->>Browser: 运行 apply-jobs.mjs (派发真实物理鼠标事件)
    Browser->>Boss: 点击立即沟通 -> 处理确认弹窗 -> 捕获发送成功 Toast
    Note over Agent: 4.5~7.5s 随机沉睡 + 动态追踪 [今日已投 X/150，剩余 Y]
    Agent->>User: 输出完整投递战报与配额剩余总结
```

---

## 💻 方式二：开发者手动运行 (CLI 模式)

如果你不使用 Agent，也可以像传统开发者一样在命令行中分步手动执行：

### 1. 环境准备

- Windows 10 / 11
- Node.js `>= 20.0.0`
- Python `>= 3.10`（若使用 PDF 解析需安装 `pip install pypdf`）
- 电脑已安装 Google Chrome

### 2. 生成画像配置

```powershell
# 方式 A：从简历自动生成
python scripts/parse-resume.py "你的简历路径.pdf" --output profile.config.json

# 方式 B：根据模板手动配置
cp templates/profile.config.example.json profile.config.json
# 编辑 profile.config.json 填入意向城市、技术栈与过滤规则
```

### 3. 独立拉起 Chrome

```powershell
powershell -ExecutionPolicy Bypass -File scripts/launch-chrome.ps1
```

*在打开的独立 Chrome 窗口中扫码登录一次即可，登录态会自动持久化到本地目录。*

### 4. 执行智能筛选与穿透核验

```powershell
node scripts/screen-jobs.mjs
```

*脚本会自动爬取、深度核验 JD 正文并将合格岗位保存至 `approved_jobs.json`。*

### 5. 执行批量精准投递

```powershell
node scripts/apply-jobs.mjs
```

*控制台将实时输出投递进度、防风控随机等待时长，以及单日额度追踪（如 `今日已投: 32/150，剩余: 118`）。*

---

## 🛡️ 核心技术亮点（为什么传统爬虫/驱动会挂？）

| 对比维度       | 传统自动化脚本 (Selenium/Playwright)                 | 本 Agent Skill 方案                                                              |
|:---------- |:--------------------------------------------- |:----------------------------------------------------------------------------- |
| **浏览器启动**  | 原生 WebDriver 驱动，自带指纹特征，易被反爬盾检测导致**无限滑块或进程闪退** | **WMI 独立进程唤起**：通过 Windows 系统底座唤起真实 Chrome，完全脱离自动化进程树                          |
| **CDP 通信** | 依赖庞大的第三方 npm 驱动包                              | **原生零依赖**：直接使用 Node.js 20+ 原生 `WebSocket` 和 `fetch` 连接 DevTools Protocol      |
| **点击行为**   | `element.click()` 触发 DOM 伪造事件，极易被反爬监听         | **真实物理鼠标事件**：派发 `Input.dispatchMouseEvent`（MouseMove -> MouseDown -> MouseUp） |
| **学历核验**   | 仅核验外层卡片标签（常被卡片“本科”忽悠，内文却写“硕博优先”）              | **JD 正文深度穿透**：深入 `.job-sec-text` 正文，执行 **Unicode NFKC 归一化** 并应用动态排他正则         |
| **额度管控**   | 盲目持续循环，容易触发 BOSS 平台封锁                         | **单日 150 次硬上限熔断**：实时统计当日投递数量，触达上限主动终止保护账号                                     |
| **人机协同**   | 盲目全投，缺乏人工核准                                   | **强制审查协议**：筛选后必须生成 Markdown 清单停下等待确认，杜绝误投                                     |

---

## ⚙️ 规则配置文件 (`profile.config.json`)

Agent 在执行时会自动为你生成或读取该文件，你也可以随时按需调整：

```jsonc
{
  "candidate": {
    "name": "张三",
    "degree": "bachelor",            // 学历: bachelor(本科) / master(硕士) / phd(博士) / junior_college(专科)
    "degreeLevelText": "统招本科",
    "gradYear": 2026,                // 毕业年份
    "currentStatus": "在校生",       // 状态: 在校生 / 应届生 / 离职
    "schoolType": "综合类普通高校",
    "targetRoleType": "intern",      // 类型: intern(实习) / campus(校招) / fulltime(社招)
    "cityCode": "100010000",         // 城市编码 (可在 BOSS 网页 URL 获取，100010000 为全国)
    "cityName": "全国",
    "allowRemote": true              // 是否包含远程岗位
  },
  "matchingRules": {
    "targetTechKeywords": [          // 正向匹配技术词
      "后端开发", "全栈开发", "Python", "Java", "AI应用"
    ],
    "mustHaveDevKeywords": [         // 研发属性必须包含的词 (排除非技术岗位)
      "开发", "研发", "工程", "技术", "软件", "实习生"
    ],
    "excludeTitleRegex": "(销售|商务|运营|客服|人事|行政|管培生|数据标注|文员)", // 严格排除的岗位标题正则
    "excludeDegreeRegex": "(硕士及以上|研究生及以上|博士研究生|仅限硕士|硕士优先|研究生优先|博士优先|985/211优先)", // 完整 JD 正文排他正则
    "blacklistCompanies": [          // 排除企业黑名单
      "某某公司A", "某某外包公司B"
    ],
    "maxRecruiterInactiveDays": 3,   // HR 活跃度阈值 (默认只投 3 日内活跃)
    "ignoreCompanyScale": true       // 是否忽略公司规模 (初创至大厂均不限)
  },
  "searchTasks": [                   // 检索词任务列表
    { "kw": "后端开发 实习", "maxPages": 2 },
    { "kw": "Python开发 实习", "maxPages": 2 }
  ],
  "execution": {
    "port": 9223,                    // Chrome CDP 调试端口
    "dailyQuota": 150,               // 每日沟通上限熔断值 (BOSS 平台单日最多 150)
    "batchTargetCount": 10,          // 单批次目标岗位数
    "statePath": "state.json",       // 投递状态去重归档文件
    "outputPath": "approved_jobs.json"
  }
}
```

---

## 📁 技能文件结构

```text
boss-auto-apply/
├── SKILL.md                          # 核心技能规范文档 (供 Agent 读取理解执行 SOP)
├── README.md                         # 详细使用指南 (同时面向 Agent 与开发者)
├── .gitignore                        # Git 忽略配置 (自动保护个人求职状态与配置)
├── templates/
│   └── profile.config.example.json   # 脱敏的规则配置模板
├── scripts/
│   ├── parse-resume.py               # 简历自动抽取工具 (支持 PDF/MD/TXT)
│   ├── launch-chrome.ps1             # WMI 进程隔离独立拉起系统 Chrome 脚本
│   ├── cdp-client.mjs                # 原生 WebSocket CDP 通信轻量底座 (零三方依赖)
│   ├── screen-jobs.mjs               # 动态配置驱动的增量扫描与 JD 穿透核验脚本
│   └── apply-jobs.mjs                # 物理事件打招呼、150次额度统计与持久化脚本
└── references/
    └── resume-parsing-guide.md       # 简历提取规则与交互式提问 SOP 操作指南
```

---

## ⚠️ 免责声明与合规告示 (Legal Disclaimer & Safe Harbor)

> [!IMPORTANT]
> **请在克隆、下载、阅读或运行本项目之前，务必仔细、完整阅读本声明。**  
> 任何直接或间接使用本仓库代码、文档或衍生工具的行为，均被视为已无条件阅读、理解并完全同意接受本声明所列全部条款。如您不同意本声明的任何条款，请立即关闭页面并删除本仓库的一切相关代码与文件。

### 1. 📢 权利人即时下架承诺 (Notice and Takedown)
- **绝对尊重平台权益**：本项目完全尊重 BOSS 直聘（北京看准科技有限公司及相关运营主体）等商业平台的合法知识产权、计算机系统安全性与网络运营秩序；
- **通知即下架 (Immediate Takedown)**：**若相关平台官方、版权方、法务部门或监管机构认为本项目存在侵权、不当竞争、违反平台服务协议或可能造成任何潜在负面影响，请通过 GitHub Issue 或在平台向作者发出通知。作者郑重承诺：将在收到通知后第一时间响应，无条件配合修改、暂停服务或彻底删除下架本开源仓库！**

### 2. 🎓 纯学术研究与技术探讨目的 (Academic & Research Only)
- 本项目系开发者在个人求职探索阶段，出于对 **AI Agent（智能体）与现代浏览器自动化协同交互范式** 的技术可行性研究所编写，仅供个人技术探索、学术交流与自动化效率学习使用；
- 本项目**严禁用于任何商业牟利、黑灰产代投、批量骚扰、爬虫数据售卖或不正当竞争活动**；作者未通过本项目获取任何直接或间接的经济利益，亦不提供任何商业付费定制与技术支持服务。

### 3. 🛡️ 技术中立性与非侵入性声明 (Neutrality & Non-intrusion)
- **标准开放协议**：本工具仅依托于 Google Chrome 官方公开的标准 DevTools Protocol (CDP) 调试协议，通过系统常规事件模拟辅助操作，本质上等同于“由代码辅助执行的人工浏览操作”；
- **非破解性质**：本工具**绝不包含任何反向工程、破解逆向、协议解密、脱机抓包、绕过平台支付或安全验证体系**的代码，未对平台任何核心加密接口或数据库构成非法侵入，亦不对平台服务器造成任何异常高频并发或恶意负载压力。

### 4. 🔒 零数据收集与本地隐私保障 (Zero Data Collection)
- **100% 本地运行**：本工具所有逻辑均在使用者本地电脑（Localhost）执行，零远程第三方服务器中转；
- **无隐私窥探**：项目不包含任何数据埋点、上报或远程回传逻辑。使用者的简历内容、求职意向、聊天记录、Cookie 登录凭证等敏感信息均完整且仅保存在使用者自己的设备上，开发者无法且不会收集任何用户数据。

### 5. ⚖️ 用户自主行为与责任完全自负 (Indemnity & Limitation of Liability)
- **使用者全责**：本项目的代码与文档仅作为中立的技术示例提供。使用者如何配置、何时运行、以何种频次使用，均属于使用者的个人独立民事行为；
- **平台风控与封号风险自担**：商业招聘平台均拥有独立且严密的反自动化与风控机制，使用者因使用、修改或滥用本工具而导致的**任何账号功能受限、沟通额度被清零、被要求二次活体/人脸核验、临时冻结乃至永久封禁、求职失利等一切直接或间接后果，均由使用者自行完全承担**；
- **免除连带责任**：作者在任何情况下均不对使用者的违规使用、滥用、超频投递行为，以及由此导致的任何民事、行政或刑事法律纠纷承担任何直接、间接或连带赔偿责任。

### 6. 📜 法律合规与平台守则遵循
- 使用者在使用本工具时，必须严格遵守《中华人民共和国网络安全法》《中华人民共和国数据安全法》以及 [BOSS 直聘用户服务协议](https://www.zhipin.com/) 等相关法律法规及平台公约；
- 严禁利用本工具进行高频批量骚扰、发布虚假信息、恶意欺诈 HR 或进行任何破坏招聘市场公平生态的行为。

---

<div align="center">

如果这个 Agent Skill 帮你在求职路上省下了宝贵的时间，欢迎点亮右上角的 ⭐️ **Star**！

</div>
