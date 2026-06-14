# Claude Code Workflows 完全指南：多智能体编排让 AI 团队自己干活


> 三大原语搭团队，四种模式定协作——你不是在写 Workflow 脚本，你是在设计 AI 团队的架构。

---

## 前言

MCP 那篇结尾留了一句话："既然单次输出不可控，就用多个独立 Agent 交叉验证、对抗审查、锦标赛选优，把概率压到无限逼近确定。那是下一篇的事了。"

这篇就是了。

系列前四篇构建了单 Agent 的能力栈：Tool 给手脚，Plugin 给装备，Hooks 给神经反射，Skill 给大脑皮层。但有一个根本局限始终没打破——**一个模型，一次输出，一个视角，没有内部验证机制。**

你让 Claude 审查自己写的代码？它会倾向于说"looks good"。你让它找自己设计中的漏洞？它和你一样——对自己的作品有盲区。这是 LLM 的结构性缺陷，不是 prompt 能解决的。

Workflow 的解法不是做一个更好的 Agent，而是**让多个 Agent 互相审查**。一个写，一个挑刺；三个独立设计方案，架构师选最优。从"做一个好 Agent"变成"设计一个好团队"。

**而且，最重要的一点——Workflow 脚本是 Claude 生成的，不是你手写的。** 你在前四篇学会了怎么配 Claude Code、怎么扩展它、怎么定制它的行为。到了 Workflow，角色变了：Claude 是脚本作者，你是架构师。你的工作不是写 `agent()` 和 `pipeline()` 代码，而是理解这三种原语能搭出什么结构，然后把任务描述清楚，让 Claude 生成对的 Workflow。

读完你会知道：
- agent() / parallel() / pipeline() 三种原语各自的定位和组合方式
- Pipeline vs Barrier 的核心区别，以及为什么默认选 Pipeline
- 四种经典编排模式：对抗验证、循环稳定、评审团、ultracode
- 什么时候用 Workflow，什么时候用 Sub-agent，什么时候单 Agent 足够
- 沙箱约束为什么不是限制而是 feature

五篇文章走完，你从"Claude Code 用户"变成"AI 开发团队架构师"。

> Workflow 是 2026 年 5 月下旬随 Claude Code v2.1.154 推出的功能，目前仍在快速迭代。本文基于当前版本——核心概念（三大原语、Barrier/Pipeline、对抗验证）不大可能变，但具体 API 和限制可能调整。

---

## 1. 第五层：跨五层的质变

先看一下目前系列覆盖的完整技术栈：

<figure><svg id="five-layer-model" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 410" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="l5w" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#fb7185"/></linearGradient><linearGradient id="l4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="l3h" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="l2p" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="l1t" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.10"/></filter></defs><!-- Workflow layer (top, new) --><g filter="url(#sh)"><rect x="40" y="12" width="600" height="68" rx="8" fill="#fff" stroke="#f43f5e" stroke-width="2"/><rect x="40" y="12" width="600" height="38" rx="8" fill="url(#l5w)"/><rect x="40" y="42" width="600" height="8" fill="url(#l5w)"/><circle cx="66" cy="31" r="12" fill="#fff" opacity="0.25"/><text x="66" y="36" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">⑤</text><text x="88" y="36" fill="#fff" font-size="14" font-weight="700" font-family="system-ui,sans-serif">Workflow</text><text x="192" y="36" fill="rgba(255,255,255,0.8)" font-size="11" font-family="system-ui,sans-serif">多智能体编排 — 谁来做？</text><rect x="526" y="17" width="102" height="22" rx="11" fill="#fff" opacity="0.20"/><text x="577" y="32" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">本文主题</text><text x="56" y="68" fill="#374151" font-size="12" font-family="system-ui,sans-serif">编排多个 Agent 协作：谁负责哪一块、谁审谁的代码、遇到分歧怎么裁决。</text></g><!-- Dashed lines from Workflow to Agent instances --><line x1="180" y1="80" x2="140" y2="102" stroke="#f43f5e" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/><line x1="350" y1="80" x2="350" y2="102" stroke="#f43f5e" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/><line x1="520" y1="80" x2="560" y2="102" stroke="#f43f5e" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/><!-- Agent instance 1 --><rect x="90" y="104" width="100" height="22" rx="5" fill="#fff1f2" stroke="#f43f5e" stroke-width="0.8" opacity="0.7"/><text x="140" y="119" text-anchor="middle" fill="#be123c" font-size="9" font-weight="600" font-family="system-ui,sans-serif">Agent A</text><!-- Agent instance 2 --><rect x="300" y="104" width="100" height="22" rx="5" fill="#fff1f2" stroke="#f43f5e" stroke-width="0.8" opacity="0.7"/><text x="350" y="119" text-anchor="middle" fill="#be123c" font-size="9" font-weight="600" font-family="system-ui,sans-serif">Agent B</text><!-- Agent instance 3 --><rect x="510" y="104" width="100" height="22" rx="5" fill="#fff1f2" stroke="#f43f5e" stroke-width="0.8" opacity="0.7"/><text x="560" y="119" text-anchor="middle" fill="#be123c" font-size="9" font-weight="600" font-family="system-ui,sans-serif">Agent C</text><!-- Arrow 5→4 --><line x1="340" y1="128" x2="340" y2="146" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,142 340,146 344,142" fill="#d1d5db"/><!-- Skill layer --><g filter="url(#sh)"><rect x="40" y="148" width="600" height="54" rx="8" fill="#fff" stroke="#10b981" stroke-width="1.5"/><rect x="40" y="148" width="600" height="28" rx="8" fill="url(#l4)"/><rect x="40" y="170" width="600" height="6" fill="url(#l4)"/><circle cx="66" cy="162" r="10" fill="#fff" opacity="0.25"/><text x="66" y="166" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">④</text><text x="84" y="166" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Skill</text><text x="146" y="166" fill="rgba(255,255,255,0.75)" font-size="10" font-family="system-ui,sans-serif">方法论 — 怎么做</text><text x="56" y="194" fill="#374151" font-size="11" font-family="system-ui,sans-serif">定义一套规范：先干啥、再干啥、不能干啥。这是行为编码。</text></g><!-- Arrow 4→3 --><line x1="340" y1="202" x2="340" y2="208" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,207 340,211 344,207" fill="#d1d5db"/><!-- Hooks layer --><g filter="url(#sh)"><rect x="40" y="212" width="600" height="54" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="40" y="212" width="600" height="28" rx="8" fill="url(#l3h)"/><rect x="40" y="234" width="600" height="6" fill="url(#l3h)"/><circle cx="66" cy="226" r="10" fill="#fff" opacity="0.25"/><text x="66" y="230" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">③</text><text x="84" y="230" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Hooks</text><text x="154" y="230" fill="rgba(255,255,255,0.75)" font-size="10" font-family="system-ui,sans-serif">自动化 — 什么时候触发</text><text x="56" y="258" fill="#374151" font-size="11" font-family="system-ui,sans-serif">在正确的时间触发正确的事。但不告诉模型"怎么做"。</text></g><!-- Arrow 3→2 --><line x1="340" y1="266" x2="340" y2="272" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,271 340,275 344,271" fill="#d1d5db"/><!-- Plugin/MCP layer --><g filter="url(#sh)"><rect x="40" y="276" width="600" height="54" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="40" y="276" width="600" height="28" rx="8" fill="url(#l2p)"/><rect x="40" y="298" width="600" height="6" fill="url(#l2p)"/><circle cx="66" cy="290" r="10" fill="#fff" opacity="0.25"/><text x="66" y="294" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">②</text><text x="84" y="294" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Plugin / MCP 服务</text><text x="228" y="294" fill="rgba(255,255,255,0.75)" font-size="10" font-family="system-ui,sans-serif">能力边界 — 能做什么</text><text x="56" y="322" fill="#374151" font-size="11" font-family="system-ui,sans-serif">Plugin 注入提示词 + Skill；MCP 暴露 Tool/Resource/Prompt 供模型调用。</text></g><!-- Arrow 2→1 --><line x1="340" y1="330" x2="340" y2="336" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,335 340,339 344,335" fill="#d1d5db"/><!-- Tool layer (bottom) --><g filter="url(#sh)"><rect x="40" y="340" width="600" height="54" rx="8" fill="#fff" stroke="#06b6d4" stroke-width="1.5"/><rect x="40" y="340" width="600" height="28" rx="8" fill="url(#l1t)"/><rect x="40" y="362" width="600" height="6" fill="url(#l1t)"/><circle cx="66" cy="354" r="10" fill="#fff" opacity="0.25"/><text x="66" y="358" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">①</text><text x="84" y="358" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Tool（内置 + MCP 扩展）</text><text x="266" y="358" fill="rgba(255,255,255,0.75)" font-size="10" font-family="system-ui,sans-serif">原子能力 — 能做什么</text><text x="56" y="386" fill="#374151" font-size="11" font-family="system-ui,sans-serif">内置 Read/Write/Bash + 自定义 MCP Tool。MCP 是用户扩展 Tool 的唯一入口。</text></g></svg>
<figcaption class="image-caption">图 1：Claude Code 五层技术栈</figcaption>
</figure>

前四层有一个共同前提：**一个 Agent**。所有的 Tool、Plugin、Hooks、Skill 都装在同一个 Agent 身上——它在你的终端里，你问一句，它答一句。

Workflow 打破了这个前提。

它不是在增强单个 Agent，而是让 Claude 生成了一个**编排脚本**，脚本里定义了多个 Agent 各自的任务、通信方式、同步节点。每个 Agent 实例都有自己能用的完整能力栈——Tool、Plugin、Hooks、Skill 一样不少。但它们身份不同、指令不同、目标不同。

所以 Workflow 不是单纯的"第五层"。它更接近"跨五层"——它不是在已有四层上再加一层新能力，而是**让前四层在同一时刻拥有多个独立副本，并为每个副本赋予不同的角色和任务**。

这带来的质变是：前四层回答的一直是"能做什么""装什么""什么时候触发""怎么做"。Workflow 回答的是**"谁来做"**——多个 AI 分工协作，你不是在操作一个 AI，你是在管理一个 AI 团队。

---

## 2. 三大原语：只有三种指令的编程语言

Claude 生成 Workflow 脚本的时候，用的是一门只有三种指令的语言。理解这三种指令就等于理解了所有 Workflow 的底层逻辑。

| 原语 | 做什么 | 类比 |
|------|--------|------|
| `agent(prompt, opts?)` | 定义一个 Agent：角色名 + 任务指令 + 期望输出格式 | 给一个工程师派活 |
| `parallel(thunks[])` | 多个 Agent 同时开工，全部完成后继续 | 团队并行做不同模块，最后汇总 |
| `pipeline(items, stage1, stage2, ...)` | 每个 item 依次流过多个 stage，item 间不互相等待 | 流水线：需求 → 设计 → 编码 → 测试 |

三种原语自由组合，就能表达所有编排模式。这很像 Unix 的"一切皆文件"——概念简单到一句话说完，但能搭出整个操作系统。

脚本长什么样？看一眼就够了，不用记住：

```javascript
export const meta = {
  name: 'code-review',
  description: 'Multi-agent code review with adversarial verification',
  phases: [
    { title: 'Review', detail: 'Find issues in changed files' },
    { title: 'Verify', detail: 'Adversarially verify each finding' },
  ],
};

phase('Review');
const findings = await pipeline(
  changedFiles,
  file => agent(`Review ${file} for bugs, security issues, and style violations.`,
    { schema: FINDINGS_SCHEMA }),
  review => parallel(review.findings.map(f => () =>
    agent(`Try to refute: ${f.title}`, { phase: 'Verify', schema: VERDICT_SCHEMA })
      .then(v => ({ ...f, verdict: v }))
  ))
);
```

**重申一遍：这个脚本是 Claude 写的，不是你写的。** 你只需要看得懂三个词——`agent`、`parallel`、`pipeline`——就知道 Claude 生成了什么结构。就像你看得懂 `if` / `for` / `function` 就算不会写 JavaScript。

关键在于：你能不能用这三种原语去描述你想要的团队结构。比如"让三个 Agent 独立审查这份代码，然后一个 Agent 对比结果"——这句话本身就是 `parallel + agent` 的口语化表达。

---

## 3. Pipeline vs Barrier：流水线与同步点

这是 Workflow 设计中最核心的一个抉择。理解对了，任务描述就对了；理解错了，生成的 Workflow 会慢得离谱。

### Pipeline（流水线，默认）

每个 item 独立流经所有阶段。Item A 进入 stage 3 时，Item B 才刚进 stage 1。互不等待。

```
文件A: [分析] → [审查] → [修复]
文件B:          [分析] → [审查] → [修复]
文件C:                   [分析] → [审查] → [修复]
```

**适合**：任务有天然的线性依赖。先分析再审查再修复——每一步依赖上一步的输出，但不同文件之间没有依赖。这是绝大多数编程任务的形态，所以 Pipeline 是 Workflow 的默认选择。

### Barrier（同步点）

所有 Agent 并发执行，但必须全部完成后才能进入下一阶段。

```
阶段1: [Agent A] [Agent B] [Agent C]  ← 同时跑
              ↓ 全部完成 ↓
阶段2:       [汇总/裁决]
```

**适合**：需要汇集所有结果才能做下一步判断。"三个 Agent 独立设计方案，架构师选最优"——架构师必须三个方案都拿到了才能选。

### 怎么选

| 维度 | Pipeline | Barrier |
|------|----------|---------|
| 执行方式 | 各 item 独立流经阶段 | 阶段内并发，阶段间同步 |
| 快慢 | 不互相等待——快 | 等最慢的那个——慢 |
| 错误影响 | 单 item 失败不影响其他 | 单 Agent 失败不阻塞其他 Agent |
| 适合场景 | 审查流水线、数据处理 | 方案比选、汇总分析 |
| 默认选择 | ✅ Workflow 默认 | 需显式指定 |

怎么跟 Claude 说：

- "逐个审查每个文件的代码质量，发现问题直接修复" → Claude 生成 **Pipeline**
- "让三个 Agent 分别设计数据库 Schema，然后数据库专家选最佳方案" → Claude 生成 **Barrier + Judge**

你不需要在 prompt 里用"pipeline"或"barrier"这两个词。你只需要描述**item 之间有没有依赖关系**。没有依赖 → Pipeline；有依赖（需要汇总） → Barrier。

---

## 4. 模式一：对抗验证

这是 MCP 文章结尾预告的核心模式："用多个独立 Agent 交叉验证、对抗审查，把概率压到无限逼近确定。"

<figure><svg id="adversarial-verification" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 265" width="100%" style="max-width:600px;display:block;margin:1.2em auto"><defs><filter id="sh2"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter><marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/></marker><marker id="arrowRed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444"/></marker><marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#10b981"/></marker><marker id="arrowGray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af"/></marker></defs><!-- Task --><g filter="url(#sh2)"><rect x="230" y="10" width="140" height="34" rx="8" fill="#f3f4f6"/><text x="300" y="32" text-anchor="middle" fill="#374151" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Task</text></g><line x1="300" y1="44" x2="300" y2="66" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#arrowGray)"/><!-- Generator Agent --><g filter="url(#sh2)"><rect x="170" y="70" width="260" height="46" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/><rect x="170" y="70" width="260" height="22" rx="8" fill="#3b82f6"/><rect x="170" y="84" width="260" height="8" fill="#3b82f6"/><text x="300" y="86" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Generator Agent（生成者）</text><text x="300" y="106" text-anchor="middle" fill="#374151" font-size="10" font-family="system-ui,sans-serif">"写出最好的代码"</text></g><!-- Arrow to Reviewer --><line x1="300" y1="116" x2="300" y2="144" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arrowBlue)"/><text x="320" y="134" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">draft</text><!-- Reviewer Agent --><g filter="url(#sh2)"><rect x="170" y="148" width="260" height="46" rx="8" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><rect x="170" y="148" width="260" height="22" rx="8" fill="#ef4444"/><rect x="170" y="162" width="260" height="8" fill="#ef4444"/><text x="300" y="164" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Reviewer Agent（审查者）</text><text x="300" y="184" text-anchor="middle" fill="#374151" font-size="10" font-family="system-ui,sans-serif">"找出所有问题，不准说 looks good"</text></g><!-- Loop back (not pass) --><path d="M 430 194 L 480 194 L 480 93 L 434 93" fill="none" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="5,3" marker-end="url(#arrowRed)"/><text x="494" y="148" fill="#ef4444" font-size="9" font-family="system-ui,sans-serif">not pass → revise</text><!-- Pass arrow --><line x1="300" y1="194" x2="300" y2="220" stroke="#10b981" stroke-width="1.5" marker-end="url(#arrowGreen)"/><text x="320" y="212" fill="#10b981" font-size="9" font-weight="600" font-family="system-ui,sans-serif">pass</text><!-- Approved --><g filter="url(#sh2)"><rect x="242" y="224" width="116" height="28" rx="14" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/><text x="300" y="243" text-anchor="middle" fill="#059669" font-size="12" font-weight="700" font-family="system-ui,sans-serif">✓ Approved</text></g></svg>
<figcaption class="image-caption">图 2：对抗验证流程 — Generator 与 Reviewer 角色对立，循环直到通过</figcaption>
</figure>

结构很简单：一个 Agent 负责生成，另一个 Agent 负责挑刺。挑刺不通过 → 生成者修改 → 再次审查 → 循环直到通过。

核心机制是**角色对立**。Generator 被指示"写出最好的代码"，Reviewer 被指示"找出所有问题"。两个 Agent 的目标不一致——正是这种张力产生了质量。Generator 的自我偏好偏见（对自己的输出过于自信）被 Reviewer 的无情挑战压制。

这和单 Agent 自审有本质区别：

| | 单 Agent 自审 | 对抗验证 |
|---|---|---|
| 审查视角 | 同一模型审视自己的输出 | 独立 Agent，独立上下文，独立指令 |
| 心理包袱 | "这是我写的"——倾向于放水 | "我只管找茬"——没有包袱 |
| 典型表现 | "Looks good, no issues found" | "Line 42: potential race condition..." |
| Bug 检出率 | ~60%（见啥都顺眼） | ~90%+（见啥都不顺眼） |

在实际 Workflow 中，这个模式通常是 Pipeline 的一个 stage：所有文件逐一经过 Generator 生成代码，然后每个生成结果进入 Reviewer 审查。不通过的文件回到 Generator 修改，通过的文件进入下一阶段。

如何向 Claude 描述："先让一个 Agent 写实现，再让另一个 Agent 审查它的代码。审查者不准说没问题——必须找到至少一个问题。审查不通过就让写的人改，循环直到审查通过。"

---

## 5. 模式二：循环直到稳定

有些任务没有"一次就够"的终点。重构、优化、润色——你希望 Agent 持续改进，直到"没什么可改的了"。

### Loop-until-dry

Agent 反复处理同一素材，每次输出改进建议，直到它自己说出"没有新的修改建议了"。

```text
Iteration 1: 发现 5 处可优化 → 修改
Iteration 2: 发现 2 处可优化 → 修改
Iteration 3: 0 处 → dry → 停止
```

**适合**：有明确终点的任务——重构到满意为止、代码风格统一、文档润色。

**风险**：Agent 可能永远不说"done"。需要设置最大迭代次数作为逃生门。标准做法是 `maxIterations=5`——过了五轮不管它说不说 dry 都停。

### Loop-until-budget

用外部约束代替 Agent 自己的判断。预算可以是 token 数、步数、时间。

```text
预算: 50,000 tokens
Iteration 1: 探索方案 A, B → 消耗 8,000 tokens
Iteration 2: 深入方案 B → 消耗 12,000 tokens
...
预算耗尽 → 停止，输出当前最佳
```

**适合**：开放探索性任务——"花不超过 X token 找到最好的方案"。不需要 Agent 自己判断"够好了没有"。

### 两种变体对比

| 变体 | 停止条件 | 适用场景 | 风险 |
|------|---------|---------|------|
| Loop-until-dry | Agent 自检无变化 | 重构、优化、文档润色 | 可能无限循环（需 max 逃生门） |
| Loop-until-budget | Token/步数达到上限 | 探索性分析、方案对比 | 可能在关键突破前停止 |

如何向 Claude 描述："反复审查这个模块的代码质量，每轮发现的问题全部修复后再来一轮，直到审查者挑不出新问题为止。最多五轮。"

这本质上是一个 Pipeline 自环——Agent 的输出回到自身或同角色 Agent，直到满足停止条件。

---

## 6. 模式三：评审团

对抗验证是 1v1（一个写一个审），评审团是 N+1（N 个独立产生方案，1 个裁判选最优）。

<figure><svg id="judge-panel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 310" width="100%" style="max-width:600px;display:block;margin:1.2em auto"><defs><filter id="sh2"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter><marker id="arrowGray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af"/></marker><marker id="arrowRose" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e"/></marker></defs><!-- Task --><g filter="url(#sh2)"><rect x="230" y="10" width="140" height="30" rx="8" fill="#f3f4f6"/><text x="300" y="30" text-anchor="middle" fill="#374151" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Task</text></g><!-- Fan-out lines --><line x1="260" y1="40" x2="120" y2="68" stroke="#9ca3af" stroke-width="1.2" marker-end="url(#arrowGray)"/><line x1="300" y1="40" x2="300" y2="68" stroke="#9ca3af" stroke-width="1.2" marker-end="url(#arrowGray)"/><line x1="340" y1="40" x2="480" y2="68" stroke="#9ca3af" stroke-width="1.2" marker-end="url(#arrowGray)"/><!-- Agent 1 --><g filter="url(#sh2)"><rect x="40" y="72" width="160" height="70" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.2"/><rect x="40" y="72" width="160" height="22" rx="8" fill="#3b82f6"/><rect x="40" y="86" width="160" height="8" fill="#3b82f6"/><text x="120" y="88" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">Agent A</text><text x="120" y="112" text-anchor="middle" fill="#374151" font-size="10" font-family="system-ui,sans-serif">方案一：MVP 优先</text><rect x="55" y="120" width="130" height="20" rx="5" fill="#f3f4f6"/><text x="120" y="134" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">Solution A</text></g><!-- Agent 2 --><g filter="url(#sh2)"><rect x="220" y="72" width="160" height="70" rx="8" fill="#fef2f2" stroke="#ef4444" stroke-width="1.2"/><rect x="220" y="72" width="160" height="22" rx="8" fill="#ef4444"/><rect x="220" y="86" width="160" height="8" fill="#ef4444"/><text x="300" y="88" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">Agent B</text><text x="300" y="112" text-anchor="middle" fill="#374151" font-size="10" font-family="system-ui,sans-serif">方案二：风险优先</text><rect x="235" y="120" width="130" height="20" rx="5" fill="#f3f4f6"/><text x="300" y="134" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">Solution B</text></g><!-- Agent 3 --><g filter="url(#sh2)"><rect x="400" y="72" width="160" height="70" rx="8" fill="#f5f3ff" stroke="#8b5cf6" stroke-width="1.2"/><rect x="400" y="72" width="160" height="22" rx="8" fill="#8b5cf6"/><rect x="400" y="86" width="160" height="8" fill="#8b5cf6"/><text x="480" y="88" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">Agent C</text><text x="480" y="112" text-anchor="middle" fill="#374151" font-size="10" font-family="system-ui,sans-serif">方案三：用户优先</text><rect x="415" y="120" width="130" height="20" rx="5" fill="#f3f4f6"/><text x="480" y="134" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">Solution C</text></g><!-- Converge to Judge --><line x1="120" y1="142" x2="200" y2="200" stroke="#9ca3af" stroke-width="1" marker-end="url(#arrowGray)"/><line x1="300" y1="142" x2="300" y2="200" stroke="#9ca3af" stroke-width="1" marker-end="url(#arrowGray)"/><line x1="480" y1="142" x2="400" y2="200" stroke="#9ca3af" stroke-width="1" marker-end="url(#arrowGray)"/><!-- Judge Agent --><g filter="url(#sh2)"><rect x="200" y="204" width="200" height="46" rx="8" fill="#fff1f2" stroke="#f43f5e" stroke-width="1.5"/><rect x="200" y="204" width="200" height="22" rx="8" fill="#f43f5e"/><rect x="200" y="218" width="200" height="8" fill="#f43f5e"/><text x="300" y="220" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">Judge Agent（裁判）</text><text x="300" y="240" text-anchor="middle" fill="#374151" font-size="10" font-family="system-ui,sans-serif">选出最佳或融合优点</text></g><!-- Best Solution --><g filter="url(#sh2)"><rect x="230" y="268" width="140" height="26" rx="6" fill="#fefce8" stroke="#eab308" stroke-width="1.2"/><text x="300" y="286" text-anchor="middle" fill="#a16207" font-size="11" font-weight="700" font-family="system-ui,sans-serif">★ Best Solution</text></g><line x1="300" y1="250" x2="300" y2="268" stroke="#f43f5e" stroke-width="1.2" marker-end="url(#arrowRose)"/></svg>
<figcaption class="image-caption">图 3：评审团流程 — 三个 Agent 独立设计方案，Judge 选最优</figcaption>
</figure>

与对抗验证的区别：

| | 对抗验证 | 评审团 |
|---|---|---|
| Agent 关系 | 1 Generator + 1 Reviewer 循环 | N 个独立 Agent + 1 Judge |
| 核心机制 | 角色对立，挑刺-修改循环 | 独立产生，裁判选优 |
| 适合 | 有明确对错标准的任务（代码质量、安全检查） | 有多个可行方案的任务（架构设计、算法选择） |
| Agent 规模 | 固定 2 个 | N=3 黄金比例 |

### N=3 为什么是黄金比例

N=2 不够。两个方案对比容易变成二选一，裁判没有足够的多样性去发现"第三种可能"。N=4 或更多，边际收益递减——每多一个 Agent 消耗同等 token，但第四个方案提供的新视角远少于第三个。N=3 是多样性和成本的折中最优解。

### Judge 的角色设计

Judge 的指令不是"找出错误"（那是对抗验证的 Reviewer）。Judge 的指令是"评估所有方案，选择最优或融合优点"。Judge 需要有明确的评估标准，否则会退化成随机选择。

标准应该写在任务描述里，比如："以可维护性为第一优先级，性能为第二优先级，代码简洁度为第三优先级，评估三个方案的优劣。"

如何向 Claude 描述："让三个 Agent 独立设计这个模块的 API，分别从 MVP 优先、性能优先、扩展性优先三个角度出发。然后一个架构师 Agent 评估三个方案，选出最佳或融合优点。"

---

## 7. ultracode：两种触发方式，别搞混

"ultracode" 这个词在 Claude Code 里有两种完全不同的用法。搞混会浪费大量 token。

### `/effort ultracode`：会话级开关

这是一个 slash command。执行后做两件事：

1. 把整个会话的推理深度设为 `xhigh`（每条消息 8x token）
2. 授予 Claude Code 自动编排 Workflow 的权限——Claude 自行判断哪些任务需要多 Agent 并行

**作用范围：整个会话**。设完之后你说的每一句话，哪怕"帮我看看这个变量名好不好"，都在 xhigh 推理深度下运行。而且 Claude 会在任何它认为"值得"的任务上自动启动 Workflow。

**用完必须降回来**——`/effort high` 或 `/effort medium`。忘了降？后面每条随便聊天的消息都在烧 8x token。

```
/effort ultracode    ← 开始高强度会话
... 跑完核心任务 ...
/effort high         ← 降回来！别忘
```

适合：整个会话都是重型任务——大规模重构、安全审计、从头实现一个功能。

### Prompt 里写 "ultracode"：单次触发

在消息文本中提到 "ultracode"（比如"用 ultracode 跑这个任务"），只触发**这一次** Workflow 编排。会话的默认 effort 不变。下一条消息回到正常推理深度。

适合：日常开发中偶尔碰到一个复杂任务——其他都在 medium 下跑，就这一个需要多 Agent 并行。

### 两种方式对比

| | `/effort ultracode` | prompt 里写 "ultracode" |
|---|---|---|
| 作用范围 | 整个会话 | 单次请求 |
| 推理深度 | xhigh 永久生效 | 不改会话 effort |
| Workflow 触发 | Claude 自动判定所有任务 | 仅当前任务 |
| Token 影响 | 每条消息 8x，直到改回去 | 只那一次 Workflow 8x |
| 恢复方式 | 需要手动 `/effort high` | 自动恢复 |

### 最常踩的坑

> 用 `/effort ultracode` 跑完一个任务，忘了降回来。后面聊了半小时天，每条消息都在 8x 模式下。月底账单翻倍。

**记住**：如果你只需要一个任务上高强度，在 prompt 里提 "ultracode"，不要动 `/effort`。只有整个会话都需要深推理时才用 slash command。

### 什么时候值得开

- **安全审计**：审计 Agent 在沙箱里跑，不会有副作用。xhigh 让每个审查 Agent 更仔细地找漏洞
- **生产部署前的最终检查**：推理深度直接关联遗漏率
- **架构决策**：几个方案各自的利弊，xhigh 让每个方案的生成更深入、Judge 的评估更全面

什么时候不值得：日常 CRUD、简单 bug 修复、探索性任务。Token 8x，但任务不需要这么深推理。

---

## 8. 即开即用的提示词

下面四个 prompt，直接复制到 Claude Code 里就能跑。每个都对应前文讲的一种模式。建议先用小范围试（挑一个模块、一个文件），跑通了再扩大。

### 代码审查流水线（对抗验证）

```
ultracode：审查 {模块路径} 的代码质量。先让一个 Agent 逐文件分析潜在的 bug、
安全隐患、性能问题和风格违规。然后让另一个 Agent 对抗性审查每一个发现——
尝试反驳、找误报。只保留两个 Agent 都认可的问题，按严重程度排序输出。
```

### 设计方案比选（评审团）

```
ultracode：设计 {功能名} 的实现方案。让三个 Agent 分别从以下角度独立设计：
1) 最快实现 MVP  2) 最优性能  3) 最好扩展性。
然后让一个架构师 Agent 评估三个方案，选出最佳或融合优点。评估标准：
可维护性第一，性能第二，实现复杂度第三。
```

### 重构到满意为止（循环直到稳定）

```
ultracode：重构 {文件路径}，提升可读性和可维护性，不改变外部行为。
每次重构后让审查 Agent 检查代码质量并提出改进建议，继续修改直到审查者
挑不出新问题。最多 5 轮。
```

### 安全审计

```
ultracode：对 {模块/服务} 做安全审计。让多个 Agent 分别从以下维度独立审查：
1) 认证和授权  2) 输入验证和注入防御  3) 数据泄露风险  4) 依赖漏洞。
每个 Agent 只关注自己维度，最后汇总所有发现，按 CVSS 式严重度排列。
```

四个 prompt 的模式可以直接套到你的项目上。核心就一句话——**描述角色分工，而不是写脚本**。

---

## 9. 三层级对比：Sub-agent、Workflow、单 Agent 多轮

Claude Code 提供了三个层级的多 Agent 协作能力。理解各自定位，才不会用错。

| 维度 | Sub-agent | Workflow | 单 Agent 多轮 |
|------|-----------|----------|--------------|
| Agent 数量 | 1 + 临时子任务 | N（显式编排） | 1 |
| 编排方式 | 父 Agent 动态分派 | Pipeline/Barrier 脚本 | 你手动引导 |
| 上下文隔离 | 父子隔离，共享文件系统 | 完全沙箱隔离 | 无隔离 |
| 失败恢复 | 无（重头来） | 断点续传 | 无（从头来） |
| 确定性 | 无保证 | Pipeline 保证执行顺序 | 无保证 |
| 适合 | 大任务内的子任务拆分 | 可重复的多步流程 | 探索、对话、需求不明确 |

### 选择准则

- **任务明确、可重复、需要多次执行？** → Workflow。比如：每次 PR 都要经过的审查流水线。
- **一次性的大任务，需要拆成小块并行？** → Sub-agent。比如：分析整个代码库中所有使用了某 Pattern 的文件。
- **你还不知道到底要什么？** → 单 Agent 多轮。先聊清楚，自然聊出 Sub-agent 或 Workflow 的需求再切。

一个实用的判断法：**如果让你用文字写下这个流程，你能写多清楚？** 写得很清楚 → Workflow。大概清楚但有模糊地带 → Sub-agent。写不清楚，需要边做边想 → 单 Agent 多轮。

---

## 10. 沙箱约束：确定性不是限制，是 feature

Workflow 中的 Agent 在一个受限的沙箱里运行。理解这些约束为什么存在，比记住"什么不能做"更重要。

| 可以做 | 不能做 |
|--------|--------|
| 推理、分析、规划 | 直接读写文件 |
| 生成代码/文本/JSON | 执行 shell 命令 |
| 调用 MCP Tool（权限内） | `Date.now()` / `Math.random()` |
| 产生结构化输出 | 修改文件系统 |
| 与其他 Agent 通信（通过 Workflow 数据流） | 启动子进程 |

这些约束不是随意加的。每一条都服务于一个核心目标：**确定性**。

同一个 Workflow，同样的输入，同样的 Agent 配置 → 同样的输出。这是断点续传和缓存的前提：如果第 3 步的输入和第 2 次执行的第 3 步输入完全一样，直接返回缓存结果，不重新执行。

没有这个确定性，断点续传不可靠（重放可能走不同的路径），缓存无效（"相同输入"无法定义），调试不可复现（你永远不知道上次是怎么跑出来的）。

所以 Workflow 中的 Agent 角色是"思考者"，不是"行动者"——它们产生内容（分析、方案、代码、审查意见），Workflow 引擎负责把内容落地到文件系统。这个分工是刻意的：思考应该是确定性的，行动才需要与外部世界交互。

还有一层隐性约束：所有 Agent 跑的是同一个 Claude 模型。角色的差异靠 prompt 制造——Generator 被指示"写出最好的代码"，Reviewer 被指示"找出所有问题"——但它们底层的推理能力是一样的。这和你可能在 LangChain 或 AutoGen 里见过的"给 Agent A 用 GPT-4o、Agent B 用 Opus"不一样。Workflow 的"多 Agent"更准确地说，是同一模型的**多视角副本**。这也解释了为什么对抗验证有效：正因为两个视角能力同级，才能互相挑刺。如果 Reviewer 明显比 Generator 强，对抗就变成了碾压，不是挑战。

一条实用的理解：**沙箱约束让 Workflow 像一个纯函数——相同输入，相同输出。纯函数好测试、好缓存、好调试、好信任。**

---

## 11. 恢复与缓存：改最后一步不用重跑前面全部

Workflow 的两个工程特性，让你的迭代速度从"全部重来"变成"原地继续"。

### 断点续传

Workflow 每一步的完成状态都被记录。如果某一步失败——Agent 超时、输出格式错误、MCP Tool 调用失败——从失败那一步重新执行。前面的结果全部保留。

这意味着一个 5 步 pipeline 在第 4 步崩了，你改了第 4 步的指令，不用重跑 1-3 步。

### 缓存命中

如果 pipeline 中某一步的输入、Agent 配置、Prompt 与之前某次执行完全相同，直接返回缓存结果。对调试和迭代速度影响巨大——你修改第 5 步的 Judge 评估标准，前面 4 步 0 token 消耗，瞬间返回。

什么情况缓存会失效：Agent 调用了 MCP Tool（外部系统状态可能变了）、输出中包含非确定性因素、改了 Agent 的 model 参数。

### 实际影响

"试试看"的成本从"全部重来"降到了"只改最后一步"。这种迭代速度让你可以：
- 反复微调 Judge 的评估标准，看不同标准下的选择差异
- 调整 Reviewer 的严格程度，而不重跑 Generator
- 修改 Pipeline 最后一阶段的输出格式，前面的质量工作不浪费

---

## 12. 结语：从操作者到架构师

系列写了五篇，从 Tool 到 Workflow：

| 层 | 主题 | 核心问题 | 核心答案 |
|---|------|---------|---------|
| ① Tool | MCP | 能做什么？ | 内置 + 自定义 MCP Tool——原子能力 |
| ② Plugin | 插件 | 装什么？ | 装备——压缩输出、记忆复用、语义搜索 |
| ③ Hooks | Hooks | 什么时候触发？ | 事件驱动，自动执行 |
| ④ Skill | Skill | 怎么做？ | 方法论——行为编码，经验模块化 |
| ⑤ Orchestration | Workflows | 谁来做？ | 多智能体编排——AI 团队协作 |

五层不是五个独立的能力，而是递进的依赖链：没有 Tool 就没有 Plugin 要扩展的东西，没有 Plugin 就没有 Hooks 的触发点，没有 Hooks 就没有 Skill 的自动化执行条件，没有 Skill 就没有 Workflow 中每个 Agent 的标准化行为。

更重要的是，这条链改变了你和 Claude Code 的关系：

- 写前两篇（Plugin / MCP）时，你是 **配置者**——装什么、配什么
- 写中间两篇（Hooks / Skill）时，你是 **设计者**——设计触发条件和行为规范
- 写这篇时，你是 **架构师**——设计团队结构、通信方式、质量保证机制

每一步都在把你从操作者变成架构师。

Workflow 是当前你能触及的顶层——但 AI 工具的发展不会停在这里。Workflow 依赖 Claude Code 运行时，不能在外部系统自动触发。未来可能出现更完整的多 Agent 框架，但 Workflow 的核心概念——Agent 分工、角色对立、Barrier/Pipeline 编排——会是所有后续框架的基石。

你不再是一个人在终端里跟 AI 对话。你在管理一支 AI 团队。

---

*感谢阅读。*

