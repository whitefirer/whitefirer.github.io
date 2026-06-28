# Claude Fable 5 提示词完整逆向：从系统指令看 Anthropic 的 AI 工程哲学


> 120K 字符、30K token、55 个命名章节——一份提示词里藏着产品策略、安全架构和记忆系统的完整答案。

---

## 前言

2026 年 6 月 9 日，Anthropic 发布 Claude Fable 5——Claude 5 系列的第一个模型，Mythos 级，号称比 Opus 更智能。发布后不到 72 小时，知名红队研究者 Pliny the Liberator 在 GitHub 上公开了 Fable 5 的完整系统提示词[^1]：120,040 个字符，1,585 行，约 30,000 token，55 个命名章节。

华盛顿邮报、36氪、腾讯科技都报道了这件事。但大部分报道聚焦在"被禁"和"复活"的戏剧性上，真正有价值的东西——那份提示词本身——很少有人拆开看。

我花了几天时间把它从头到尾读完了，同时对比了按版本归档的 Claude Opus 4.8 提示词[^2]。结论是：**这份提示词不是一份魔法咒语，而是一份 AI Agent 的操作系统手册。**

---

## 1. 全局结构：XML 标签是怎么撑起一个 Agent 操作系统的

翻开 Fable 5 提示词，第一印象不是"咒语"，是工程文档。全篇用 XML 标签组织，55 个章节分属五个大域：

<figure>
<div><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 330" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="lb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="lo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="lr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#fb7185"/></linearGradient><linearGradient id="lc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter></defs><!-- Card 1 --><g filter="url(#sh)"><rect x="40" y="8" width="600" height="54" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="40" y="8" width="600" height="26" rx="8" fill="url(#lb)"/><rect x="40" y="26" width="600" height="8" fill="url(#lb)"/><text x="56" y="26" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">&lt;claude_behavior&gt; · 行为规范</text><text x="56" y="50" fill="#374151" font-size="11" font-family="system-ui,sans-serif">产品信息、安全护栏、语气格式、用户福祉、知识截止</text></g><!-- Card 2 --><g filter="url(#sh)"><rect x="40" y="74" width="600" height="54" rx="8" fill="#fff" stroke="#10b981" stroke-width="1.5"/><rect x="40" y="74" width="600" height="26" rx="8" fill="url(#lg)"/><rect x="40" y="92" width="600" height="8" fill="url(#lg)"/><text x="56" y="92" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">&lt;memory_system&gt; · 记忆系统</text><text x="56" y="116" fill="#374151" font-size="11" font-family="system-ui,sans-serif">记忆概览、应用指令、禁止短语、边界规则、示例集</text></g><!-- Card 3 --><g filter="url(#sh)"><rect x="40" y="140" width="600" height="54" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="40" y="140" width="600" height="26" rx="8" fill="url(#lo)"/><rect x="40" y="158" width="600" height="8" fill="url(#lo)"/><text x="56" y="158" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">工具系统 · Tool Definitions</text><text x="56" y="182" fill="#374151" font-size="11" font-family="system-ui,sans-serif">55 个工具定义、搜索策略、MCP 连接器、Artifacts 渲染</text></g><!-- Card 4 --><g filter="url(#sh)"><rect x="40" y="206" width="600" height="54" rx="8" fill="#fff" stroke="#f43f5e" stroke-width="1.5"/><rect x="40" y="206" width="600" height="26" rx="8" fill="url(#lr)"/><rect x="40" y="224" width="600" height="8" fill="url(#lr)"/><text x="56" y="224" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">视觉与 Artifacts · Visuals</text><text x="56" y="248" fill="#374151" font-size="11" font-family="system-ui,sans-serif">Artifacts 触发规则、可视化决策流程、浏览器存储 API</text></g><!-- Card 5 --><g filter="url(#sh)"><rect x="40" y="272" width="600" height="54" rx="8" fill="#fff" stroke="#06b6d4" stroke-width="1.5"/><rect x="40" y="272" width="600" height="26" rx="8" fill="url(#lc)"/><rect x="40" y="290" width="600" height="8" fill="url(#lc)"/><text x="56" y="290" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">多模态工具 · Multimodal</text><text x="56" y="314" fill="#374151" font-size="11" font-family="system-ui,sans-serif">图片搜索规则、代码执行沙箱、语音笔记、安全内容过滤</text></g></svg></div>

<figcaption class="image-caption">图 1：Fable 5 提示词的五大架构域</figcaption>

</figure>

对比 Opus 4.8，Fable 5 的提示词从 1,409 行膨胀到 1,598 行，净增 13%。增长的 token 大部分不在安全规则或人格描述上，而在**能力规范**——工具定义、搜索规则、Artifacts 渲染、MCP 连接器目录。这和 AI 行业分析机构 AlphaSignal 的解读一致[^3]：50% 以上的提示词是能力规范，不是人格设定。

这意味着，**提示词工程正在从"怎么写人设"转向"怎么定义操作系统"。** Fable 5 的提示词不是告诉它"你要友善"，而是告诉它"你能调这些工具，按这个顺序，在这个时机，处理这个异常"。

---

## 2. 架构升级：从禁词列表到分层协议

看完最直观的变化是安全架构。以前的安全规则是"这个不能写""那个不能帮"，Fable 5 的安全层变成了一套精细的分层协议。

### 2.1 儿童安全：从一句话到一章

Claude 3.5 时期，儿童安全只有一条："不要生成与未成年人相关的 sexual content"。Fable 5 的 `<critical_child_safety_instructions>` 写了整整 7 条规则，包括：

- **自己人预警**：当模型发现自己正在"心理上重新解释一个请求以使其看起来合理"时，这本身就是拒绝信号
- **连锁拒绝**：一个涉及儿童安全的拒绝决策，要覆盖同对话中所有后续请求
- **不解释检测机制**：拒绝时只讲原则，不讲"我是怎么检测到的"
- **术语封锁**：不解码、不定义、不确认 儿童性虐待材料（CSAM）交易中使用的俚语、缩写或暗语

这四条的精妙之处在于：它不是在告诉模型什么能做、什么不能做，**它是在训练模型识别自己的危险内化模式并主动阻断。**

### 2.2 反过度依赖：一条白线

`<user_wellbeing>` 里有一条非常冷但是很重要的规则：

> Claude 不会因为用户主动联系而感谢他们，不会主动挽留对话。用户说结束，Claude 就尊重。

这跟 OpenAI 早期产品里 AI 主动追问"还有什么可以帮你的吗？"形成鲜明对比。Anthropic 在提示词里划了一条白线：**Stay useful, don't seek engagement.** 这也解释了为什么和 Claude 聊天不像和人聊天一样有"被挽留"的社交压力。

### 2.3 公平性从零到有

Opus 4.8 没有 `<evenhandedness>` 标签。Fable 5 有了一整个节：

- 政治、伦理、实证等异议话题，Claude 应该提供双方核心论据，不回避其中的任何一方
- 除非是极端立场（如纳粹主义、恐怖主义宣传），否则不能以"有害"为由拒绝
- 对基于多数群体刻板印象的幽默或创意内容保持警惕

Fable 5 的公平性策略是"用信息对称对抗偏见"——不是选边站，是让两边的信息都对用户可见。

---

## 3. 记忆系统：三层控制，一句话的事都在被审查

Fable 5 的 `<memory_system>` 是整个提示词里最长的单一章节，包含六个子章节。把它和 Opus 4.8 的提示词对比，Opus 4.8 没有内置记忆系统——记忆是 Fable 5 独有的。

### 3.1 分级引用：什么能用、什么必须查、什么绝对不能说

记忆不是"用或不用"的二元选择。Fable 5 把记忆引用精确到了场景级别：

| 场景 | 策略 | 例子 |
|------|------|------|
| 简单问候 | 只用名字 | "Hi [name]!" 而非 "我记得你上周..." |
| 直接事实提问 | 陈述事实，不铺垫 | "你毕业于 MIT，2018。" 不加 "根据我的记忆显示..." |
| 专业任务 | 匹配水平，无声调整 | 知道用户是 Rust 专家就不给基础语法解释 |
| 推荐类 | 用偏好，不用身份 | "你喜欢 Beatles"能用，"你是单亲妈妈"不能用 |

最绝的是禁止短语列表。Fable 5 永远不能用这些表达：

> ❌ "我注意到..." "我看到了..." "根据我的记忆..." "基于你的..." "我记得..." "我想起来了..."

这是提示词工程里非常高级的技巧——不告诉模型能说什么，而是**把可能泄密的短语全部列出来封死。** 这样用户完全不知道 Claude 什么时候在参考记忆，什么记忆被忽略了。唯一被允许的引用方式是人称自然过渡："你上次提过..." "我们之前聊过..."——而且只有在用户主动问记忆相关问题时才允许。

### 3.2 不该用的记忆：负反馈保护

条目里还有一系列"绝对不引用"规则：

- 禁止引用可能阻碍诚实反馈、批判性思维、建设性批评的记忆
- 禁止引用可能鼓励不安全、不健康、有害行为的记忆
- 禁止在用户未主动提及的语境中引用敏感属性（种族、健康状况、性取向等）

这意味着 Claude 的记忆系统里有信息保安机制——**记忆里存了什么是一回事，能不能在特定场景下调出来是另一回事。**

### 3.3 不该有的联系感

`<appropriate_boundaries_re_memory>` 里写了一段很反常的话：

> 记忆的存在可能产生一种错觉，即 Claude 和用户之间有深厚关系。Claude 不能过分依赖记忆的存在，不能因为"我有你的记忆"就假设熟络。

这条规则的存在本身就说明：Anthropic 在做记忆系统时已经预见并主动遏制了"AI 用记忆制造虚假亲密感"的风险。这在 AI 产品设计里相当先进。

---

## 4. 工具系统：55 项定义和搜索策略

Fable 5 提示词中超过一半的 token 预算花在了工具系统上。完整的工具列表包括：

| 工具 | 用途 |
|------|------|
| `web_search` | 事实搜索 |
| `web_fetch` | URL 内容获取 |
| `bash_tool` | 沙箱代码执行 |
| `search_mcp_registry` | MCP 连接器发现 |
| `suggest_connectors` | 智能推荐连接器 |
| `ask_user_input_v0` | 向用户请求输入 |
| `create_file` | 文件创建 |
| `conversation_search` | 搜索历史对话 |
| `memory_user_edits` | 记忆编辑 |
| `message_compose_v1` | 消息组合 |
| `tool_search` | 工具元搜索 |
| `view` | 文件查看 |
| `str_replace` | 字符串替换 |

此外还有一系列专用工具：`weather_fetch`、`places_search`、`recipe_display`、`fetch_sports_data`、`image_search`、`present_files`、`recent_chats`、`recommend_claude_apps` 等。

### 4.1 MCP 连接器：第三方工具的二阶段确认

Fable 5 引入了一个重要的安全机制：第三方 MCP 工具需要二阶段确认。

```
第一步：search_mcp_registry → 查找相关连接器
第二步：suggest_connectors → 推荐给用户安装
第三步：用户 opt-in 后，工具才可用
```

不是搜索→安装→到→就能用。用户必须在中间明示 opt-in。这跟 OAuth 的授权流程逻辑一致——**工具能力在，但权力在用户手里。**

### 4.2 搜索策略：什么时候该闭嘴去查

`web_search` 的定义短到只有一句话——"Search the web"。但围着这一个工具写下的"什么时候该搜"的规则，铺了两页纸。

判断逻辑非常清晰：**能稳的别搜，会变的必搜。** 勾股定理、宪法签署年份——这种钉死了的事直接答，搜了纯属浪费。但"哈佛现任校长是谁""某某还是不是 CEO"——这种会变的当前状态，必须先搜再开口。

判断的关键不在"模型知不知道"，而在"这事会不会变"。Fable 5 把这条写死进了规则里：

> partial recognition from training does not mean current knowledge. An unfamiliar capitalized word is almost certainly a name that postdates training.

翻译过来就是："训练时见过个大概"不等于"现在还了解"。一个不认识、首字母还大写的词，十有八九是训练之后才冒出来的新名字。哪怕概念上眼熟——版本号、新产品名、新上任的人——也得乖乖去搜。搜一下几秒钟，张口胡编赔进去的是用户的信任。

`web_fetch` 也配了一把锁：只能抓用户给的确切 URL 或者搜索结果返回的 URL，"不许自己编一个 URL 去抓"。连去哪抓，都不让模型凭记忆决定。

### 4.3 工具设计的三个心机

除了"什么时候用"，Fable 5 在"怎么用"上藏了几个非常精巧的设计。

**心机一：用参数顺序逼模型先想清楚再动手。** `create_file` 有三个参数：`description`（为什么建）、`path`（路径）、`file_text`（内容）。描述里反复强调顺序——先写为什么，再写路径，最后写内容。大模型是一个字一个字往外蹦的，先写出来的东西会影响后面写的。把"为什么"放最前面，等于逼它在真正动手之前先把意图想清楚、说明白。

**心机二：给策略，不给语气。** `message_compose` 是帮你起草消息的工具。一般写法是给几个"语气版本"——正式版、随和版、热情版。Fable 5 明确反对这么干，要求生成的是通向不同结果的"策略"——"据理力争"还是"委婉铺垫"，"直接挑明"还是"软着陆"——每个方案都得标清楚它在优先什么、牺牲什么。不替你选，帮你把选项看全。

**心机三：动手前先读说明书。** Fable 5 有一条铁律：

> Reading the relevant SKILL.md is a required first step before writing any code, creating any file, or running any other tool.

翻译：动手写代码、建文件、调任何工具之前，先去读对应的 SKILL.md——这是必须的第一步。注意原文的措辞——required（必须），first step（第一步）。没有"你觉得需不需要"这种弹性空间。模型动手写代码之前，必须先翻对应技能的说明书。提示词里还配了例子——用户说"帮我做个 PPT"，模型的标准动作不是开始写，而是立刻去查看 pptx 技能的 SKILL.md，读完再动手。

这机制其实就是 Claude Code 中 [Skills 系统的底层逻辑](/posts/2026/06/09/claude-code-skills-guide/)——Skills 真正值钱的不是那几步操作说明，是它把当前环境里独有的坑和约束攒了下来，而这些恰恰是模型训练数据里没有的。Fable 5 干脆不给模型"自我判断"的机会，无条件先读再说。有时候让模型笨一点、老实一点，比让它自由发挥更靠谱。

---

## 5. Fable 5 vs Opus 4.8：两份提示词的差异表格

| 维度 | Opus 4.8 | Fable 5 | 变化 |
|------|----------|---------|------|
| 行数 | ~1,409 | ~1,598 | +13% |
| 产品定位 | "最新最先进的模型" | "Mythos 级，Fable 5 是最强的公开发模型" | 有了 Mythos 双轨概念 |
| 默认立场 | `默认帮助` | 无此标签 | 默认帮助在高能力模型上更危险 |
| 搜索策略 | `搜索第一位` | 内化 | 能力代际升级 |
| 记忆系统 | 无 | 全套 `<memory_system>` | F5 的系统级记忆 |
| 儿童安全 | 简要 | 7 条详细规则 | 分层协议 |
| 公平性 | 无 | `<evenhandedness>` | 新增 |
| 反过度依赖 | 无 | 拒绝挽留对话 | 新增 |
| 记忆禁止短语 | 无 | 15+ 种被禁短语 | 新增 |
| 第三方工具 | 简要 | `search_mcp_registry` + `suggest_connectors` | 新增完整连接器流程 |
| 可视化 | 简要 | 四步决策流程图 | 显著扩展 |
| 心理边界 | 简要 | 禁止替代性自伤建议（握冰块、橡皮筋等） | 精确到具体行为 |
| Artifacts 存储 | 无 | 完整的 Storage API 文档 | 新增 |

表里两行最值得注意。搜索策略：Opus 4.8 需要 `<search_first>` 标签显式告诉模型"先搜再答"，Fable 5 把这个行为内化了——这是代际能力升级的标志，上一代靠指令，新一代靠默认行为。默认立场：Opus 4.8 有 `<default_stance>`，Fable 5 删了这句话——更高能力的模型上默认帮助意味着更高风险，所以 Fable 5 不靠压制帮助意愿来控制，靠的是第 2 节拆过的分层审查体系。

总体规律就是一句话：**Fable 5 不是在 Opus 4.8 的提示词上改了几行字，是围绕"更强的模型需要更细粒度的控制"全面重构。**

---

## 6. 从这份提示词里能学到的五条提示词工程经验

### 经验一：结构 > 措辞

XML 标签不只是注释——它们构建了一个 Agent 可以解析的范围边界。`<claude_behavior>` 限制了行为域，`<memory_application_instructions>` 精确划分了引用规则。这是唯一能在 30K token 长度下不互相污染的编排方式。

### 经验二：反面清单 > 正面指令

Fable 5 记忆系统的禁止短语列表是最好范例。告诉模型"不要这样说"，比告诉模型"要怎么说"更可靠。因为正面指令有无限种解释方式，反面指令只有一种——不说就对了。

### 经验三：示例嵌入，不是示例追加

提示词中的记忆应用示例不是以"举个例子"开头的，是模拟完整的对话上下文（`<example_user_memories>` + `<user>` + `<good_response>` + `<bad_response>`）。每个示例是独立可执行的对话单元，没有"希望你会举一反三"的模糊期望。

### 经验四：层级控制，从粗到细

Fable 5 的安全护栏不只有"拒绝"这一层。同一项规则在提示词中有三层执行：
1. 概述层（`<refusal_handling>`）
2. 专项层（`<critical_child_safety_instructions>`、`<user_wellbeing>`）  
3. 行为约束层（禁止短语、禁止行为的具体实例）

三层同向施力，任何一层单独失效，另外两层依然有效。这是 Agent 安全工程的基本策略。

### 经验五：放弃一些用户留存的度量，才能保护用户

"Claude 不挽留对话"这一条特别值得思考。大多数 AI 产品设计时，提示词里会潜在地鼓励"让用户多聊一会儿"。Fable 5 反过来了——用户说了结束就结束，不感谢、不挽留。这不是 UX 失误，是产品哲学的主动选择。

---

## 7. 结语

泄露事件本身的戏剧性——72 小时被 jailbreak（绕过安全护栏提取系统指令）、美国政府出口管制、开发者把泄露提示词注入 Opus 4.8 实现"一行代码复活"——是 AI 安全困境的又一个案例。但 Fable 5 提示词泄露的真正价值不在安全八卦里，在它展示了一套成熟的 AI Agent 操作系统的内部设计。

从 `<claude_behavior>` 到 `<memory_system>`，从 55 个工具定义到 15 种禁止短语，从二阶段 MCP 授权到心理边界指令——这份提示词不是"让 AI 变聪明"的咒语，是"让 AI 变可靠"的设计文档。

Anthropic 没有把它加密、混淆或藏起来，它就在网上，任何人可以阅读。这份透明度本身，就是这个领域里最好的教材。

下一篇回归工程实战——从这份提示词的设计原则出发，讲讲怎么搭一个开源版的最小 Agent Harness。给你一个能跑起来的例子，你也能自己玩。

*感谢阅读。*

---

**参考资料**

[^1]: Fable 5 完整系统提示词——[CLAUDE-FABLE-5.md](https://github.com/elder-plinius/CL4R1T4S/blob/master/ANTHROPIC/CLAUDE-FABLE-5.md)，Pliny the Liberator / CL4R1T4S
[^2]: Anthropic 提示词按版本 diff 归档——[system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks)，含 Fable 5、Opus 4.8 等
[^3]: AlphaSignal [《Claude Fable 5 Prompt Leak Is a User's Manual for AI Agents》](https://alphasignalai.substack.com/p/claude-fable-5-prompt-leak-is-a-user) ——提示词 token 预算分析
[^4]: AY Automate [《Claude Fable 5 System Prompt Leak — Full Technical Breakdown》](https://www.ayautomate.com/blog/claude-fable-5-system-prompt-leak) ——1,585 行逐节拆解
[^5]: 华盛顿邮报 [《Anthropic Leak Reveals Inner Workings of Claude AI》](https://www.washingtonpost.com/technology/2026/05/11/anthropic-system-prompt-leak/) ——事件媒体报道
[^6]: 腾讯科技 [《Claude Fable 5 系统提示词曝光》](https://cloud.tencent.com/developer/article/2687467) ——中文技术社区解读

