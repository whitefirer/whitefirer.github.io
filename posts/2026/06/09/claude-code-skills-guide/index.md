# Claude Code Skills 深度解析：把经验写成可复用的知识模块


> 插件给能力，Hooks 给自动化，Skill 给的是方法论。三层递进，打造 AI 编程的完整技术栈。

---

## 前言

[《Claude Code 插件完全指南》](/posts/2026/04/28/claude-code-plugins-guide/) 讲了"用什么"——四个插件一个 MCP，token 消耗直降 70-80%。
[《Claude Code Hooks 完全指南》](/posts/2026/06/02/claude-code-hooks-guide/) 讲了"怎么自动化"——九种 Hook 类型，十一个妙用场景，事件驱动一切。

本文讲第三层：**Skill——怎么把经验写成可复用的知识模块**。

插件是外挂装备，Hooks 是自动触发器，Skill 是方法论本身。把"怎么做一个事"的经验提炼成结构化指令，让 AI 在遇到同类任务时自动加载执行——这就是 Skill。

---

## 1. 什么是 Skill？一个三层模型

把 AI 编程工具的能力想象成三层：

<svg id="three-layer-model" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 270" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="sk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="hk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="pl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.10"/></filter></defs><!-- Plugin/MCP --><g filter="url(#sh)"><rect x="40" y="196" width="600" height="64" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="40" y="196" width="600" height="34" rx="8" fill="url(#pl)"/><rect x="40" y="222" width="600" height="8" fill="url(#pl)"/><circle cx="66" cy="213" r="11" fill="#fff" opacity="0.25"/><text x="66" y="218" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">①</text><text x="86" y="218" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Plugin / MCP</text><text x="216" y="218" fill="rgba(255,255,255,0.75)" font-size="11" font-family="system-ui,sans-serif">能力边界 — 能做什么</text><text x="56" y="250" fill="#374151" font-size="12" font-family="system-ui,sans-serif">提供文件系统、终端、搜索等基础工具。没有这层，上面全是空谈。</text></g><line x1="340" y1="194" x2="340" y2="188" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,189 340,185 344,189" fill="#d1d5db"/><!-- Hooks --><g filter="url(#sh)"><rect x="40" y="120" width="600" height="64" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="40" y="120" width="600" height="34" rx="8" fill="url(#hk)"/><rect x="40" y="146" width="600" height="8" fill="url(#hk)"/><circle cx="66" cy="137" r="11" fill="#fff" opacity="0.25"/><text x="66" y="142" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">②</text><text x="86" y="142" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Hooks</text><text x="168" y="142" fill="rgba(255,255,255,0.75)" font-size="11" font-family="system-ui,sans-serif">自动化 — 什么时候触发</text><text x="56" y="174" fill="#374151" font-size="12" font-family="system-ui,sans-serif">在正确的时间触发正确的事。但不告诉模型"怎么做"。</text></g><line x1="340" y1="118" x2="340" y2="112" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,113 340,109 344,113" fill="#d1d5db"/><!-- Skill --><g filter="url(#sh)"><rect x="40" y="28" width="600" height="78" rx="8" fill="#fff" stroke="#10b981" stroke-width="2"/><rect x="40" y="28" width="600" height="38" rx="8" fill="url(#sk)"/><rect x="40" y="58" width="600" height="8" fill="url(#sk)"/><circle cx="66" cy="47" r="12" fill="#fff" opacity="0.25"/><text x="66" y="52" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">③</text><text x="88" y="52" fill="#fff" font-size="14" font-weight="700" font-family="system-ui,sans-serif">Skill</text><text x="162" y="52" fill="rgba(255,255,255,0.8)" font-size="11" font-family="system-ui,sans-serif">方法论 — 怎么做</text><rect x="526" y="33" width="102" height="22" rx="11" fill="#fff" opacity="0.20"/><text x="577" y="48" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">本文主题</text><text x="56" y="92" fill="#374151" font-size="12" font-family="system-ui,sans-serif">定义一套规范：做 A 类任务时，先干啥、再干啥、<tspan font-weight="700" fill="#10b981">不能干啥</tspan>。这是行为编码。</text></g></svg>

**第一层是能力边界**：没有文件系统，什么都白搭。插件和 MCP 负责这层。

**第二层是自动化**：Hooks 在正确的时间做正确的事。但不告诉模型"怎么做"。

**第三层是方法论**：Skill 定义一套规范——"做 A 类任务时，先干啥、再干啥、不能干啥"。这不是自动化，是**行为编码**。

一个类比：

| 层 | 类比 | 例子 |
|---|------|------|
| Plugin/MCP | 给你一个工具箱 | read_file、terminal、写文件 |
| Hooks | 定时拿起工具 | "改完代码自动格式化" |
| Skill | 说明书里的操作规范 | "修 bug：先写复现测试，再定位根因，再修，再验证" |

三层缺一不可。有工具箱没说明书，乱敲。有说明书没自动化，手忙脚乱。

---

## 2. Superpowers 的 Skill 体系

Superpowers 插件提供了 15+ 个 Skill，覆盖完整开发流程：

| 阶段 | Skill | 做什么 |
|------|-------|--------|
| 规划 | brainstorming | 苏格拉底式需求澄清 |
| | writing-plans | 把需求拆成 2-5 分钟小任务 |
| 实现 | test-driven-development | 强制 RED-GREEN-REFACTOR |
| | executing-plans | 按计划批量执行 |
| | subagent-driven-development | 子 agent 并行开发 |
| 审查 | requesting-code-review | 对照计划审查 |
| | receiving-code-review | 接收反馈 |
| 收尾 | finishing-a-development-branch | 验证、合并、PR |

这些不是简单的提示词片段。每个 Skill 是一套完整的**行为契约**——定义了 Agent 在特定情境下必须遵守的规则、步骤和边界。

### 2.1 加载机制：Skill 是怎么"活"起来的

Superpowers 用了三个 Hook 来实现 Skill 的加载和生命周期管理：

| Hook | 时机 | Skill 用途 |
|------|------|-----------|
| **SessionStart** | 会话启动 | 把所有 Skill 的名称和描述注入上下文 |
| **UserPromptSubmit** | 用户每次发消息 | 检测意图，匹配对应 Skill |
| **Stop** | Agent 准备结束 | 验证 Skill 要求的检查点是否完成 |

关键在 `UserPromptSubmit`：用户说"帮我修个 bug"，Superpowers 检测到 `debug` 意图，自动加载 `systematic-debugging` Skill。用户不需要敲 `/debug`，不需要记 Skill 名。**意图匹配 → 自动加载 → 强制执行**。

这和传统 IDE 的快捷键完全不同——不是"你按哪个键我就做哪个事"，而是"你说了什么，我理解你要做什么，然后按正确的方式做"。

<svg id="skill-lifecycle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 135" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><filter id="sh2"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter></defs><g filter="url(#sh2)"><rect x="14" y="42" width="108" height="52" rx="8" fill="#9ca3af"/><text x="68" y="62" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">SessionStart</text><text x="68" y="80" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="10" font-family="system-ui,sans-serif">注册元信息</text></g><line x1="122" y1="68" x2="134" y2="68" stroke="#d1d5db" stroke-width="1.5"/><polygon points="130,64 137,68 130,72" fill="#d1d5db"/><g filter="url(#sh2)"><rect x="140" y="42" width="110" height="52" rx="8" fill="#6366f1"/><text x="195" y="62" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="system-ui,sans-serif">UserPromptSubmit</text><text x="195" y="80" text-anchor="middle" fill="rgba(255,255,255,0.75)" font-size="10" font-family="system-ui,sans-serif">意图匹配</text></g><line x1="250" y1="68" x2="262" y2="68" stroke="#d1d5db" stroke-width="1.5"/><polygon points="258,64 265,68 258,72" fill="#d1d5db"/><g filter="url(#sh2)"><rect x="268" y="42" width="108" height="52" rx="8" fill="#f59e0b"/><text x="322" y="62" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">加载 Skill</text><text x="322" y="80" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="10" font-family="system-ui,sans-serif">注入完整内容</text></g><line x1="376" y1="68" x2="388" y2="68" stroke="#d1d5db" stroke-width="1.5"/><polygon points="384,64 391,68 384,72" fill="#d1d5db"/><g filter="url(#sh2)"><rect x="394" y="42" width="108" height="52" rx="8" fill="#10b981"/><text x="448" y="62" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">执行规则</text><text x="448" y="80" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="10" font-family="system-ui,sans-serif">按 Skill 行事</text></g><line x1="502" y1="68" x2="514" y2="68" stroke="#d1d5db" stroke-width="1.5"/><polygon points="510,64 517,68 510,72" fill="#d1d5db"/><g filter="url(#sh2)"><rect x="520" y="42" width="108" height="52" rx="8" fill="#f43f5e"/><text x="574" y="62" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui,sans-serif">Stop</text><text x="574" y="80" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="10" font-family="system-ui,sans-serif">验证闭环</text></g><rect x="30" y="108" width="580" height="22" rx="6" fill="#f3f4f6"/><text x="320" y="123" text-anchor="middle" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">Hook 事件驱动链：注册 → 匹配 → 加载 → 执行 → 验证，缺一环 Skill 就不完整</text></svg>

### 2.2 命令行入口：`/skills` 和 `/writing-skills`

Superpowers 不只是被动匹配意图加载 Skill，它还给用户提供了显式的命令行控制：

**`/skills`** — 列出所有可用 Skill。Agent 会回复一个清单，标注每个 Skill 的用途和适用场景。刚装完 Superpowers 不知道它有什么能力？敲 `/skills`。

**`/writing-skills`** — 创建新 Skill 的最佳实践指南。当你告诉 Claude Code "帮我写一个 Skill 做 X"，Superpowers 会加载这个指南，确保写出来的 Skill 符合规范——铁律开头、反驳预判、验证闭环。相当于 Skill 的 Skill。

### 2.3 `/run-skill-generator`：Anthropic 官方的 Skill 工厂

除了 Superpowers 提供的方法论指南，Claude Code 还内置了 `/run-skill-generator`——Anthropic 官方维护的 Skill 创建器（开源仓库 `github.com/anthropics/skills`，位于 `skill-creator/` 目录）。

它不是一个简单的"你说需求我生成"机器人，而是一个结构化的 Skill 开发流程向导：

**核心流程**：`明确目标 → 编写草稿 → 定义测试 → 评估结果 → 迭代优化`。每一轮都有量化的品质评估，不是生成就完事。

**结构化管理**：自动生成标准 Skill 目录结构——`SKILL.md` 主文件 + `scripts/` 脚本 + `references/` 参考文档 + `assets/` 模板资源。

**智能优化**：能分析 Skill 的触发失败案例，自动重写 `description` 字段，提升被正确激活的概率。这是它最特别的功能——Skill 写完不是死的，它会学习、会进化。

**原理基础**：底层依赖渐进式披露（Progressive Disclosure）——Claude 平时只加载 Skill 的名称和简介，仅在判断需要时完整加载。和 2.1 节的三 Hook 加载机制完全一致。

### 2.4 Skill 的物理形态

一个 Skill 就是一个 Markdown 文件。以 TDD Skill 为例，它的结构长这样：

```markdown
# Test-Driven Development (TDD)

## Overview
Write the test first. Watch it fail. Write minimal code to pass.

## When to Use
Always: New features, bug fixes, refactoring

## The Iron Law
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

## Red-Green-Refactor Cycle
### RED — Write Failing Test
### Verify RED — Watch It Fail
### GREEN — Minimal Code
### Verify GREEN — Watch It Pass
### REFACTOR — Clean Up

## Why Order Matters
"Tests after code pass immediately. Passing immediately proves nothing."

## Common Rationalizations
| Excuse | Reality |
| "I'll test after" | Tests passing immediately prove nothing |

## Red Flags
If you catch yourself doing any of these, delete the code:
- Code before test
- Test passes immediately on first run
- Rationalizing "just this once"

## Verification Checklist
- [ ] Every new function has a test
- [ ] Watched each test fail before implementing
```

注意几个关键设计：

**1. 铁律在最前面**。`NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`——Agent 看到的第一条就是不可违背的规则。不是"最好这样做"，是"不这样做就删代码重来"。

**2. 反驳预判**。Skill 不只是告诉 Agent 怎么做，还预判了 Agent 可能会找什么借口。"I'll test after"、"Too simple to test"、"TDD will slow me down"——这些都是真实的人（和 AI）会出现的合理化借口。Skill 提前堵死了。

**3. 红牌机制**。`Red Flags` 章节列出"这样做就等于没遵守规则"的信号。Agent 可以对照自查：我是不是在找借口？

**4. 检查清单**。Skill 的最后是 Checklist——不是给用户看的，是给 Agent 自检的。每次任务结束前对照检查，没打勾就意味着没做完。

这套设计哲学比 Skill 的内容本身更重要。它回答了："怎么让一个 LLM 可靠地按照你的方法做事？"

---

## 3. 两种路径：手写与蒸馏

上面拆解了 Skill 的结构。现在来真的：怎么产出你自己的 Skill？

有两条路。

### 3.1 路径一：手写

你很清楚自己要什么规则——"每次 review Python 代码，检查类型注解、异常处理、资源关闭"。你对 Agent 可能偷懒的地方有预判。坐下来直接写，像前面的 TDD Skill 一样，铁律开头、反驳预判、红牌收尾。

这条路适合：
- 规则在你脑子里已经成型
- 你想精确控制每个措辞、每个反驳、每个红牌
- 不信任 AI 代笔——你比 AI 更清楚 Agent 会怎么偷懒

你可以裸写，也可以借助 `/writing-skills`（Superpowers）或直接让 Claude Code 帮你生成——它们都会按规范帮你生成结构化的 Skill 文件。区别只是谁来驱动：**手写是你驱动规则，AI 辅助是 AI 驱动格式**。前者你写内容、AI 排版；后者你描述需求、AI 写全部。

**来看一个手写的实际例子。** 假设你要写一个 Python 代码审查 Skill。

第一版，凭直觉写：

```markdown
# Python Code Review

Please review Python code carefully.

Check:
- Type hints
- Exception handling  
- Resource management

Be thorough.
```

放进 `.claude/skills/`，试一下。结果：有时只检查类型忽略了异常处理，有时一句 "looks good" 糊弄过去。**太软了。** Agent 会偷懒。

回头看 TDD Skill 的设计，第二版改成了硬约束：

```markdown
# Python Code Review

## When to Use
After every file modification. Before claiming work is done.

## Mandatory Checks

### 1. Type Annotations — ALL public functions
For EVERY function with `def f(x):` signature, check:
- [ ] Parameters have type annotations
- [ ] Return type specified `-> Type`
- [ ] No `Any` (use `object` or generic)

If ANY function lacks type hints, report it. Do NOT approve.

### 2. Exception Handling — ALL I/O
For EVERY `open()`, `requests.`, `socket.`, `subprocess.`:
- [ ] Wrapped in try/except with specific exception types (not bare `except:`)
- [ ] Exception is logged or re-raised with context
- [ ] Resources cleaned up in `with` or `finally`

### 3. Resource Management — ALL file/connection opens
For EVERY file handle, DB connection, network socket:
- [ ] Uses `with` statement OR explicit `.close()` in `finally`

## Output Format

### Type Annotations: N/M checked, K issues
- Line 42: missing return type on `get_user()`
### Exception Handling: ok / issues
### Resource Management: ok / issues
**Verdict:** PASS / NEEDS FIX

## Red Flags
- "Looks good overall" → you didn't check line by line
- "Code is simple" → simplicity doesn't excuse missing types
- "Existing code also lacks types" → we're improving it now

## After Review
If PASS: mark task complete. If NEEDS FIX: list specific changes required.
```

对比第一版和第二版：

| 第一版 | 第二版 | 改了啥 |
|--------|--------|--------|
| "Please review" | "Mandatory Checks" | 软请求 → 硬规则 |
| "Check type hints" | "For EVERY function, check annotations/return type/Any" | 模糊 → 精确 |
| 无输出规范 | 固定报告模板 | Agent 没法用 "looks good" 糊弄 |
| 无 Red Flags | 三条自检 | 预判合理化借口 |
| 无后续动作 | "After Review" | 定义完成标准 |

**核心原则：Skill 不是建议，是约束。** 手写的好处就在这里——你知道 Agent 哪句话是在偷懒，你能提前堵死。这是 AI 代笔做不到的精细度。

### 3.2 路径二：蒸馏

另一条路更"懒"——

Perl 之父 Larry Wall 说过，程序员有三种美德：

> **懒惰、急躁、傲慢。**

排名第一的是懒惰。不是躺平——而是：

> "懒惰会驱使你写省力的程序，让你宁愿花三小时自动化一件只需要十分钟的重复劳动。"

这听起来不理性。花三小时省十分钟？但 Larry Wall 比大多数人更早意识到：**重复是效率的死敌，而懒惰是对重复最健康的反应。**

你花三小时写一个自动化脚本，省下的不止十分钟——你省下了未来每一次重复的十分钟。一个月省五小时，一年省六十小时。

Skill 就是这个逻辑。你花三十分钟让 Claude Code 把刚做完的一个项目的经验蒸馏成 Skill，下个项目遇到同类任务就不再重复试错。

蒸馏路径的关键工具就是 Claude Code 本身。你向它描述需求，它读你的项目历史，然后生成结构化 Skill。不需要特殊命令——就用对话。

#### 三种蒸馏原料

不是只蒸馏你自己。蒸馏有三种原料，对应三层经验：

| 原料 | 蒸馏什么 | 例子 |
|------|---------|------|
| **蒸馏自己** | 你反复纠正 AI 的规则、你的判断偏好 | "别在函数里 `SessionLocal()`，用 `Depends`" |
| **蒸馏 AI** | AI 在项目中长出来的模式、试探出的边界 | AI 发现你总在路由最后加 `raise HTTPException`，自动归纳 |
| **蒸馏项目实践** | 具体项目的踩坑经验、技术选型理由 | "这个库的 `batch_insert` 比 `add_all` 快 10 倍" |

三种原料混在一起蒸，出来的 Skill 比你手写的更完整——因为手写只能覆盖你知道的东西，蒸馏能抓到你自己都没意识到的模式。

举个例子：

假设你刚用 Claude Code 做完一个 FastAPI 项目——写了十几个路由、几十个 pydantic model、一堆数据库迁移。过程中你发现：

- 每次写路由，都要强调"别忘了 dependency injection"
- 每次写 model，都要提醒"字段加 Field(description=...)"
- 每次写 migration，都要检查"alembic revision 有没有 --autogenerate"
- 每次写完改完，都要手动跑 `pytest -x --cov`

这些是你在这个项目里反复纠正 Claude Code 的东西。项目做完了，经验在你脑子里，但 Claude Code 不知道。

**这时候你对 Claude Code 说**：

```text
从这个项目中学到的 FastAPI 开发规范，帮我写成一个 Skill。
```

Claude Code 读了你的 CLAUDE.md、git log、会话历史（如果你的 claude-mem 开着），然后生成一个 Skill：

```markdown
# FastAPI Development

## When to Use
Any task involving FastAPI route, model, or migration changes.

## Mandatory Rules

### Routes
- [ ] Use dependency injection: `db: Session = Depends(get_db)`
- [ ] Return type annotated: `-> dict[str, Any]`
- [ ] HTTPException with detail message, not bare 500
- [ ] Validate path parameters with `Path(...)` not raw int

### Pydantic Models
- [ ] Every field has `Field(description="...")`
- [ ] Response model inherits from `BaseModel`, not dict
- [ ] Use `model_config = ConfigDict(from_attributes=True)` for ORM

### Database Migrations
- [ ] Run `alembic revision --autogenerate -m "describe change"`
- [ ] Check generated migration file for correctness
- [ ] Run `alembic upgrade head` and verify

### After Every Change
- [ ] Run `pytest -x --cov` — ALL tests must pass
- [ ] Run `ruff check .` — zero lint errors
- [ ] If any fail, fix before claiming done

## Red Flags
- "Looks good" without running tests → you didn't verify
- Skipping migration when model changed → schema will drift
- Raw `dict` response instead of pydantic model → bypasses validation

## Commit Convention
Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`
```

这不是你写的。**是 Claude Code 从你的项目历史里提炼出来的**。你纠正过它的模式、你强调过的规则、你重复过三遍以上的要求——全被蒸馏进了这个 Skill。

### 3.3 两条路怎么选

| | 手写 | 蒸馏 |
|---|------|------|
| **起点** | 脑子里有规则 | 项目里有经验 |
| **优势** | 精确控制措辞，预判偷懒点 | 从真实摩擦中提取，不漏 |
| **劣势** | 可能遗漏你没意识到的坑 | 需要审查，AI 可能过拟合 |
| **适合场景** | 规范明确、你很清楚要什么 | 做完项目后发现"下次得记住这个" |
| **工具** | 裸写；也可让 Claude Code 辅助排版 | 直接对话生成；`/writing-skills` 提供规范参考 |

### 3.4 蒸馏流程三步走

```
项目完成
    ↓
① 复盘：告诉 Claude Code "从这个项目中学到的规范，写成 Skill"
    它读 CLAUDE.md + git log + 会话历史
    ↓
② 审查：删掉过拟合的规则（"这个项目用 SQLite，但别把 SQLite 写进 Skill"）
    保留跨项目通用的部分
    ↓
③ 复用：下个同类项目启动时，Skill 已自动加载
    不需要重新纠正 Claude Code
```

**第一步是关键**。很多人做完项目就关终端了。但最有价值的不是代码本身——代码可能下个项目用不上——而是**你在这个项目里建立的协作模式**。

一个例子：你在 Cenacle 项目里反复纠正 Claude Code "用 FastAPI 的 `Depends` 而不是在函数里 `SessionLocal()`"。这个纠正本身不值一提——但你如果没把它蒸馏成 Skill，下个 FastAPI 项目 Claude Code 还会犯同样的错。你又得纠正一遍。

蒸馏一次 = 未来所有项目自动正确。

### 3.5 什么时候该蒸馏

不是每个项目都值得蒸馏。判断标准：

- **同类项目还会再做吗？** → 蒸馏。比如 FastAPI 项目、Hugo 博客文章、ESP32 固件。
- **踩过三个以上的坑吗？** → 蒸馏。纠正三次以上的模式 = Claude Code 的学习盲区，Skill 覆盖。
- **一次性脚本？** → 不蒸馏。写完就扔的东西不值得。

一个健康的节奏：**每完成一个项目或阶段性里程碑，花 10 分钟做一次蒸馏**。一个月后，你会有 5-10 个高质量 Skill，覆盖你 90% 的日常任务类型。每个新项目不再从零纠正 Claude Code——Skill 已经帮你纠正好了。

这就是 Larry Wall 说的"懒惰"。**宁愿花三十分钟蒸馏经验，也不在未来的每个项目里重复纠正同样的错。**

---

## 4. CLAUDE.md 与 Skill 的区别

很多人把 CLAUDE.md 当 Skill 用——在项目根目录写一堆规则。但两者有本质区别：

| | CLAUDE.md | Skill |
|---|-----------|-------|
| **作用域** | 项目级，常驻 | 任务级，按需加载 |
| **加载时机** | 会话启动时 | 意图匹配时 |
| **内容** | 项目背景、架构、约定 | 任务方法论、步骤、检查点 |
| **大小** | 几十行到几百行 | 几十行（越短越好） |
| **目的** | "这个项目长这样" | "这个任务这么做" |

**CLAUDE.md 告诉你"在哪"**：

```markdown
# Project: Cenacle
- Python + FastAPI + React
- 测试: pytest, 前端: npm test
- DB: SQLAlchemy + SQLite
- 端口: 9100
- 部署: daemon.py 管理
```

**Skill 告诉你"怎么做"**：

```markdown
# TDD
Write test first. Watch it fail. Write minimal code. Refactor.
```

**什么时候用哪个？**

- 让 Agent 理解**项目是什么** → CLAUDE.md
- 让 Agent 理解**任务该怎么做** → Skill
- 一个项目可以有一个 CLAUDE.md 和很多个 Skill

**两者配合的例子**：

CLAUDE.md 告诉 Agent "数据库用 SQLAlchemy ORM + SQLite，测试用 pytest"。当一个 code-review Skill 被触发时，Agent 已经知道项目的技术栈，Skill 只需要关注审查规则本身。CLAUDE.md 提供上下文，Skill 提供方法论——**各司其职，不重复不冲突**。

**Skill 也可以按项目配置。** 放在项目目录 `.claude/skills/` 下的 Skill 只在进入该项目时加载，离开就不可见；放在 `~/.claude/skills/` 下的是全局 Skill，所有项目通用。比如 `sticks3-dev` 放 ESP32 项目里——写其他项目时它不会跳出来。CLAUME.md 描述"这个项目是什么"，项目 Skill 描述"在这个项目里怎么做特定任务"——两者天然一对。

---

## 5. 好的 Skill 长什么样 —— 五条设计原则

拆了几个 Skill，也写了一个，总结出五条规律：

### 原则一：铁律开头，不留灰色地带

Skill 的第一条内容必须是不可妥协的规则。

**好**：`NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST`
**差**：`It's generally a good idea to write tests`

Agent 会试探边界。模糊的规则 = 不存在的规则。

### 原则二：反驳预判，堵死借口

最精彩的设计是预判 Agent 可能出现的合理化行为，然后提前否定。

Agent 的典型借口：
- "代码太简单不需要测试" → Skill 里写 "Simple code breaks. Test takes 30 seconds."
- "我已经手工测过了" → "Manual = ad-hoc. No record, can't re-run."
- "先写了代码再加测试也行" → "Tests passing immediately proves nothing."

这不是在跟 Agent 抬杠，是在**用经验堵死偷懒路径**。

### 原则三：结构化输出，防止"looks good"

Agent 最便宜的偷懒方式是给一个模糊的好评。强制它输出结构化报告——表格、清单、逐项打分——让它没法用一句"looks good"糊弄过去。

```markdown
## Code Review Report
### Type Annotations: 3/5 checked, 2 issues
- Line 42: missing return type
### Verdict: NEEDS FIX (2 issues)
```

格式化的本质是**防作弊**。

### 原则四：短于 80 行

Skill 越长，Agent 越容易忽略关键信息。理想的 Skill 在 50-80 行之间——刚好覆盖所有规则，但不会多到被跳读。

你可能会想"我把所有细节都写进去总没错"。但 LLM 的注意力是有限资源。80 行 Skill 里的每条规则都会被认真对待；200 行 Skill 的后半段大概率被忽略。

**精简技巧**：写完 Skill 后，逐行问"删掉这行，Agent 还会犯错吗？"不会就删。

### 原则五：验证闭环

好的 Skill 自带验证机制。不是"建议你这么做"，而是"不这么做就不能结束"。

Superpowers 用 Stop Hook 实现这个闭环：
- TDD Skill 要求每个函数有测试 → 检查 pytest 输出
- Code Review Skill 要求格式化输出报告 → 检查报告格式
- 验证失败 → Hook 返回 `block` → Agent 被迫回去补

Skill 定义标准，Hook 执行标准。Skill 写"应该怎样"，Hook 验证"做了没有"。

---

## 6. Skill 的边界：它解决不了什么

Skill 不是银弹。几个它解决不了的问题：

**1. Skill 不能替代判断**

Skill 说"所有函数必须有类型注解"，但 `__init__.py` 里的 `__all__ = [...]` 不需要注解。Agent 需要判断什么时候适用规则、什么时候不适用。Skill 提供的是框架，不是僵化的清单。

**2. Skill 质量取决于写的人**

Skill 本身是一段 prompt。写得差 = 效果差。一个模糊的 Skill 比没有 Skill 还糟——它给了 Agent 一个"我在遵循规则"的错觉。

**3. Skill 有 token 成本，但它自己会赚回来**

Skill 不是常驻上下文的。SessionStart 只注入每个 Skill 的名称和描述（约 20-30 token），让 Agent 知道有哪些可用。完整的 Skill 内容只在意图匹配或用户主动调用时才加载——没触发的 Skill 不占上下文。

一个 80 行的 Skill 大约 500-800 token。每次触发加载一次，平时不耗。

但这是笔划算的买卖——没有 Skill 的时候，Agent 用错误的方法做完任务，你得花好几轮对话纠正它。一轮"你这不对"→"哦我改"→"还不对"→"再改"的拉扯，轻松烧掉 3000-5000 token。一个 Skill 加载只要 800 token，却能一上来就走对路，省掉的不只是 token——还有你的时间和耐心。

判断值不值很简单：**Skill 省下的 token > Skill 自身的 token × 触发次数**。如果 800 token 的 Skill 每次帮你省两轮纠错（~6000 token），触发一次就回本，后面全是净赚。

但如果 Skill 设计得臃肿——200 行、塞满边缘情况、堆砌八百年不触发一次的规则——加载成本就会超过收益。精简是第一生产力。写完 Skill 后删掉一半字，再删一半，剩下的才是真的。

---

## 7. 结语：三层的完整图像

回过头来看这个系列的三篇文章：

| 篇 | 主题 | 核心问题 | 核心答案 |
|---|------|---------|---------|
| 一 | 插件 | 能做什么？ | 装备——压缩输出、记忆复用、语义搜索 |
| 二 | Hooks | 什么时候做？ | 触发器——事件驱动，自动执行 |
| 三 | Skill | 怎么做？ | 方法论——行为编码，经验模块化 |

装完插件，配好 Hooks，写好 Skill——Claude Code 从"终端里的 AI 助手"变成了"会按照你的方法论做事的工程搭档"。

但这里有一个更深的问题：**如果你已经有一整套插件 + Hooks + Skills，这和"你自己的 Agent 框架"的差别在哪？**

实际上，差别已经很小了。Superpowers 的 Skill 加载机制（意图匹配 + 自动注入），配合 Hooks 的事件驱动，本质上就是一个 Agent 框架的雏形。你只是在别人的平台上跑自己的规则。

下一站或许是 Hermes Agent——Nous Research 开源的 Agent 框架，自带持久记忆和自动 Skill 进化。你把 Claude Code 当执行引擎，Hermes 当任务编排者，一个分析需求拆解任务，一个写代码跑测试。从"在别人平台上写插件"到"编排自己的 Agent 团队"。但那是另一个故事了。

*感谢阅读。*


