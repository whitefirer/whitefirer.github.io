# Harness Engineering 入门：从 Prompt 到 Context 到 Harness，Agent 工程的最后一层


> 提示词管一句话，上下文管一个窗口，Harness 管 Agent 的整个运行环境——怎么跑、跑错了怎么纠、怎么让同一个错误不再犯第二次。

---

## 前言

[上一篇](/posts/2026/06/25/claude-fable5-prompt-analysis/)拆了 Fable 5 的 120K 字符系统提示词。拆完之后我一直在想一个问题：Fable 5 的提示词里有一半篇幅在定义工具、写搜索规则、配 MCP 连接器——这些东西本质上不是"告诉模型怎么说话"，是**给模型搭了一个可以安全运行的工作环境。**

这个工作环境有一个名字，叫 Harness。

Mitchell Hashimoto（HashiCorp 创始人，Terraform 作者）在今年 2 月提了这个概念。他说了句很戳我的话：

> Every time an agent makes a mistake, you don't just tell it to do better next time. You change the system so that specific mistake becomes **structurally harder to repeat**.

翻译：每次 Agent 犯错，你不是对它说"下次注意"。你直接把系统改了，让这个错从此犯不了。

Harness 这个词原义是马的挽具——但不止挽具本身。缰绳、马鞍、嚼子、笼头、马蹄铁、马镫、马刺，再加上马车和马路/轨道，才是一套完整的驾驭系统。马有力量，但光靠一匹马哪都去不了——你得有全套装备，还得有路。AI 同理：模型是马，Harness 是这套系统。这就是 Harness Engineering。

---

## 1. 从一个翻车现场说起

先看一个真实场景。你用 Claude Code 写了一个代码审查 Agent，配了 prompt："请审查以下代码，检查类型注解、异常处理、资源管理。" Agent 跑完，回了一句：

> 代码看起来不错，类型注解基本齐全，异常处理也覆盖了主要路径。Looks good.

但你手动翻了一下——三个 `open()` 调用没写 `with`，两个函数缺返回类型，还有一个 `except:` 裸捕获。Agent 跳过了全部问题，自信地说没问题。

你怎么办？很多人第一反应是**改 prompt**：在提示词里写得更细、加更多"必须检查"的条款。写过提示词的人都懂——改完之后效果好一阵，过了两天又犯，继续微调，像修漏水的管子。

问题不在 prompt 上。问题在你只告诉 Agent"要做对"，但没建任何东西来**验证它做对了没有**。

这就到了 Harness 该上场的时候。

---

## 2. 三层模型：Prompt ⊂ Context ⊂ Harness

把 AI Agent 的工程体系想象成三层。我做了一张图，和前两篇 Context Engineering、Fable 5 分析的视角接在一起：

<figure>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 360" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="hp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="hc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="hh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter></defs><!-- Layer 1: Prompt --><g filter="url(#sh)"><rect x="40" y="12" width="600" height="68" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="40" y="12" width="600" height="30" rx="8" fill="url(#hp)"/><rect x="40" y="34" width="600" height="8" fill="url(#hp)"/><text x="56" y="32" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">① Prompt Engineering — 管一句话</text><text x="56" y="60" fill="#374151" font-size="11" font-family="system-ui,sans-serif">告诉模型"做什么"和"不能做什么"。但模型有主观能动性，它会绕、会忘、会偷懒。</text></g><!-- Arrow --><line x1="340" y1="80" x2="340" y2="102" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,101 340,105 344,101" fill="#d1d5db"/><!-- Layer 2: Context --><g filter="url(#sh)"><rect x="40" y="106" width="600" height="68" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="40" y="106" width="600" height="30" rx="8" fill="url(#hc)"/><rect x="40" y="128" width="600" height="8" fill="url(#hc)"/><text x="56" y="126" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">② Context Engineering — 管一个窗口</text><text x="56" y="154" fill="#374151" font-size="11" font-family="system-ui,sans-serif">管 token 预算、缓存策略、防污染——每一段上下文都要值回它的 token 成本。</text></g><!-- Arrow --><line x1="340" y1="174" x2="340" y2="196" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,195 340,199 344,195" fill="#d1d5db"/><!-- Layer 3: Harness --><g filter="url(#sh)"><rect x="40" y="200" width="600" height="82" rx="8" fill="#fff" stroke="#10b981" stroke-width="2"/><rect x="40" y="200" width="600" height="34" rx="8" fill="url(#hh)"/><rect x="40" y="226" width="600" height="8" fill="url(#hh)"/><text x="56" y="224" fill="#fff" font-size="14" font-weight="700" font-family="system-ui,sans-serif">③ Harness Engineering — 管整个运行环境</text><rect x="540" y="204" width="88" height="20" rx="10" fill="#fff" opacity="0.20"/><text x="584" y="218" text-anchor="middle" fill="#fff" font-size="9" font-weight="600" font-family="system-ui,sans-serif">本文主题</text><text x="56" y="252" fill="#374151" font-size="11" font-family="system-ui,sans-serif">怎么跑、跑错了怎么纠、输出怎么验证、同一个错误怎么从环境中铲掉。</text><text x="56" y="268" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">Prompt 是方向盘，Context 是路况信息，Harness 是安全带、刹车、护栏、黑匣子。</text></g><!-- Sub-layers of Harness --><g opacity="0.6"><rect x="60" y="300" width="110" height="20" rx="4" fill="#d1fae5"/><text x="115" y="314" text-anchor="middle" fill="#065f46" font-size="9" font-family="system-ui,sans-serif">工具系统</text><rect x="180" y="300" width="110" height="20" rx="4" fill="#d1fae5"/><text x="235" y="314" text-anchor="middle" fill="#065f46" font-size="9" font-family="system-ui,sans-serif">执行编排</text><rect x="300" y="300" width="110" height="20" rx="4" fill="#d1fae5"/><text x="355" y="314" text-anchor="middle" fill="#065f46" font-size="9" font-family="system-ui,sans-serif">状态与记忆</text><rect x="420" y="300" width="110" height="20" rx="4" fill="#d1fae5"/><text x="475" y="314" text-anchor="middle" fill="#065f46" font-size="9" font-family="system-ui,sans-serif">独立评估</text><rect x="540" y="300" width="88" height="20" rx="4" fill="#d1fae5"/><text x="584" y="314" text-anchor="middle" fill="#065f46" font-size="9" font-family="system-ui,sans-serif">约束恢复</text></g></svg>
<figcaption class="image-caption">图 1：Prompt ⊂ Context ⊂ Harness 三层模型</figcaption>
</figure>

回到代码审查 Agent 那个翻车现场。第一层（Prompt）告诉它查什么，第二层（Context）给它配了 Skill 和 CLAUDE.md。但它照样能跳过检查说没问题——因为这两层都依赖 Agent 主动遵守。**Harness 反过来了：它不靠 Agent 自觉，靠环境约束。**

具体做法：不让 Agent 自己说"我检查完了"，而是让 Harness 在 Agent 输出之后跑一轮自动化验证——`pytest` 跑了没、类型检查工具 `mypy` 过了没、退出码是不是零。任何一个没通过，输出直接打回，Agent 被迫回去修。

这就是三层的关系——Prompt 是方向盘，Context 是路况信息，Harness 是安全带、刹车、护栏和黑匣子。光靠"好好开车"和安全手册，出不了真正的安全——你得先把路修好。

---

## 3. Harness 的六个组件

Mitchell Hashimoto 的定义里，一个成熟的 Harness 有六个组成部分。我拿我自己的项目举例，每个组件你都能在 Devspace 里找到对应的东西：

### 3.1 结构化上下文管理

不只是堆上下文，是**把上下文按层级和生命周期组织好。**

| 我的做法 | 用什么 |
|---------|--------|
| 全局规则 | `~/.claude/CLAUDE.md` — commit 习惯、语言偏好、测试优先 |
| 项目规则 | 项目根目录 `CLAUDE.md` — 技术栈、端口号、已知坑 |
| 任务按需加载 | Superpowers Skills — 意图匹配时注入 |
| 动态信息注入 | Hook `UserPromptSubmit` — 当前 git 状态、最近操作 |

上一篇 Context Engineering 讲了怎么把上下文管好。这里不展开，只强调一点：**结构性会让 Agent 知道自己此刻在哪一层、该遵守什么。**

### 3.2 工具系统设计

Agent 能调什么工具、怎么调、异常怎么处理——全在这层定义。

| 我的做法 | 用什么 |
|---------|--------|
| Claude Code 内置工具 | Bash、Write、Edit、WebSearch — 日常开发的基础工具箱 |
| MCP 自定义工具 | 自研 MCP 服务 — 扩展 Claude Code 访问外部系统 |
| 权限控制 | MCP 鉴权层 — 关键操作必须 opt-in 授权 |
| 安全边界 | 敏感文件保护 Hook — `.env`、`secrets.yaml` 禁止 Write |

Fable 5 的提示词里有一半篇幅在干这件事——定义工具、写搜索规则、配连接器。我写完 [MCP 篇](/posts/2026/06/10/claude-code-mcp-guide/)之后做的几个 MCP 服务，就是这层的东西。

### 3.3 执行编排

Agent 接到任务后，不是自由发挥——是沿着预设的"轨道"跑。复杂任务拆成子任务，子任务之间有依赖关系，出错了有重试策略。

| 我的做法 | 用什么 |
|---------|--------|
| 工作流引擎 | 自研轻量引擎 — 步骤编排、依赖管理、重试策略 |
| 多 Agent 编排 | [Claude Code Workflows](/posts/2026/06/14/claude-code-workflows-guide/) — pipeline、parallel、agent() 三大原语 |
| 对抗验证 | Generator + Reviewer 角色对立，循环直到通过 |

工作流引擎和多 Agent 编排的区别：引擎负责物流——"这个步骤跑完了、下个可以开始了"；编排负责决策——"这个任务谁做、做完怎么审"。

### 3.4 状态与记忆管理

Agent 跑着跑着就忘了自己在干什么——这是上下文压缩和长任务最头疼的问题。

| 我的做法 | 用什么 |
|---------|--------|
| 任务进度追踪 | PostToolUse Hook → 持续写 `task-state.json` |
| 压缩前快照 | PreCompact Hook → 标记未解决问题 |
| 跨 session 恢复 | SessionStart Hook → 读回上次状态 |

这是 Context Engineering 里 4.3 节讲的那条三层 Hook 链路。Fable 5 提示词里的 `<memory_system>` 也是这个思路——记忆的存在和记忆的引用是两层控制，有的信息存了但特定场景下绝对不能调出来。

### 3.5 独立评估与可观测性

这层最反直觉——**Agent 不能给自己打分。** 它说"我做得很好"不算数，得有一个独立于 Agent 的验证系统来做裁判。

| 我的做法 | 用什么 |
|---------|--------|
| 对抗验证 | Workflow — 指定 Reviewer 角色挑刺，不通过打回 |
| 自动化验证 | Hook Stop — 检查 pytest/mypy 是否通过 |
| 审计日志 | PostToolUse → 记录每次 Bash 执行的命令和结果 |

### 3.6 约束、验证与恢复

Agent 的输出不等于最终产物。这层在 Agent 输出之后加了一道闸——不符合标准的输出根本出不去。

| 我的做法 | 用什么 |
|---------|--------|
| 格式锁定 | prompt 类型 Hook — 检查输出是否包含规定格式 |
| 失败回滚 | git reset + 重新生成 |
| 权限审批 | MCP auth — 高风险操作推送飞书/桌面通知确认 |
| 危险拦截 | PreToolUse — `rm -rf /`、`DROP TABLE` 等命令直接 block |

前三层让 Agent 能做，后三层让 Agent 不出错。缺了后三层，你拿到的就是一个能力超强但随时翻车的 Agent。

---

## 4. 为什么是现在

Harness Engineering 是不是又一个造出来的 buzzword？有两个数据：

**斯坦福 + 清华联合研究**：同一个基座模型，配不同的 Harness 设计，任务成功率可以差 **6 倍**。不是 6 个百分点，是六倍。

**OpenAI Codex 团队**：五个月内用 AI Agent 产出了约 100 万行生产代码。人类写了几行？零。做什么了？**只做 Harness Engineering**——定义检查规则、配 CI 流程、审查输出、修正失败模式。

模型本身不是壁垒。谁给模型搭的 Harness 好，谁的 Agent 就比别人跑得远。

最近 Claude Code 隐写后门事件也从反面印证了这一点：当你依赖的工具本身不可信时，唯一能保护你的就是你给它套的那层约束。

---

## 5. 搭一个最小 Harness

不纸上谈兵。下面是一个可运行的例子——给一个代码审查 Agent 套上 Harness。

Agent 本身很简单：每次有人提 PR，Claude Code 自动审查 diff。裸跑的版本就是上面翻车现场那个——看完自信地说没问题，实际上漏了一堆。

下面是加了 Harness 之后的 CI 流水线配置。它跑在 GitHub Actions 里，但换成 GitLab CI 或 Jenkins 也一样——核心是把 Agent 的输出套进自动化验证流程里：

```yaml
# .github/harness-code-review.yml — 最小 Harness 配置
name: Code Review Harness
on: [pull_request]

jobs:
  review:
    steps:
      # 第1步：Claude Code 审查
      - name: AI Review
        run: |
          claude -p "审查 git diff，检查类型注解、异常处理、资源管理。
            输出格式：TYPE_CHECK / EXCEPTION_CHECK / RESOURCE_CHECK，每项 PASS 或 FAIL。
            如果 FAIL，给出具体行号和修复建议。" > review-output.md

      # 第2步：Harness — 独立验证，Agent 说了不算
      - name: Type Check
        run: mypy . --strict
        continue-on-error: true

      - name: Lint
        run: ruff check .

      - name: Test
        run: pytest -x --tb=short

      # 第3步：输出审计
      - name: Audit Log
        run: |
          echo "[$(date)] PR #${{ github.event.pull_request.number }}" >> audit.log
          echo "Review output: $(wc -l < review-output.md) lines" >> audit.log

      # 第4步：失败处理 — 不许 merge
      - name: Enforce Quality Gate
        run: |
          if grep -q "FAIL" review-output.md; then
            echo "Harness: Review found issues. Merge blocked."
            exit 1
          fi
        # 这最后一道闸，Agent 绕不过去
```

这个 Harness 做了四件事，Agent 一个都挡不住：

1. **约束输出格式** — 不是让 Agent 自由回答，是强制它输出 PASS/FAIL 判定
2. **独立验证** — Agent 说没问题，但 `mypy`、`ruff`、`pytest` 的退出码才是真正的裁判
3. **审计记录** — 每次审查的命令、输出、结果都持久化
4. **质量闸** — FAIL 了直接 block merge，Agent 被迫回去修

总共不到 30 行配置。你已经有 Claude Code、pytest、mypy、ruff，差的就是这几行把散的组件串起来的逻辑。这就是 Harness。

---

## 6. 和 Context Engineering 的关系

上一篇写了 Context Engineering——管的是 token 怎么花、上下文怎么不污染。有人会问：这和 Harness 有什么区别？

一句话：**Context 管的是 Agent 看到什么，Harness 管的是 Agent 怎么做。**

| | Context Engineering | Harness Engineering |
|---|---|---|
| 问题 | Agent 看到的东西够不够、对不对 | Agent 产出的东西对不对、会不会错 |
| 手段 | 预算帽、缓存策略、`/clear`、防污染 | 工具定义、编排、独立验证、质量闸 |
| 关系 | 地基 | 上面盖的楼 |

Context 是 Harness 的第 1 号组件。没有好的上下文管理，后面的验证再多也是空中楼阁。但光有上下文没有验证，Agent 看到了所有该看的东西照样能犯错——因为它会偷懒。

---

## 7. 结语

Mitchell Hashimoto 说 Harness Engineering 是 Prompt Engineering 之后的下一个范式。Prompt 之上有 Context，Context 之上有 Harness——每一层都是为了解决底层解决不了的问题出现的。

写了这么多，最想说的是：Harness 不是大厂才配玩的东西。你用的 Claude Code Hooks、你写的 CI pipeline、你给 Agent 配的工具权限、你在 shell 里加的那一行 `exit 1`——这些拼起来，就是你自己的 Harness。差别只在有没有意识到它，有没有把它当成一个系统来设计。

下一篇讲 Harness 的第一个核心组件——怎么给 Agent 搭一个安全隔离沙箱。

*感谢阅读。*

