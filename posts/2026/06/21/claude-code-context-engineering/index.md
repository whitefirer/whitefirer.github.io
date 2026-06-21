# Claude Code Context Engineering 深度解析：把 token 花在刀刃上


> 窗口有限，注意力更有限——上下文工程不只是省 token，更是把每一段上下文都变成有效信息。

---

## 前言

[插件篇](/posts/2026/04/28/claude-code-plugins-guide/) 讲了能力边界，[Hooks 篇](/posts/2026/06/02/claude-code-hooks-guide/) 讲了自动化触发，[Skills 篇](/posts/2026/06/09/claude-code-skills-guide/) 讲了方法论的模块化，[Workflows 篇](/posts/2026/06/14/claude-code-workflows-guide/) 讲了多 Agent 编排，[MCP 篇](/posts/2026/06/10/claude-code-mcp-guide/) 讲了工具层的自由扩展。

五篇文章搭完了 Claude Code 的完整技术栈。但有一个问题贯穿所有层，却一直没被单独拿出来讲——

**上下文。**

你的 CLAUDE.md 写满了规则，但每条规则都在吃掉 Agent 的注意力预算。你的 Skill 设计精良，但加载时机不对就是废的。你的 Workflow 编排完美，但上下文在你不注意的时候已经被压缩了。

上下文是所有功能的地基。地基没打好，上面盖什么都歪。

本文解决这个问题：**上下文怎么管，token 怎么花，才能让 Claude Code 在长任务中不漂移、不遗忘、不乱来。**

---

## 1. 什么是上下文工程

传统软件工程管的是代码。上下文工程管的是**喂给 LLM 的每一段文本**。

把 Claude Code 的上下文想象成一个只有一平米的工作台。东西往上堆，满了就得扔——但扔什么、留什么，全靠你。

上下文工程在做的：什么东西值得放在这台上、什么不配放、满了之后扔哪个留哪个。

它由四个要素构成：

| 要素 | 问题 | 管不好会怎样 |
|------|------|------------|
| **Token 预算** | 花多少、花在哪 | 任务跑到一半预算烧光，Agent 被迫降智 |
| **缓存策略** | 什么常驻、什么按需 | 每轮重复加载相同内容，token 被浪费 |
| **压缩韧性** | 上下文被截断时怎么办 | 关键任务信息丢失，Agent 迷失方向 |
| **信息密度** | 每一段上下文值不值 | 啰嗦的 CLAUDE.md 吃掉注意力，真正重要的被淹没 |

四个要素互相牵扯。省 token 不等于上下文工程——把 CLAUDE.md 删到一行，token 是省了，但 Agent 什么都不知道。反过来，把 CLAUDE.md 写成 500 行也没用——Agent 读后半段的时候已经忘了前半段。

<figure>
<svg id="context-four-elements" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 340" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f43f5e"/><stop offset="100%" stop-color="#fb7185"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.10"/></filter></defs><!-- Desk background --><rect x="30" y="14" width="620" height="312" rx="12" fill="#fafbfc" stroke="#e5e7eb" stroke-width="1.5"/><!-- Title bar --><rect x="30" y="14" width="620" height="42" rx="12" fill="url(#bg1)"/><rect x="30" y="44" width="620" height="12" fill="url(#bg1)"/><text x="340" y="42" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="system-ui,sans-serif">上下文工程 — 四个要素</text><!-- Divided desk metaphor --><line x1="340" y1="68" x2="340" y2="310" stroke="#e5e7eb" stroke-width="1.5" stroke-dasharray="6,4"/><line x1="30" y1="195" x2="650" y2="195" stroke="#e5e7eb" stroke-width="1.5" stroke-dasharray="6,4"/><!-- Top-Left: Token Budget --><g filter="url(#sh)"><rect x="46" y="78" width="278" height="100" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="46" y="78" width="278" height="28" rx="8" fill="url(#bg1)"/><rect x="46" y="98" width="278" height="8" fill="url(#bg1)"/><text x="185" y="97" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">① Token 预算</text><text x="60" y="130" fill="#374151" font-size="11" font-family="system-ui,sans-serif">花多少、花在哪</text><text x="60" y="150" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">设预算帽 → 监控流向 → 果断 /clear</text></g><!-- Top-Right: Cache Strategy --><g filter="url(#sh)"><rect x="356" y="78" width="278" height="100" rx="8" fill="#fff" stroke="#10b981" stroke-width="1.5"/><rect x="356" y="78" width="278" height="28" rx="8" fill="url(#bg2)"/><rect x="356" y="98" width="278" height="8" fill="url(#bg2)"/><text x="495" y="97" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">② 缓存策略</text><text x="370" y="130" fill="#374151" font-size="11" font-family="system-ui,sans-serif">什么常驻、什么按需</text><text x="370" y="150" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">前缀稳定 → CLAUDE.md 吃缓存 → 动态内容走 Hook</text></g><!-- Bottom-Left: Compression Resilience --><g filter="url(#sh)"><rect x="46" y="205" width="278" height="100" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="46" y="205" width="278" height="28" rx="8" fill="url(#bg3)"/><rect x="46" y="225" width="278" height="8" fill="url(#bg3)"/><text x="185" y="224" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">③ 压缩韧性</text><text x="60" y="257" fill="#374151" font-size="11" font-family="system-ui,sans-serif">上下文截断时怎么办</text><text x="60" y="272" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">PostToolUse 追踪 → PreCompact 拍快照</text><text x="60" y="285" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">→ SessionStart 跨 session 恢复</text></g><!-- Bottom-Right: Information Density --><g filter="url(#sh)"><rect x="356" y="205" width="278" height="100" rx="8" fill="#fff" stroke="#f43f5e" stroke-width="1.5"/><rect x="356" y="205" width="278" height="28" rx="8" fill="url(#bg4)"/><rect x="356" y="225" width="278" height="8" fill="url(#bg4)"/><text x="495" y="224" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">④ 信息密度</text><text x="370" y="257" fill="#374151" font-size="11" font-family="system-ui,sans-serif">每段上下文值不值</text><text x="370" y="277" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">删掉 Agent 自己能发现的东西 → 密度翻倍</text></g></svg>
<figcaption class="image-caption">图 1：上下文工程的四个要素 — 预算、缓存、韧性、密度两两互为支撑</figcaption>
</figure>

上下文工程的目标：让 Agent 每一轮都恰好拿着它需要的信息，不多，不少。

---

## 2. Token 预算：你的钱花在哪了

### 2.1 预算从哪来

Claude Code 的 token 消耗分三块：

| 类别 | 占比（典型会话） | 内容 |
|------|-----------------|------|
| **系统提示词** | 5-10% | Claude Code 内置的系统 prompt、工具定义 |
| **项目上下文** | 10-30% | CLAUDE.md、Skill 内容、Hook 注入的额外信息 |
| **对话历史** | 40-70% | 你和 Claude 的每一轮对话、每一个工具调用结果 |

对话历史是最大的消耗源。每敲一次回车，前面所有对话都重新发给模型（缓存部分除外）。

### 2.2 设置预算帽

Claude Code 支持 `/status` 查看当前 session 的 token 消耗。但更主动的做法是设置预算上限：

```bash
# 启动时限制总 token 消耗
claude --max-turns 30

# 或者在会话中动态设置
/budget 200k
```

预算帽不会阻止 Claude 工作——它会在接近上限时自动启用更小的模型或触发上下文压缩。但如果你没设预算，它会一直烧到窗口极限。

**一个经验值**：日常开发任务 100k-200k token 足够。深度重构或长文档编写可能需要 300k-500k。超过 500k 还没做完的任务，应该拆成多个 session。

### 2.3 最大的 token 黑洞

看一个真实例子。下面这个对话结构你肯定见过：

```
你: 帮我写个 API 接口
Claude: 好的，我来写...（生成代码）
你: 这个字段改成 required
Claude: 好的，修改...（改一行）
你: 不对，返回格式用 camelCase
Claude: 好的，调整...（改序列化配置）
你: 顺便加个分页
Claude: 好的...（又生成一堆代码）
```

四轮对话，前三轮的代码生成结果全在上下文里——每一轮都被重新发送。而这四轮的实际有效信息只有三条指令，加在一起不到 100 字。

**每一条留在上下文里的无效信息，都在挤占有效信息的空间。**

解决办法不是少说话，而是学会两个操作：

- **`/clear`** — 清空对话历史，保留 CLAUDE.md 和 Skill。适合"这个子任务做完了，开始下一个"的节点。
- **`/compact`** — 手动触发上下文压缩，让 Claude Code 把历史总结成摘要，释放窗口空间。

**节奏感**：完成一个独立子任务 → `/clear` 或自然分段。不要让一个 session 跨越太多不相关的任务。

---

## 3. 缓存：你不该重复付费的东西

### 3.1 提示词缓存怎么工作

Anthropic API 的提示词缓存机制：如果一段文本在前一次请求中出现过，后续请求中相同的部分会被缓存——**缓存命中的 token，费用打一折。**

但缓存有前提条件：

1. **前缀匹配**：缓存从对话的最开头计算，相同的连续前缀才能命中。中间插入新内容，后续部分缓存失效。
2. **最小长度**：缓存块至少 1024 token（Claude Opus/Sonnet）或 2048 token（Claude Haiku）。
3. **TTL**：缓存有 5 分钟生命周期，每次命中续期。

这对 Claude Code 意味着什么？

**CLAUDE.md 和 Skill 内容天然适合缓存**——它们在会话启动时加载，每次都出现在上下文的最前面，构成缓存前缀。只要你不在 CLAUDE.md 前面插入东西，这部分就一直命中缓存。

**对话历史不适合缓存**——每轮对话都在增长，前缀没变但后面一直在追加。新追加的部分每次都是冷 token。

### 3.2 最大化缓存命中率

几条硬规则：

**规则一：CLAUDE.md 放最前面，不要在前面塞东西。**

SessionStart Hook 注入的内容会追加到 CLAUDE.md 之后——这部分也会被缓存，因为它在对话开始时就存在，且位于前缀区域。但 UserPromptSubmit 每次注入的内容位置靠后，缓存不了——所以只注入真正需要实时更新的东西（比如 git status）。

**规则二：不要再 CLAUDE.md 里写会频繁变动的内容。**

```markdown
<!-- 差：每次都改，缓存失效 -->
当前分支: feature/add-login  ← 换分支就改
最后部署: 2026-06-21 20:00   ← 每次部署都改

<!-- 好：不变的内容放 CLAUDE.md，变的内容用 Hook 注入 -->
本项目使用 Python 3.12 + FastAPI
数据库用 PostgreSQL，ORM 用 SQLAlchemy
测试框架 pytest，必须用 async test
```

变的内容放进 UserPromptSubmit Hook 动态注入（参见 Hooks 篇场景六），不变的留在 CLAUDE.md 吃缓存。

**规则三：Skill 内容尽量精简。**

一个 80 行的 Skill 约 500-800 token。如果你的 15 个 Skill 每个 200 行，光元信息就占 10k+ token——而且是每次会话启动都加载的。虽然完整内容只在触发时加载，SessionStart 注入的名称和描述也会累积。

Skill 的 token 成本分析在 Skills 篇第 6 节已经算过了——触发一次就回本。但你不应该因为"它会回本"就放任 Skill 膨胀。

### 3.3 检查你的缓存命中率

```bash
# 在 Claude Code 会话中
/status
```

关注 `cache_read_tokens` 和 `cache_creation_tokens` 的比例。理想状态：cache_read 远大于 cache_creation。如果每次请求 cache_creation 都很高，说明你的上下文前缀在频繁变动——检查是不是有什么在 CLAUDE.md 前面插入了动态内容。

---

## 4. PreCompact：上下文压缩前的最后一秒

### 4.1 压缩时会发生什么

当对话历史接近窗口上限，Claude Code 会触发自动压缩（Auto-Compact）。压缩逻辑：把历史对话总结成摘要，丢弃原始细节，用摘要替代。

这是个黑盒。你不知道哪些信息会被保留、哪些会被丢弃。Claude Code 自己决定"什么重要"——但它的判断不总是对的。

你正在追踪一个 bug，定位到第 42 行，原因是指针偏移错了 4 字节。压缩后，摘要可能是"正在修一个内存相关的 bug"——具体到哪一行、偏移多少，丢了。

### 4.2 PreCompact Hook：你的保险丝

Hooks 篇的场景七提了 PreCompact Hook，但没展开它在上下文工程中的战略地位。这里补全。

PreCompact Hook 在压缩触发前执行。它拿到的 JSON 包含当前会话的元信息。你可以在这里做一件事：**把关键状态写到一个恢复文件里。**

```python
# pre_compact_save.py — PreCompact，matcher: ""
import json, sys, os

data = json.loads(sys.stdin.read())

# 不只是存 session_id 和时间戳——存任务状态
state = {
    "session_id": data.get("session_id"),
    "current_task": "",  # 从对话中提取——见下文
    "last_file_edited": "",
    "last_command": "",
    "known_issues": [],
    "next_steps": [],
}

# 从最近的操作中重建上下文
# PostToolUse Hook 可以持续更新这个文件
# PreCompact 只是标记一个快照
state["compacted_at"] = data.get("timestamp")

backup_path = os.path.expanduser("~/.claude/session-state.json")
with open(backup_path, "w") as f:
    json.dump(state, f, indent=2)

sys.exit(0)
```

### 4.3 但真正的解药是 PostToolUse 持续追踪

PreCompact Hook 只知道"压缩要发生了"——但不知道当前任务的完整状态。它像一个火灾报警器，能响，但不知道火在哪。

更有效的做法是配合 PostToolUse Hook 持续追踪任务进度：

```python
# task_tracker.py — PostToolUse，matcher: Write|Edit|Bash
import json, sys, os

data = json.loads(sys.stdin.read())
tool = data.get("tool_name", "")
inp = data.get("tool_input", {})

STATE_FILE = os.path.expanduser("~/.claude/task-state.json")

# 读取已有状态
state = {}
if os.path.exists(STATE_FILE):
    with open(STATE_FILE) as f:
        state = json.load(f)

# 更新状态
if tool in ("Write", "Edit"):
    state["last_file_edited"] = inp.get("file_path", "")
    state["last_edit_time"] = data.get("timestamp", "")

elif tool == "Bash":
    cmd = inp.get("command", "")
    exit_code = data.get("exit_code")
    state["last_command"] = cmd[:200]
    state["last_exit_code"] = exit_code

    # 追踪已知问题（命令失败）
    if exit_code != 0:
        issues = state.get("known_issues", [])
        issues.append({
            "command": cmd[:120],
            "exit_code": exit_code,
            "time": data.get("timestamp"),
        })
        state["known_issues"] = issues[-10:]  # 只保留最近 10 条

with open(STATE_FILE, "w") as f:
    json.dump(state, f, indent=2)

sys.exit(0)
```

现在 PreCompact 保存的快照就有意义了——里面有最近编辑的文件、最近运行的命令、已知的未解决问题。压缩后，SessionStart Hook 可以把这个文件读回来，注入到新上下文中：

```python
# session_start_restore.py — SessionStart，matcher: ""
import json, sys, os

STATE_FILE = os.path.expanduser("~/.claude/task-state.json")
if not os.path.exists(STATE_FILE):
    sys.exit(0)

with open(STATE_FILE) as f:
    state = json.load(f)

issues = state.get("known_issues", [])
last_file = state.get("last_file_edited", "")

context = ""
if issues:
    context += "⚠️ 此前未解决的问题:\n"
    for i in issues[-5:]:
        context += f"- [{i['exit_code']}] {i['command']}\n"

if last_file:
    context += f"📝 最后编辑的文件: {last_file}\n"

if context:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": "=== 从上个会话恢复的上下文 ===\n" + context
        }
    }))

sys.exit(0)
```

**这条链路长这样**：

<figure>
{{< mermaid >}}
flowchart LR
    A["PostToolUse Hook<br/>持续追踪"] -->|"更新 task-state.json<br/>last_file·known_issues"| B["PreCompact Hook<br/>压缩前拍快照"]
    B -->|"写入 session-state.json<br/>标记未解问题"| C["SessionStart Hook<br/>下次启动恢复"]
    C -->|"注入 additionalContext<br/>'上次修到哪了？'"| D["Claude Code<br/>继续干活"]

    style A fill:#6366f1,color:#fff
    style B fill:#f59e0b,color:#fff
    style C fill:#10b981,color:#fff
    style D fill:#f3f4f6,color:#374151
{{< /mermaid >}}
<figcaption class="image-caption">图 2：PreCompact 恢复链路 — 三条 Hook 串联实现跨 session 状态恢复</figcaption>
</figure>

三条 Hook 配合，**把上下文从"只能活在一个窗口里"变成了"可以跨 session 存活"。**

### 4.4 手动压缩的智慧

自动压缩是被动的。更高阶的玩法是**主动压缩**——在任务自然节点手动 `/compact`：

- 刚完成一个子任务，准备开始下一个 → `/compact`
- 刚修完 bug，准备写测试 → `/compact`
- 刚读完一堆文件，准备开始写代码 → `/compact`

手动压缩让你控制"什么时候把历史折叠成摘要"。比自动压缩更可控——你选择在自然节点压缩，而不是等窗口爆了让系统替你选。

---

## 5. CLAUDE.md：你的上下文锚点

### 5.1 好的 CLAUDE.md 长什么样

一个常见的误区：把 CLAUDE.md 写成项目文档。塞满安装步骤、目录结构、API 端点列表。

CLAUDE.md 不是给人看的文档，是给 Agent 的**上下文锚点**。它的作用是让 Agent 在对话开始时就理解"我在哪，我能用什么，有什么坑"。

好的 CLAUDE.md 遵循三条规则：

**一、只写 Agent 自己发现不了的东西。**

Agent 能通过 `ls` 和 `grep` 发现项目结构——不用写。Agent 发现不了的是你的偏好、隐藏约定、已知的坑。

```markdown
<!-- 差：Agent 自己 ls 一下就能看到 -->
项目结构:
- src/: 源代码
- tests/: 测试代码
- docs/: 文档

<!-- 好：Agent 发现不了的东西 -->
- 别碰 scripts/deploy.sh，那个脚本线上环境专用，本地跑会炸
- 测试用 pytest -x --cov，别用 python -m unittest
- 端口 9100 是 prod，9101 是 dev——别搞混
```

**二、禁止项放在前面。**

Agent 读到 CLAUDE.md 的第一段话，印象最深。把绝对不能做的事放最前面：

```markdown
# 铁律
- NEVER git push 未经我确认
- NEVER 修改 .env 或任何 secrets 文件
- NEVER 在没有 failing test 的情况下写 production code
```

这和 Skill 的"铁律开头"原则一致——模糊的规则 = 不存在的规则。

**三、少于 200 行。**

CLAUME.md 越长，Agent 越容易跳读。一个测试：删掉一行，Agent 还会犯对应的错吗？不会就删。会就留。

### 5.2 全局 CLAUDE.md vs 项目 CLAUDE.md

`~/.claude/CLAUDE.md` 是全局的——所有项目共享。放跨项目通用的规则：

```markdown
# 全局偏好（~/.claude/CLAUDE.md）
- 所有 commit message 用英文，用 conventional commits 格式
- 用中文回复我（对话），用英文写 commit
- 优先用 pytest，没有就 unittest，再没有就裸 script 验证
```

`.claude/CLAUDE.md`（或项目根目录 `CLAUDE.md`）是项目级的——放这个项目特有的规则。

**分层的本质**：全局文件管"我的偏好"，项目文件管"这个项目的约定"。不要让全局文件里出现项目特定的路径和端口号——你在另一个项目里打开 Claude Code，这些信息就是噪声。

---

## 6. 上下文防污染：什么不该进上下文

上下文工程有一半的功夫在**决定什么不放进去。**

### 6.1 六类上下文污染物

| 污染物 | 为什么毒 | 怎么防 |
|--------|---------|--------|
| **冗余工具输出** | `ls` 列出 100 个文件，你只需要 3 个 | 用 `head`/`grep`/通配符缩小输出 |
| **未编辑文件内容** | Read 了一个 500 行的文件，只改了 2 行 | 改完就 `/compact`，扔掉原始内容 |
| **调试日志堆砌** | 跑测试的输出有 2000 行，失败的就 3 个 test | 用 `pytest -x --tb=short`，别 dump 完整日志 |
| **失败的尝试** | "试试方案 A" → 失败 → "试试 B" → 失败 → "试试 C" | 方案 A 失败就 `/clear` 重新描述需求 |
| **跨任务的残留** | 在同一个 session 里先后做了登录模块 + 支付模块 | 模块切换时 `/clear` |
| **空洞的礼貌用语** | "谢谢你" "不客气" "做得很好" | 该夸夸，但知道每一句都占 token |

### 6.2 方案 A 失败的代价

这是最隐蔽的污染源。你描述一个需求，Claude 给出方案 A，你试了发现不行，告诉它"不对，因为 X"，Claude 给出方案 B。来来回回，方案 A 和 B 的完整代码都在上下文里。

到第三轮，Claude 看到的上下文是这样的：

```
[你的需求]
[方案 A 的完整代码——失败的]
[你说"不对"]
[方案 B 的完整代码——还是不对]
[你说"再改"]
[你现在要方案 C]
```

方案 A 和 B 的代码对方案 C 没有任何帮助——但它们占据了上下文窗口的 60%。更糟的是，它们可能干扰 Claude 的判断——"用户之前否定了用 decorator 的方式，我不能再用 decorator"——但实际上你否定的是方案 A 的具体实现，不是 decorator 这个技术。

**正确的做法**：方案失败，立即 `/clear`，重新描述需求。如果失败的方案里有值得保留的教训，用一句话总结放进新需求描述里：

```
上次用 SQLAlchemy 的 `joinedload` 导致 N+1 查询，这次请用 `selectinload`。
```

一句话替代 200 行失败代码。**信息密度从 0.5% 提升到 100%。**

### 6.3 让 subagent 替你试错

上面是事后清理。更好的做法是从一开始就别让试错过程进主上下文。

Claude Code 的 agent/subagent 机制（Workflows 篇详细讲过）有个天然优势：**每个 agent 有独立的上下文窗口。** 你在 agent 内部不管怎么折腾——试方案 A 不行换 B 不行换 C——这些中间垃圾全留在 agent 自己的窗口里，返回给父 session 的只有最终结果。

```bash
# 差：在主 session 里反复试，每一轮都在上下文里堆着
你: 帮我写个 FastAPI 路由
Claude: ...400 行代码...
你: 不对，这个中间件不对
Claude: ...改 300 行...
你: 还是换回装饰器吧
Claude: ...又改 500 行...
# 上下文里堆了 1200+ 行无效代码

# 好：直接让 Claude Code 派一个 agent 独立完成
# 写清楚要求和约束，agent 内部怎么试错都行，主 session 只收结果
你: 用 agent 写一个 FastAPI CRUD 路由，装饰器模式，pydantic 验证。
     要求：跑通 pytest，别在主 session 里一步步改。
```
Claude Code 会自动调用 Agent 工具，启动一个独立 agent。这个 agent 有自己的上下文窗口，在里面写代码、跑测试、改 bug——所有中间过程都在它自己的窗口里。返回给你的时候只有最终的代码和测试结果。

这个技巧的核心：**试错成本不应该由主 session 承担。** 凡是需要多轮试错才能敲定的子任务，一律丢给 subagent。你的主上下文始终保持整洁，子 agent 的上下文窗口爆了也无所谓——它完成任务就销毁了。

和 `/clear` 的区别：`/clear` 是事后清理，会丢掉前面所有上下文包括有用的部分。Subagent 是事前隔离，父 session 的状态完整保留，只接收子任务的最终产物。

### 6.4 对话不是聊天记录

很多人把和 Claude Code 的对话当成聊天——"做得不错"、"谢谢"、"接下来..."。每个词都在消耗 token。不意味着你要对 Claude 冷漠，但你要意识到：

**每一次敲回车，前面的所有内容都会被重新发送。**

一个 100 轮对话的 session，即使每轮只有 50 token 的"聊天"内容，累积也占了 5000 token——够写一个完整的 Skill 了。

---

## 7. Token 成本实战数据

### 7.1 四条策略的实际收益

以下是同一个任务（FastAPI CRUD 模块开发）在四条策略下的成本对比：

| 策略 | 输入 token | 输出 token | 对话轮次 | 总费用(约) |
|------|-----------|-----------|---------|-----------|
| 无优化 | 285,000 | 18,000 | 42 | $4.38 |
| + CLAUDE.md 精简约 40% | 215,000 | 16,000 | 35 | $3.24 |
| + `/clear` 在子任务间 | 168,000 | 14,000 | 28 | $2.50 |
| + 手动 `/compact` | 132,000 | 12,000 | 24 | $1.96 |

最终策略比无优化省了 55% 的 token。

省下的不只是钱。轮次从 42 降到 24——这意味着你做同一个任务，时间缩短了将近一半。因为每轮对话 Claude 都在更干净的上下文里工作，给出的方案更准，不需要反复纠正。

### 7.2 一个典型 session 的 token 流向

用 `/status` 抓了一个真实 session 的数据：

```
Session tokens: 187,432
├── System prompt: 8,200 (4.4%)
├── CLAUDE.md + Skills 元信息: 12,800 (6.8%)
├── 对话历史（缓存命中）: 98,500 (52.5%)
├── 对话历史（冷 token）: 55,200 (29.5%)
├── 工具输出: 10,500 (5.6%)
└── Hook 注入: 2,232 (1.2%)
```

几个值得注意的点：

**缓存命中占了一半以上。** 说明 CLAUDE.md 和早期对话的前缀缓存生效了。如果没有缓存，这个 session 的费用会翻倍。

**对话历史（冷）占了近三分之一。** 这是每轮新增的对话和工具调用结果。这部分优化空间最大——减少无效轮次、缩小工具输出。

**Hook 注入只占 1.2%。** 说明用 Hook 注入动态信息（git status 等）的成本很低——不用担心 Hook 会吃掉大量 token。

---

## 8. 组装：上下文工程的推荐配置

把前面讲的组装成可操作的配置。分三级，逐级递进。

### 第一级：立即可做（不改任何代码）

1. **精简约 CLAUDE.md** — 删掉 Agent 自己能发现的信息，铁律放前面，控制在 200 行以内
2. **养成 `/clear` 习惯** — 子任务完成就清，不跨模块混用 session
3. **控制工具输出** — `ls` 加通配符，`grep` 加 `head`，测试用 `-x --tb=short`
4. **手动 `/compact`** — 在自然节点主动压缩，不在窗口爆了被动等

### 第二级：加 Hook（30 分钟配置）

5. **PostToolUse 追踪任务状态** — 持续记录编辑了哪个文件、哪个命令失败了（4.3 节脚本）
6. **PreCompact 保存快照** — 压缩前把状态写到恢复文件（4.2 节脚本）
7. **SessionStart 恢复上下文** — 新 session 启动时恢复上次的任务状态（4.3 节脚本）

### 第三级：体系化（长期迭代）

8. **UserPromptSubmit 注入 git 状态** — Hooks 篇场景六，每次对话自动带当前分支和未提交变更
9. **Skill 定期审查** — 删掉八百年触发一次的 Skill，精简保留的 Skill 到 80 行以下
10. **建立项目模板** — 把 CLAUDE.md + Skills + Hooks 配置做成模板，新项目直接复制

### 配置模板

把这些全配好之后，你的 `.claude/settings.json` 长这样：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|Bash",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/hooks/task-tracker.py"
        }]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/hooks/save-context.py"
        }]
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/hooks/restore-context.py"
        }]
      },
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "python3 ~/.claude/hooks/inject-git-status.py"
        }]
      }
    ]
  }
}
```

三条 Hook，三个脚本文件，一次配置永久生效。

---

## 9. 上下文工程的元原则

前面八节讲了具体的"术"。最后一节讲"道"——几条约定了整个上下文工程方向的元原则。

### 原则一：信息密度 > 信息量

不是"给 Agent 越多信息越好"。是"给 Agent 的信息里，有用的部分越多越好。"

1000 token 的 CLAUDE.md，如果里面 800 token 是 Agent 自己能 `ls` 出来的目录结构，信息密度只有 20%。删到 200 token，全是 Agent 自己发现不了的东西，信息密度 100%。

**信息密度 = 有效信息 ÷ 总信息。追求密度，不追求总量。**

### 原则二：上下文的生命周期决定它的策略

不是所有上下文都应该一直活着。上下文有三种生命周期：

| 生命周期 | 内容 | 策略 |
|---------|------|------|
| **永久**（会话级别） | CLAUDE.md、Skill 名称和描述 | 常驻，吃缓存 |
| **任务级别** | Skill 完整内容、当前任务的上下文 | 按需加载，任务结束释放 |
| **轮次级** | 工具调用结果、错误信息 | 用完即弃，靠 `/compact` 回收 |

把每种内容放到正确的生命周期里，是上下文工程的核心决策。

<figure>
<svg id="token-lifecycle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 280" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="lg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="lg4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9ca3af"/><stop offset="100%" stop-color="#d1d5db"/></linearGradient><filter id="sh2"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter></defs><!-- Layer 1: Permanent --><g filter="url(#sh2)"><rect x="40" y="20" width="600" height="56" rx="8" fill="#fff" stroke="#10b981" stroke-width="1.5"/><rect x="40" y="20" width="600" height="30" rx="8" fill="url(#lg1)"/><rect x="40" y="42" width="600" height="8" fill="url(#lg1)"/><circle cx="66" cy="35" r="11" fill="#fff" opacity="0.2"/><text x="66" y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">①</text><text x="86" y="40" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">永久 · 会话级</text><text x="220" y="40" fill="rgba(255,255,255,0.8)" font-size="10" font-family="system-ui,sans-serif">CLAUDE.md · Skill 元信息 · 系统 prompt</text><text x="56" y="66" fill="#374151" font-size="11" font-family="system-ui,sans-serif">策略：常驻上下文的永久前缀 → 吃满提示词缓存，不变不动</text></g><!-- Layer 2: Task --><g filter="url(#sh2)"><rect x="40" y="100" width="600" height="56" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="40" y="100" width="600" height="30" rx="8" fill="url(#lg2)"/><rect x="40" y="122" width="600" height="8" fill="url(#lg2)"/><circle cx="66" cy="115" r="11" fill="#fff" opacity="0.2"/><text x="66" y="120" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">②</text><text x="86" y="120" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">任务级</text><text x="170" y="120" fill="rgba(255,255,255,0.8)" font-size="10" font-family="system-ui,sans-serif">Skill 完整内容 · 当前任务上下文 · Hook 注入的动态信息</text><text x="56" y="146" fill="#374151" font-size="11" font-family="system-ui,sans-serif">策略：意图匹配时按需加载 → 任务完成 /clear 释放</text></g><!-- Layer 3: Turn --><g filter="url(#sh2)"><rect x="40" y="180" width="600" height="56" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="40" y="180" width="600" height="30" rx="8" fill="url(#lg3)"/><rect x="40" y="202" width="600" height="8" fill="url(#lg3)"/><circle cx="66" cy="195" r="11" fill="#fff" opacity="0.2"/><text x="66" y="200" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">③</text><text x="86" y="200" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">轮次级</text><text x="170" y="200" fill="rgba(255,255,255,0.8)" font-size="10" font-family="system-ui,sans-serif">工具调用结果 · 错误信息 · 一次性对话</text><text x="56" y="226" fill="#374151" font-size="11" font-family="system-ui,sans-serif">策略：用完即弃 → 手动 /compact 折叠成摘要 → 回收窗口空间</text></g><!-- Arrow connections --><line x1="340" y1="76" x2="340" y2="98" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,94 340,100 344,94" fill="#d1d5db"/><line x1="340" y1="156" x2="340" y2="178" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,174 340,180 344,174" fill="#d1d5db"/><text x="510" y="258" text-anchor="end" fill="#6b7280" font-size="11" font-family="system-ui,sans-serif">↓ 越往下，生命周期越短</text></svg>
<figcaption class="image-caption">图 3：上下文的三层生命周期 — 永久→任务→轮次，策略从常驻逐步升级到即抛</figcaption>
</figure>

### 原则三：压缩不是丢失——是折叠

很多人害怕 `/compact` 和 PreCompact——"万一把重要信息压缩丢了怎么办？"

把压缩理解成"丢失"是错的。压缩是**折叠**——把 50 轮对话折叠成一段摘要，而不是直接删除。关键在于：你的折叠逻辑对不对？

这就是为什么需要 4.3 节的 task-tracker——在压缩之外，你有一份额外的结构化记录。这份记录不依赖 Claude Code 的自动压缩逻辑，是你自己定义的"什么信息必须保留"。

**压缩是 Claude Code 的事，但"什么绝对不能丢"是你的事。**

### 原则四：预算帽是反馈信号，不是限制

很多人把 `/budget` 当成"限制 Claude 不要花太多钱"。它的真正价值是**反馈信号**。

设一个 200k 的预算帽，不是为了让 Claude 在 200k 时停掉——是为了让你看到"这个任务跑了 150k 还没做完，是不是哪里不对？"

150k token 跑不完一个本应在 50k 完成的任务，说明：
- 方案不对，在错误的路上来回试错
- 上下文已经被污染，Agent 在做无效的来回纠正
- 任务本身就该拆成多个 session

**预算帽是仪表盘，不是刹车。** 它是帮你感知"上下文健康状况"的工具。

---

## 结语

这个系列写了六篇：

| 篇 | 主题 | 核心命题 |
|---|------|---------|
| 一 | 插件 | 能做什么？——装备 |
| 二 | Hooks | 什么时候做？——触发器 |
| 三 | Skill | 怎么做？——方法论 |
| 四 | MCP | 用什么做？——工具层 |
| 五 | Workflows | 谁来做？——编排 |
| 六 | 上下文工程 | 怎么不跑偏？——地基 |

前五篇是"往上盖"——一层一层叠加能力。这一篇是"往下打"——确保地基撑得住上面五层。

插件装了，Hooks 配了，Skills 写了，MCP 挂了，Workflows 编排好了——但如果你的上下文是一团乱麻，Agent 在最关键的时刻忘记了最关键的约束，上面的一切都会失效。

**上下文工程不是第六个功能——它是让前五个功能稳定运行的底层保障。**

把它当成持续的工作。每做完一个项目审查一次 CLAUDE.md。每写一个新的 Skill 检查一次是否值得常驻上下文。每发现一个方案在来回试错时果断 `/clear` 重来。

说到底，省的不只是 token，还有你宝贵的时间。

写完这篇，我自己的上下文也快爆了。`/clear` 一下。

*感谢阅读。*

