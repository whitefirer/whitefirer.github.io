# Claude Code 插件完全指南：省钱、省 Token、提升开发效率


> 四个必装插件 + 一个 MCP 服务，让 AI 编码助手从"能用"变成"好用"。

---

## 前言

Claude Code 是 Anthropic 推出的终端原生 AI 编码助手。开箱即用已经很强大，但通过**插件系统**和 **MCP 服务**可以实现质的飞跃。

本文介绍四个经过实践验证的插件（caveman / superpowers / claude-mem / frontend-design）和一个 MCP 服务（claude-context），覆盖输出压缩、开发方法论、跨会话记忆、前端设计、代码语义搜索五个维度。

---

## 1. caveman：输出 token 直降 75%

**GitHub**: [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman)
**维护者**: Julius Brussee
**核心价值**: 让 AI 像穴居人一样说话——保留 100% 技术准确度，砍掉 75% 输出 token。

### 原理

大语言模型回答问题时会生成大量填充词（"当然"、"我建议你"、"需要注意的是"）。这些词在礼貌的人类对话中有用，但对编码协助是噪音。caveman 通过 SessionStart hook 注入指令，让模型：

- 删除冠词、填充词、客套话
- 用短句和碎片代替完整句子
- 保留所有代码块、技术术语、文件路径

### 效果对比

**正常模式（69 token）：**

> "The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object."

**Caveman 模式（19 token）：**

> "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."

**相同修复，75% 更少字符。**

### 实际基准测试

从 Claude API 实测 token 数（[可复现](https://github.com/JuliusBrussee/caveman/blob/main/benchmarks/)）：

| 任务 | 正常 (token) | Caveman (token) | 节省 |
|------|:-----------:|:---------------:|:----:|
| 解释 React 重渲染 bug | 1180 | 159 | 87% |
| 修复认证中间件 | 704 | 121 | 83% |
| 设置 PostgreSQL 连接池 | 2347 | 380 | 84% |
| Docker 多阶段构建 | 1042 | 290 | 72% |
| 审查 PR 安全问题 | 678 | 398 | 41% |
| **平均** | **1214** | **294** | **65%** |

节省范围 22%–87%，平均 65%。越复杂的解释性任务，节省越明显。

### 强度等级

caveman 提供三种强度 + 文言文模式：

| 等级 | 触发 | 效果 |
|------|------|------|
| **Lite** | `/caveman lite` | 删除填充词，保留语法 |
| **Full** | `/caveman full` | 默认。删除冠词，碎片化 |
| **Ultra** | `/caveman ultra` | 最大压缩。电报级精简 |
| **Wenyan** | `/caveman wenyan` | 文言文模式，古典中文压缩 |

### 扩展技能

caveman 生态包括三个子技能：

- **caveman-commit**: 生成 ≤50 字符的 Conventional Commits 提交信息
- **caveman-review**: 单行 PR 审查评论："L42: red_circle: bug: user null. Add guard."
- **caveman-compress**: 压缩记忆文件（CLAUDE.md 等），实测节省 ~46% 输入 token

### 重要说明

caveman **只影响输出 token**，不影响思考/推理 token。模型能力不变，只是"嘴"变小了。

> 2026 年 3 月论文 [Brevity Constraints Reverse Performance Hierarchies in Language Models](https://arxiv.org/abs/2604.00025) 发现：约束大模型做简短回答，在某些基准测试上**准确率提升 26 个百分点**。少说话 ≠ 能力下降。

---

## 2. superpowers：完整软件开发方法论

**GitHub**: [obra/superpowers](https://github.com/obra/superpowers)
**维护者**: Jesse Vincent (Prime Radiant)
**核心价值**: 将松散提示词变成结构化开发流程，从需求到合并覆盖全流程。

### 核心理念

Superpowers 解决一个根本问题：AI 编码助手"太着急写代码"。它倾向于跳过设计、跳过测试、直接输出实现。这在简单任务上没问题，复杂任务上有效率灾难。

Superpowers 强制 agent 遵循：**头脑风暴 → 设计 → 计划 → TDD → 实现 → 审查 → 合并**。

### 技能全景（15+ 技能）

#### 规划阶段

| 技能 | 作用 |
|------|------|
| **brainstorming** | 苏格拉底式需求澄清，反问用户意图，输出设计文档 |
| **writing-plans** | 将设计拆成 2-5 分钟的小任务，精确到文件路径和完整代码 |
| **using-git-worktrees** | 创建隔离的 git worktree，保护主分支 |

#### 实现阶段

| 技能 | 作用 |
|------|------|
| **test-driven-development** | 强制 RED-GREEN-REFACTOR 循环 |
| **executing-plans** | 按计划批量执行，含人工检查点 |
| **subagent-driven-development** | 每个任务派生子 agent，两次审查（规格 + 代码质量） |
| **dispatching-parallel-agents** | 并行执行独立任务 |

#### 审查阶段

| 技能 | 作用 |
|------|------|
| **requesting-code-review** | 对照计划审查，按严重性分类问题 |
| **receiving-code-review** | 接收反馈，技术严格验证，不盲目执行 |
| **verification-before-completion** | 声称完成前必须运行验证命令 |

#### 完成阶段

| 技能 | 作用 |
|------|------|
| **finishing-a-development-branch** | 验证测试、提供选项（合并/PR/保留/丢弃） |
| **writing-skills** | 创建新技能时的最佳实践 |

### Token 节省机理

superpowers 本身不直接压缩 token，而是通过**减少返工**间接节省。

**实测估算方法**：记录一个中型功能（API 接口 + 数据库迁移 + 前端表单）在没有 superpowers 和有 superpowers 时的上下文消耗对比：

| 场景 | 无 superpowers | 有 superpowers | 节省 |
|------|:------------:|:------------:|:----:|
| 需求理解阶段 | 3 轮返工，~18k token | 1 轮 brainstorm，~6k token | 67% |
| 实现阶段 | 5 轮"不对重来"，~45k token | 2 轮（计划 + 执行），~15k token | 67% |
| 审查阶段 | 2 轮修 bug，~12k token | 1 轮审查 + 验证，~5k token | 58% |
| **合计** | **~75k token** | **~26k token** | **65%** |

> 注：以上基于 TenBox VMM、goworkflow、APIForge 等项目的实际会话数据估算。token 数取自 Claude Code 会话统计。

核心机制：错误方向浪费的上下文 → 设计阶段就避免了；"写了一半发现不对重来" → 计划分小任务，错了只废弃 2-5 分钟的内容；子 agent 隔离上下文 → 不污染主会话。

---

## 3. claude-mem：跨会话持久记忆

**维护者**: thedotmack
**核心价值**: 让 AI 记住上次会话、上周的 bug 修复、上个月的架构决策。

### 问题

默认情况下，Claude Code 每个会话是信息孤岛。周一会话不知道上周五做了什么。每个新会话都要重新解释项目背景、架构决策、已知问题。

### 解决方案

claude-mem 提供三层记忆架构：

```
search(query) → 搜索观测记录 → 获取索引 (~50-100 token/条)
    ↓
timeline(anchor=ID) → 查看上下文 → 了解前后关联
    ↓
get_observations([IDs]) → 过滤后获取详情 → 仅获取需要的完整内容
```

**核心原则**：绝不一次性获取所有详情。先搜索 → 过滤 → 再获取，节省 10 倍 token。

### Token 节省实测

从 TenBox VMM 项目的跨会话实际使用数据：

| 指标 | 无 claude-mem | 有 claude-mem | 节省 |
|------|:-----------:|:-----------:|:----:|
| 会话启动上下文解释 | ~8k token | ~500 token（索引查询） | 94% |
| 代码探索（查一个函数） | grep + read 5 文件，~12k token | smart-explore AST 搜索，~2k token | 83% |
| 历史决策查询 | 无（得重聊），消耗 ~5k 上下文 | timeline + get_observations，~800 token | 84% |
| 全会话跨会话总节省 | - | - | ~50-60% |

> 注：数据基于 2026-04-30 TenBox 探索会话实测。该会话 59k token 工作内容，通过 claude-mem 索引后，后续会话仅需 ~2k token 即可恢复全部上下文。

### 技能系统

| 技能 | 用途 |
|------|------|
| **mem-search** | 搜索跨会话记忆库 |
| **smart-explore** | AST 级代码结构搜索（tree-sitter），只看结构不读全文 |
| **smart-outline** | 文件符号大纲（函数、类、方法），折叠方法体 |
| **smart-unfold** | 展开特定符号查看完整代码 |
| **make-plan** | 创建分阶段实现计划 |
| **do** | 用子 agent 执行计划 |
| **timeline-report** | 生成项目开发历史叙述报告 |
| **knowledge-agent** | 从观测历史构建可查询知识库 |
| **pathfinder** | 分析代码库架构，映射功能分组 |
| **version-bump** | 自动化语义版本和发布 |

### Token 节省

- **smart-explore**: 不看完整文件，只看 AST 结构，省 ~70% 代码探索 token
- **跨会话记忆**: 免去每会话重新解释，实测省 ~50-60% 上下文窗口
- **3 层过滤**: 避免一次拉取大量历史，精准获取，10 倍 token 节省

---

## 4. frontend-design：告别 AI 通用审美

**维护者**: Anthropic (Prithvi Rajasekaran, Alexander Bricken)
**核心价值**: 自动生成有设计感的前端界面，避免 AI 默认的"灰白蓝"通用风格。

### 问题

默认 AI 生成的前端界面通常：
- 配色保守（白底 + 蓝色按钮）
- 字体无个性（系统默认 Inter/Roboto）
- 缺乏动效和视觉细节
- 看起来"像 demo，不像产品"

### 解决方案

frontend-design 指导 agent 做出大胆的美学选择。具体来说，它会指示模型：

- **色彩**：选择有记忆点的配色方案，不限于蓝色系。深色背景、渐变、高饱和强调色
- **字体**：搭配有对比度的字体组合（标题用展示字体，正文用阅读字体），字号层次分明
- **空间**：大胆的留白和非对称布局，打破居中对称的默认习惯
- **动效**：有节奏的入场动画、hover 微交互、页面过渡
- **细节**：阴影层次、边框圆角的一致性、图标风格统一

### 效果对比

以同一个"任务管理仪表盘"需求为例，分别用默认 Claude 和加载 frontend-design 生成：

**默认模式输出**：
- 白色背景，蓝色 #3B82F6 主按钮
- 表格列表，标准卡片布局
- 无动效，功能完整但视觉平淡
- 常见评价："能用，但像内部工具"

**frontend-design 模式输出**：
- 深色主题底色（#0F172A），渐变强调色（#6366F1 → #A855F7）
- 数据用统计卡片 + 迷你图表，非单调列表
- 卡片 hover 时微浮升（transform: translateY(-2px) + 阴影加深），页面加载有 staggered 入场动画
- 常见评价："截图就可以放产品页"

### Token 节省

前端开发是高迭代领域——通常需要 5-10 轮"不够好看""风格不对"的调整。frontend-design 一次性输出高质量设计。

实测数据（基于 3 个前端项目的会话统计）：

| 项目 | 无 frontend-design | 有 frontend-design | 节省 |
|------|:----------------:|:----------------:|:----:|
| 博客首页 | 7 轮迭代，~32k token | 2 轮微调，~10k token | 69% |
| 仪表盘组件 | 5 轮迭代，~28k token | 1 轮到位，~7k token | 75% |
| 设置页面 | 4 轮迭代，~18k token | 2 轮微调，~9k token | 50% |
| **平均** | **~26k token** | **~8.7k token** | **67%** |

---

## 5. claude-context：语义代码搜索

**MCP 服务**: `@zilliz/claude-context-mcp`
**核心价值**: 用向量语义搜索替代盲目的 grep + read 循环，大幅减少代码探索阶段的 token 消耗。

### 问题

传统代码探索流程效率极低：

```
grep "connection pool" → 返回 47 个匹配
  → read file1.ts (200 行) → 不是这个
  → read file2.go (350 行) → 不是这个
  → 换关键词 grep "pool init" → 12 个匹配
    → read file3.rs (180 行) → 找到了，但上下文不够
    → read file3.rs 周围更多 → 终于定位
```

整个过程可能消耗 15k-25k token，其中大量浪费在无关文件上。

### 解决方案

claude-context 基于 Milvus 向量数据库，对代码库做语义索引：

```
index_codebase(path) → 用 AST 分割代码 + embedding → 存入 Milvus
    ↓
search_code("连接池初始化在哪里？") → 语义匹配 → 返回精确片段
    ↓
直接定位目标代码，一次查询 < 1k token
```

**技术栈**：
- 向量数据库：Milvus (localhost:19530)
- Embedding 模型：text-embedding-v4（通过阿里云 DashScope）
- 代码分割：AST-aware splitter（按函数/类/方法边界切割，非盲目字符切割）

### Token 节省实测

在 TenBox VMM 项目（249 个编译目标，C++/C# 混合代码库）上的对比：

| 探索任务 | grep + read 传统 | claude-context 语义 | 节省 |
|------|:---------------:|:-----------------:|:----:|
| 找到 IPC 层实现 | 5 次 grep + 3 次 read，~18k token | 1 次 search，~800 token | 96% |
| 定位平台后端切换逻辑 | 3 次 grep + 4 次 read，~22k token | 1 次 search，~900 token | 96% |
| 查找 WinSparkle 更新调用 | 4 次 grep + 2 次 read，~14k token | 1 次 search，~600 token | 96% |
| **平均** | **~18k token** | **~770 token** | **95%** |

> 注：首次索引消耗约 30k-50k token（一次性），之后每次搜索 < 1k token。项目越大、探索越频繁，收益越高。

### 适用场景

- **大型代码库**（50+ 文件）：强烈推荐。grep 噪声大，语义搜索价值高
- **不熟悉的新项目**：不必猜关键词，用自然语言描述意图即可定位
- **频繁跨文件探索**：一次索引，多次搜索，边际成本极低

### 不适用场景

- **小型项目**（< 20 文件）：grep 足够快，索引开销不划算
- **一次性简单查询**：如果只需要找一个明确的函数名，grep 更快

---

## 6. MCP vs 插件：两种扩展机制

许多用户混淆"插件"和"MCP 服务"。两者都在 Claude Code 的工具列表里出现，但本质不同。

### 对比

| 维度 | 插件 (Plugin) | MCP 服务 (MCP Server) |
|------|-------------|---------------------|
| **机制** | 注入 System Prompt / Hook / Skill | 暴露外部工具（Tool），模型可调用 |
| **运行方式** | 上下文注入，无独立进程 | 独立进程，stdio/HTTP 通信 |
| **典型用途** | 改变模型行为（压缩、TDD、记忆） | 连接外部系统（数据库、搜索、API） |
| **安装** | `claude plugin install` | 在 `settings.json` 中配置 `mcpServers` |
| **Token 影响** | 注入指令消耗少量上下文，但节省更多 | 每次调用消耗 tool result token |
| **例子** | caveman, superpowers, claude-mem | claude-context, GitHub MCP, Postgres MCP |

### 如何选择

```
要改变模型"怎么想、怎么说" → 插件
  - 压缩输出 / 强制设计流程 / 跨会话记忆 / 前端审美

要连接外部系统获取数据 → MCP 服务
  - 向量搜索代码 / 查数据库 / 调 API / 读写文件系统
```

### 实际协作

本文五个工具中，四个是插件，一个是 MCP 服务。它们在同一会话中可以同时工作：

- caveman 压缩模型的回复
- superpowers 指导模型的开发流程
- claude-mem 提供跨会话记忆
- frontend-design 指导模型的前端审美
- claude-context 让模型能语义搜索代码库

五者互不冲突，在同一会话中叠加生效。

---

## 7. 插件组合：1+1+1+1+1 > 5

五个工具覆盖不同维度，组合使用有叠加效应：

```
┌──────────────────────────────────────────────────────────┐
│                      Claude Code                          │
│                                                          │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐  │
│  │caveman│ │super- │ │claude-│ │front- │ │  claude-  │  │
│  │       │ │powers │ │  mem  │ │  end  │ │  context  │  │
│  │输出   │ │流程   │ │跨会话 │ │设计   │ │ 语义搜索  │  │
│  │ -75%  │ │不跑偏 │ │记忆   │ │不烂   │ │ 省探索    │  │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └─────┬─────┘  │
│      │         │         │         │            │        │
│  ┌───┴─────────┴─────────┴─────────┴────────────┴──────┐ │
│  │                   协同效果                            │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ cave + super + context = 搜索→设计→实现→输出全压缩   │ │
│  │ cave + mem             = 回忆历史不占输出上下文       │ │
│  │ super + mem + context  = 计划复用历史决策 + 精准定位  │ │
│  │ cave + front + context = 搜索参考→设计→一轮到位       │ │
│  │ 五个全开               = 输入探索省 + 流程不返工      │ │
│  │                          + 输出压缩 + 跨会话记忆      │ │
│  │                          + 前端审美不烂              │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 实际场景

**场景 1：新功能开发**
claude-context（语义搜索相关代码）→ superpowers（brainstorm → plan → TDD → execute）→ caveman（压缩输出）→ claude-mem（查历史决策）

**场景 2：Bug 修复**
claude-context（搜索相似 bug 代码位置）→ claude-mem（查上次修没修过）→ superpowers（systematic-debugging）→ caveman（精简输出）

**场景 3：前端页面**
claude-context（搜索现有组件和样式）→ frontend-design（高质量设计）→ superpowers（brainstorm 需求）→ caveman（精简反馈）

**场景 4：新项目上手**
claude-context（索引 + 语义探索，省 grep）→ claude-mem（自动记录探索过程，下次不重来）→ caveman（压缩解释输出）

---

## 8. 安装与总结

### 安装

```bash
# Caveman - 输出压缩
claude plugin marketplace add JuliusBrussee/caveman
claude plugin install caveman@caveman

# Superpowers - 开发方法论（官方市场，自动安装）
claude plugin install superpowers@claude-plugins-official

# Frontend Design（官方市场）
claude plugin install frontend-design@claude-plugins-official

# Claude Mem - 跨会话记忆
claude plugin marketplace add thedotmack/claude-mem
claude plugin install claude-mem@thedotmack
```

claude-context 需要在 `~/.claude.json` 或项目的 `.claude/settings.json` 中配置 MCP 服务：

```json
{
  "mcpServers": {
    "claude-context": {
      "type": "stdio",
      "command": "npx",
      "args": ["@zilliz/claude-context-mcp@latest"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        "OPENAI_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "EMBEDDING_MODEL": "text-embedding-v4",
        "MILVUS_ADDRESS": "localhost:19530"
      }
    }
  }
}
```

需提前启动 Milvus（Docker 或本地安装）。

### Token 节省总览

| 工具 | 类型 | 节省方式 | 实测节省 |
|------|------|----------|:------:|
| caveman | 插件 | 输出压缩 | 输出 -65%（基准测试） |
| caveman-compress | 技能 | 记忆文件压缩 | 输入 -46%（文件实测） |
| superpowers | 插件 | 减少返工 | 上下文 -65%（会话数据） |
| claude-mem | 插件 | 记忆复用 + AST 探索 | 探索 -83%，上下文 -50%（会话数据） |
| frontend-design | 插件 | 减少设计迭代 | UI 迭代 -67%（会话数据） |
| claude-context | MCP | 语义搜索替代 grep | 代码探索 -95%（会话数据） |

### 结论

五个工具各自解决一个痛点：

- **caveman** — AI 太啰嗦
- **superpowers** — AI 太着急写代码
- **claude-mem** — AI 记不住上次的事
- **frontend-design** — AI 做的界面太丑
- **claude-context** — AI 找代码太盲目

装完这五个，Claude Code 从"好用的终端助手"变成"能独立完成复杂任务的工程搭档"。每个工具覆盖开发流程的不同阶段，五维叠加后，一个典型中型功能的端到端 token 消耗降低 70-80%。

