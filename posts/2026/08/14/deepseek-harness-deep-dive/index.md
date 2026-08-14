# DeepSeek Harness 全拆解：30 小时逼近 10 万 star 的 Agent 运行时，特别在哪


> 2026-08-13 开源 · 0.1.0-rc.5 开发者预览 · MIT 许可。本文全部机制描述均出自仓库（`docs/`、`.agents/notes/`、源码），个别处注明"从决策记录看"。Star 数据为 GitHub API 实测：开源首日约 3.1 万，不到 30 小时已约 9.4 万（forks 逾 8 千），增势未缓。

## 导语：为什么值得读

2026 年 8 月 13 日，DeepSeek 官方开源了 deepseek-harness（下文简称 dsh）——一个 TypeScript 写的 agent harness（agent 运行时/框架）。开源当天数小时内，GitHub star 突破 4000。

这个仓库没有"README 画饼、代码潦草"的开源典型病：两个多月、约 1.2 万次提交；49 个包组、219 个包；600+ 条带日期的架构决策记录（Agent Notes）；文档带词数预算门禁，目录表全部由脚本从源码生成并做新鲜度校验。这是"用 agent 开发 agent"的产物——**工程过程本身就是产品**。

对熟悉 AI agent / LLM 工程的中高级开发者，它值得一读的原因很具体：

- **会话模型是事件溯源**（append-only 事件日志），并配套一套"压缩不改日志、回放仍确定"的 surface 阴影机制——这是几乎所有自建 agent 工具链迟早要面对的坑；
- **沙箱用自带的 landlock-run**（约 300 行 C11），fail-closed、功能探测、审批升级闭环——进程级沙箱的务实样板；
- **ACP（Agent Client Protocol）经历了"编辑器桥 → automation-only"的主动退化**，是"UI 职责与自动化协议必须分家"的活案例；
- **hooks 协议**（Claude Code / Codex 的 `hooks.json`）被做成一个带 matcher / 退出码 / 合并语义的共享库——你要兼容这两家的 hook 生态，这就是现成规格书。

提醒一句口径：它是预览版，README 明说 "THERE WILL BE COMPATIBILITY-BREAKING CHANGES"，文末"观察与风险"会给出坦率评价。

## 关键事实

| 项 | 事实 |
|---|---|
| 发布 | 2026-08-13 开源，`0.1.0-rc.5` 开发者预览，MIT |
| 热度 | 开源首日即破 3 万 star |
| 技术栈 | TypeScript ESM monorepo，pnpm 11.7.0，Node `^22.19 \|\| >=24` |
| 规模 | 49 个包组、219 个包；约 1.2 万次提交（约 2 个月） |
| 布局 | `apps/cli`（dsh 命令）+ `apps/web`（Vite 应用）；`native/landlock-run`（C 沙箱启动器）；`python/`（Python SDK + 单文件 exe）；`examples/` 6 个可运行组合 |
| 定位 | "everything is a plugin"：模型适配、工具注册表、会话日志、乃至 agent 主循环本身都是可替换的插件；官方站点口号："一切皆插件，运行有迹可循" |
| 官方站点 | [deepseek.com/harness](https://www.deepseek.com/harness/)（2026-08-13 上线，面向 Harness 开发者开放测试；官方公式 Agent = Model + Harness） |
| 获取 | 源码 `git clone https://github.com/deepseek-ai/deepseek-harness.git`；即装即用 `npx @deepseek-ai/dsh web` |

## 一、定位：一个引擎，五个产品出口

官方站点把它浓缩成一句口号：**"一切皆插件，运行有迹可循"**。前一半是架构承诺（下面第二节展开），后一半是数据承诺——系统提示词、思维链、工具调用与结果、子 Agent 调度、每一次上下文注入，全部写入仅追加的会话日志，Trajectory 视图按来源查看，恢复、分叉、检索与回放共享同一份事件流（第四节的会话模型）。官方还给出一个公式：**Agent = Model + Harness**——模型是灵魂，Harness 给予 Agent 理解环境、使用工具、在真实场景中持续工作的能力。

`dsh` 本身只是一个产品启动器。同一套 core，按 profile（命名插件组合）组装出不同产品面：

| 出口 | 形态 | 用途 |
|---|---|---|
| `dsh web` | Web UI（默认 `127.0.0.1:3080`） | 交互主产品面：选工作区 → 配模型 → 跑任务，审批弹窗 |
| `dsh --profile headless "任务"` | 一次性无头 runner，跑完打印答案退出 | 自动化/批处理，零 Host / HTTP / 浏览器层 |
| ACP server | stdio JSON-RPC 自动化契约 | 被父 agent / 自动化控制器驱动 |
| JSON-RPC SDK | 进程内/跨进程协议 + TS 客户端 + **单文件 exe**（约 174MB） | Python SDK 的运行时载体 |
| `dsh plugin` | 按 profile 安装第三方插件（pnpm 转发） | 生态入口（`dsh-plugin` topic） |

注意：没有 TUI 出口。这不是疏忽——交互前门在两个月里摇摆了两次：7 月 20 日 readline 退役让位全屏 TUI（`archived/simplification/2026-07-20-retire-readline-front-door.md`），8 月 4 日 TUI 整包移除（`implemented/simplification/2026-08-04-remove-tui-package.md`，决策记录原话："Web remains the shipped interactive surface"）。产品最终收敛为 **Web UI + 自动化协议** 双面。预览期的产品形状就是这么漂移的，读到后面你会习惯。

关键点：产品出口的多样性来自**组装**而不是**分支**——同一进程 `dsh --profile web` 与 `dsh --profile headless`，一棵插件树两种装法。这是它区别于"一堆 CLI 开关"的本质，也是下一节的地基。

### 1.1 组装机制：profile + bundle 补丁层

一个运行中的 dsh 是一棵在启动时按有序层次组装出来的插件树（`docs/architecture.md` #Profiles-and-bundles）：

- **profile** 是命名组合（存于 Harness home）：列出它叠加的 bundle、持有外置插件、保留用户自己的 `cordis.patch.yml`；
- **bundle** 是 Cordis 配置行 + 代码的分发格式——它插入的东西仍可被上层补丁覆盖；
- **层序**：profile 列的 bundle 按序 → profile 的 `cordis.patch.yml` → home 级补丁 → `--patch` overlay。patch 按 id 定位一行并整体替换其 config，或插入新行；
- **随装模板**：`dsh-base`（每 profile 的第一层：模型适配器、工具、持久化、沙箱与审批策略、设置、凭证）、`dsh-web-app`、`dsh-headless`。

验证工具很直白：`dsh --profile web --dump-config` 打印你机器实际 boot 的树——打印出来的任何一行都能被你自己的 patch 替换。组装不是黑盒，是可审计的层。

### 1.2 出口四的展开：单文件 exe 与"配置决定一切"

JSON-RPC SDK 的运行时载体是个约 174MB 的单文件可执行（`implemented/architecture/2026-07-10-single-file-executable-sdk-runtime-distribution.md`），打包路线值得单独说：

- 用 `@yao-pkg/pkg` 的 `--sea` 模式（vercel/pkg 归档后的活跃 fork），目标 Node 24；VFS 里放的是**真实包树 + 真实 node_modules**，ESM 动态 import 原样工作，无 ESM→CJS 转译、无字节码编译；
- **"exe 里 boot 什么插件，由外部 `cordis.yml` 决定"是硬语义**：配置发现只有两条通道——`DSH_CORDIS_CONFIG` 环境变量优先、argv 位置参数其次，**无默认路径、无内置回退**，双缺即 fail loud；
- 闭包清单是 `python/sdk-runtime/package.json`（零代码纯依赖清单，唯一事实源）：加一个插件 = 加一行依赖重新打包；VFS 里没有的名字 import 必失败——**不需要 allowlist 代码，集合就是 VFS 装了什么**；
- Python SDK 双载体：生产用 exe，开发用 `DSH_RUNTIME_MODE=node` 指向源码树（成员验证通道，不进 wheel）。

代价也记在案：约 174MB、源码原样进 blob（无混淆，闭源分发需另行评估）；pkg 的 VFS/module-hook 层是社区维护（版本 pin 6.21.0，升级是显式变更）。这是"零依赖单文件分发"与"插件语义与源码运行完全一致"之间的一个务实落点。

## 二、地基：vendored Cordis 与五个概念

dsh 没有发明框架，而是把上游 Cordis（聊天机器人领域的插件框架）vendor 进仓库（`vendor/`，rescope 成 `@deepseek-ai/cordis`），在其上构建全部产品。Cordis 不是草台轮子：它有 80 页理论论文（[cordiverse/paper](https://github.com/cordiverse/paper)，北大 + DeepSeek 作者）把"插件卸载必须完全撤销副作用、依赖变化必须结构化感知"这两件事形式化成了运行时机制。`docs/cordis-primer.md` 用五句话讲完它：

1. **插件即 Service**：插件是一个带 `inject` + `apply(ctx)` 的函数，或一个 Service 子类；
2. **ctx 是服务仓库**：服务以 `ctx.tools` / `ctx.llm` / `ctx.sessions` 这样的键注册，插件按键找服务，而不是 import 具体实现；
3. **`inject` 声明依赖**：Loader 等依赖的服务存在后才激活插件——**加载顺序 = 服务依赖图，不是手排的启动序列**；
4. **typed events**：事件用 TypeScript declaration merging 声明，按语义选择分发模式（见下表）；
5. **注册即可逆 effect**：一切注册（工具、适配器、监听器）走 `ctx.effect()` / `ctx.on()`，插件卸载时自动回滚——热重载有结构保证。

事件分发模式是事件声明的公共契约（`@mode` 标签会被生成目录校验）：

| 模式 | 是否 await | 分发顺序 | 有返回值 |
|---|---|---|---|
| `emit` | 否 | 按注册顺序观察 | 无 |
| `waterfall` | 否 | 按注册顺序 | 有（可改返回值） |
| `parallel` | 是 | 全体并行观察 | 无 |
| `serial` | 是 | 按注册顺序 | 有 |

`waterfall` 是"around 中间件"：监听器收到 `(...args, next)`，调 `next()` 委派（可能被包装过的结果），不调则短路。对单决策事件，短路就是设计本身——策略监听器可以"占有"决策；而只注解、只观察的监听器**必须委派**，否则后续策略监听器再也看不到事件。这条纪律在后面 hooks 一节会再次出现。

架构文档开宗明义（`docs/architecture.md`）：

> There is no privileged core to patch.

没有特权核心可打补丁——扩展 dsh = 在 `cordis.yml` 里挂一个插件；agent-loop 本身也只是 `ctx.agentLoop` 上的一个可替换实现。Core 包只有六个：`core/session`（事件日志）、`core/system-prompt`（提示词与工具 schema 组装）、`core/tools`（作用域工具注册表）、`core/agent`（Agent 接口与注册表）、`core/agent-loop`（默认驱动循环，**本身可换**）、`core/scope`（作用域注册原语）。

## 三、事件三分域：扩展点放在哪，是第一决策

`docs/architecture.md` #Events 把所有事件分成三个域——新行为挂哪，第一个问题就是选域：

| 域 | 性质 | 用途 |
|---|---|---|
| **session events** | 持久事实，append 进会话日志并广播 | 必须跨重启存活的（turn / step / user message / tool 结果） |
| **agent events**（`agent/*`） | 携带活 `Agent` 的实时事件 | 观察/拦截进行中的工作（inbox、pre-step、request、turn-stopping） |
| **capability events**（`fs/*`、`tools/*`） | 策略与适配器挂载点 | 不 import 循环的横切逻辑 |

配套一条硬不变量："模型可见 ⟺ 已入日志"——任何到达模型请求的内容必须能从日志重建，运行时断言校验。这就是为什么"加一种模型可见的输入"必须"加一种新的 session event"：`SessionEventMap` 是 merge-extensible 的，扩展面不是 API 旁路。

## 四、会话：事件溯源 + surface 阴影 + zstd JSONL

这是全仓库含金量最高的设计，拆成四层讲。

### 4.1 日志即状态

决策记录 `implemented/architecture/2026-06-11-event-sourced-sessions.md`：`Session` = 类型化 `SessionEvent` 的 **append-only 日志**，是唯一事实源。LLM 消息历史**从日志派生**（`deriveMessages()`），不是一份独立维护的数组；原始 `assistant/chunk` 原样入日志保 token 级回放保真，但派生以组装后的 `assistant/message` 为准。备选方案"可变消息数组 + 事件当通知"被否，理由只有一句：**状态与日志可能分叉，而事件溯源让分叉结构性不可能**。

append 是同步的（热路径不阻塞 I/O），持久化插件缓冲 write-behind，在**语义检查点** drain：请求派发前、工具派发前、step 批次后、turn 末尾（`2026-06-14-session-persistence.md` + `bug-fix/2026-07-21-semantic-session-checkpoints.md`）。持久化只是插件关注点，内存 store 即默认实现。

### 4.2 turn/step 流转与事件日志的咬合

```text
turn/start
  claim 队列输入 → 组装 prompt 分区 + 工具 schema
  → agent/pre-step（waterfall：reject 则无 step 关 turn / enter 开 step）
  step/start
  append user/message（模型可见 ⟺ 已入日志）
  agent/request → llm/stream → assistant/chunk*（原样入日志）→ assistant/message（权威派生源）
  tool/call* → tools/pre-execute → execute → post-execute → tool/result*
  step/end → 工具欠请求或有新输入则下一 step
  → agent/turn-stopping（要续则 steer()）
turn/end
```

`turn/*`、`step/*`、`user/message`、`assistant/*`、`tool/*` 是持久 session events；`agent/*`、`llm/stream`、`tools/*` 是活扩展点（waterfall 必须 `next()` 委派）。注意 `agent/pre-step` 的 enter 决策先于 `step/start`：被 reject 的输入会关掉一个"没花 step 的 turn"并留档——**尝试本身也是事实**。

### 4.3 surface：压缩的阴影机制

日志无限增长，上下文必须压缩。naive 做法是"改日志 / 改派生函数"，但压缩后的历史怎么保证回放确定性？

`implemented/architecture/2026-06-18-session-surface.md` 的答案：每个事件带两个可选字段——

```ts
export type SurfaceOp =
  | 'append'                                    // 普通尾部追加
  | { op: 'replace'; start: number; end: number }  // 阴影 [start, end]（含端点）
```

- `surfaceOp` 说明这个事件如何进入 surface（"产生模型消息的事件序列"这个投影）；
- `sourceEventSeqs` 引用它替换掉的事件 seq——**被阴影的事件必须被完整列举**，否则替换不合法。

**压缩 = 追加一条带 `replace` 标记的汇总事件，阴影掉一段旧事件；日志永不改写。** 被阴影的事件仍在日志里，只是不再出现在 surface 上。`SurfaceManager` 增量维护这条有序 seq 序列（delta O(new events)，不重扫全日志），派生历史、压缩、工作区上下文共享同一投影。`assistant/message` 记录其完整 chunk 来源集（空流记 `[]`），`tool/result` 记录其 `tool/call` 来源——每条派生事实都能追溯来源。

这套设计回答的问题：**上下文压缩之后，回放和 fork 凭什么还确定？** 答案不是"别压缩"，而是"压缩也是日志里的一条事实"。

### 4.4 持久化：zstd 帧 JSONL + 崩溃修复

- **双后端同一契约**：`SessionPersistence` 是能力缝，JSONL 与 SQLite 跑同一套 `runPersistenceContract` 契约套件；`SessionEvent` 1:1 存成 `(session_id, seq, type, time, data)` 行——**无转换类型**（`2026-06-14-session-persistence.md`）。
- **元数据出日志**：format version / cwd / lineage 放在日志之外的 `SessionHeader`——"元数据不是可回放状态"。
- **zstd 帧**（`implemented/architecture/2026-07-19-zstandard-jsonl-session-logs.md`）：默认存为 `.jsonl.zstd`，标准 Zstandard 帧拼接——头帧单独一帧（保证 metadata-only 列目录不读事件帧），之后**每个 durable append batch 一个独立校验和帧**（帧边界 = turn 提交点，存储层不感知 turn 类型）。压缩用 Node 内建 `zstdCompress`（API 标注 experimental，Node 22.19 floor），开 `ZSTD_c_checksumFlag`，零新依赖。
- **崩溃的 torn tail 在帧边界修复**：EOF 落在最后一帧中间 = 可恢复的撕裂尾部，从该帧起始字节截断，把已解码的完整事件 + 合成 closers 重写为带校验的新帧。**被中断的 turn 不截断**——它可能含大量有效工作；`repair.ts` 合成带 surface 标记的 `tool/result` closers 补孤儿 tool call。只有不完整的最后一条记录会被丢弃；帧内校验失败 = 损坏，拒绝加载，不做静默修复。

### 4.5 磁盘布局：可读的项目会话目录

`implemented/architecture/2026-07-24-project-session-directories.md`：

```text
<root>/--<normalized-cwd>--/<encoded-session-id>/session.jsonl.zstd
```

用可读项目路径（lossy 归一化：分隔符转 `-`，危险字符 `~XXXX`，**故意不带 hash 后缀**）替代不透明 cwd hash，共享根可导航；每会话一个拥有目录，未来 artifact（附件 / spill / 协调状态）不换布局。`locate()` 仍返回固定 transcript 路径，保持 `transcript_path` 语义——hook 协议、外部消费者都不感知布局变化。

### 4.6 会话数据面的其余部分：一圈派生视图

日志之上还长着一圈独立缝（`packages/README.md` 的 session / session-query 两组）：

- **projection 缝**：派生视图（如消息历史、surface）是独立可替换的服务；
- **log-backed titles**：会话标题由 `ctx.sessionTitle` 的**唯一 provider** 生成（架构文档扩展表点名"注册唯一 provider"）——"标题从哪来"被做成了可替换插件，而不是散落的特判；
- **telemetry / 报告**：同样从日志派生；
- **session-query 家族**：逻辑语料、有界读取、血缘关系、事件关系、语义过滤、SQLite FTS——回放/检索与存储解耦成独立的查询缝。

结论很一致：会话数据面是"**一条日志 + 一圈派生视图**"，每个视图都是独立缝。要加一种新读法，不动存储。

**一句话总结这一节**：日志是事实，派生是投影，压缩是日志里的一条新事实，元数据在日志外。这套分层让回放、fork、恢复、检索全部从同一条流上长出来，而不是各做一套状态。

## 五、能力缝：换 provider 换整个产品，不换模型契约

"一切皆插件"如果只是"能挂插件"，还不够。dsh 的纪律是**能力缝（capability seam）三件套**（`implemented/architecture/2026-06-13-capability-seams.md`）：

- **Service Definition**：接口声明（如 `ctx.web`）；
- **Service Provider**：实现（如 Exa 搜索、Perplexity 搜索、DeepSeek 搜索、HTTP fetch）；
- **Consumer**：通常是模型可见的工具（`web_search` / `web_fetch`）。

铁律（`implemented/architecture/2026-06-24-web-capability-seam.md`）：**Provider 永不注册工具**。Provider 注册能力，`dsh-tool-web` 是模型可见名字、描述、JSON schema、提示词的唯一所有者。换 provider 不换模型契约；provider 缺失/配错不导致工具消失——schema 注册时稳定存在，执行时抛结构化 `WebError`（`WEB_PROVIDER_CONFIGURED_MISSING` / `WEB_PROVIDER_AMBIGUOUS` 等）。工具保持可见、执行时报错，而不是让"加载顺序、凭证状态、HMR 时机"进入模型契约。

依赖方向（每条都可从包依赖审计）：

```text
dsh-tool-web  --依赖-->  dsh-web（ctx.web）  <--依赖--  dsh-web-search-exa / -perplexity / -deepseek
   consumer                   interface                    dsh-web-fetch-http（implementation）
```

同一个模式铺满全仓库：fs（seam + local impl + 文件工具 + bash-backed grep/glob）、shell（bash executor + sandboxed bash + 模型可见工具）、subprocess（`ctx.subprocess`）、LSP、skill、compaction、subagent……每个能力一组包，方向单一，不 import 循环。选 provider 也有纪律：配置的 provider id 优先；未配置时**只有恰好一个可用 provider 才自动选中**，多个则抛 `AMBIGUOUS`——注册顺序不是产品策略。

### 5.1 工具管线：每个相位一种权威

工具调用不是一条事件，是一条**六相位管线**（`implemented/feature/2026-06-30-interception-extension-points.md`）：

```text
tools/pre-execute → guard → tools/execute → dispatch → tools/post-execute → finalizeContent → tools/result
```

- `pre-execute`：可扩展的 waterfall 闸门，`PreToolDecision` 允许 / 拒绝 / 询问；ask 经可选 approval seam 解析，`allowed-once` 才继续；
- `guard`：同步、作用域感知的最终策略，**只能拒绝不能强放**——监听器顺序救不活被最终不变量禁止的操作；
- `execute`：around-dispatch 包装（超时、重试、指标）；
- `post-execute`：检查/变换 waterfall，可 block、替换内容、附加上下文；
- `finalizeContent`：工具自己最后的 content 不变量（不能改写 `isError` / 错误身份 / 上下文）；
- `result`：纯观察，监听器失败被隔离，不能改变结果。

关键纪律：**身份在策略前封存**——registry 在策略开始前快照调用者输入、冻结参数、分配不透明 token，日志、UI、工具体看到的是同一个事实。这就是为什么"pre-tool 入参改写"迟迟不做：改写必须同时更新历史、审计、展示与执行，是一个独立设计单元而不是一个字段（见 hooks 缺口）。

### 5.2 同款纪律的旁证

- **per-session cwd**（`implemented/architecture/2026-07-02-fs-per-session-cwd.md`）：bash 工具、文件工具、沙箱策略共享同一"会话工作区"解析——含 `symlink/..` 或普通 symlink 的路径先按原生文件系统身份解析再做词法拼接，一次调用一个工作区身份；调用方（工具）提供 cwd，provider 不反向依赖 session——"显式 > 隐式"的包边界约定。
- **后台任务**（`ctx.jobs` + `job_*` 控制工具，`2026-06-20-generic-long-running-tool-runtime.md`）：长任务统一运行时，统一 id、授权与控制词汇。

## 六、ACP：两次演化，从编辑器桥到 automation-only

ACP（Agent Client Protocol）是"外部 agent / 编辑器驱动 harness"的 JSON-RPC over stdio 契约。dsh 自己实现了 ACP **服务端**——方向是"被驱动"，和"harness 驱动外部 CLI agent"是相反的两端。

**第一版（`archived/feature/2026-06-14-acp-agent-client-protocol.md`，已归档）**：做的是 Zed 编辑器桥。工具卡片、终端渲染、diff、plan、权限选择器、human elicitation，全翻译进 ACP——决策记录自己承认，它成了一个"第二交互式产品 UI"。

**7 月 23 日主动退化**（`implemented/simplification/2026-07-23-acp-automation-only-protocol.md`），理由值得原样引用：

> The ACP bridge had become a second interactive product UI.

ACP 桥变成了第二个交互式产品 UI。决策记录说得很白：这些职责重复了 TUI 和 Web client，却把自动化传输耦合进 UI 服务、持久化查询、展示策略和编辑器私有约定。退化的契约刻意保持窄：

- 版本协商；fresh 文本会话（一连接多会话复用，`Map<SessionId, SessionRecord>` 精确归属）；每会话一个 in-flight prompt；
- **只发 committed 的 `assistant/message` 文本**——reasoning、token 流、工具活动、todo、plan、标题全部留在会话日志或 UI 专属通道；
- 按会话 cancel；one-shot `request_permission`（机器策略通道，不是人审 UI：只接受精确 agent 对象，grant 不持久化）；
- 不提供 session load/list/delete、commands、modes、模型切换、plan review、human elicitation。

**执行权永远留在 harness**：ACP 从不把 shell 执行委托给客户端——第一版决策记录明确拒绝 `terminal/create` 子协议（终端只做展示投影，`_meta.terminal_*` 能力门控约定）。stdout 是协议传输通道，因此 app 组合不挂任何 stdout logger，测试守护"stdout 只出现 framed JSON-RPC"。

这条演化的教训对所有做 agent 工具链的人都成立：**UI 呈现职责和自动化协议必须分家**。一个协议一旦承担了"好看"，就会同时承担慢、耦合和版本包袱。

## 七、GUI：分层纪律 + 四象限 RPC

### 7.1 三层分层（`implemented/architecture/2026-07-19-gui-layering-and-rpc-protocol.md`）

| 层 | 包 | 职责 | 关键纪律 |
|---|---|---|---|
| 协议层 | `dsh-host-apiproxy` | TS/zod 定义 + `{fetch}` 抽象 + 客户端基类 | 浏览器/Node 都能 import；client 不得绕过 api 直连 ctx |
| 组装层 | `dsh-host-runtime` | 插件组合 + ApiProxy 集成 + UI 插件挂载 | 挂哪些插件、什么默认值只在这里决定 |
| 载体层 | `dsh-host-webserver` | 静态服务 + `/api/*` 转发 + WebSocket 升级 + `__DSH_BOOT__` 注入 | 只服务 Web；依赖 `{fetch}` 接口而非 runtime（运行时注入，不是包依赖） |

方向纪律可审计：client 包只 import apiproxy 的 `/api`、`/client` 两个浏览器安全子路径；未来的 Electron 壳只需要换一个 `doFetch` 子类。`apps/` 只做组装，动态 import，应用间互不加载。

### 7.2 四象限消息模型

每条线上消息按"谁发起 × 请求/响应"分四类，与物理信道解耦：

| 象限 | 消息 | Web 载体 |
|---|---|---|
| client→server 请求 | `ClientRequest` | `POST /api/<method>` |
| server→client 响应 | `ServerResponse` | 该 POST 的响应体（恒 HTTP 200） |
| server→client 请求（帧） | `ServerRequest`（approval/question 可应答帧 + session/event 纯推送帧） | WebSocket 下行 |
| client→server 响应 | `ClientResponse`（echo rpcId） | `POST /api/respond` |

要点：

- **rpcId 品牌化**（branded string）：发起方铸造，响应永远 echo，业务代码不铸 id。审批/问答帧的 id 在受理时铸一次、重连回放原样复用——稳定可追溯由此而来；
- **签名即事实源**：`RpcMethodMap` 从接口方法签名派生全部类型，加一个 unary 方法 = 5 步机械改动（接口签名 → map 一行 → schema 一对 → handler 一行 → 实现）；加帧类型 3 步；加错误码 2 步（`RpcErrorDetailsMap` 一行 + 一个分支，漏了编译错）；
- **无 DTO**：wire 上的 `SessionEvent` / `ContentBlock` 就是核心类型（`import type` 直达浏览器）；`assistant/chunk` 即 token 流，没有单独 delta 帧；
- **双向 zod 校验**，未知方法 fail loud（`bad-request`），没有 not-implemented 回退；
- **reconnect = rebuild**：无 resume cursor，按 `subscribed.lastSeq` 与历史尾部对比补拉一次。

这套东西与其说是"协议设计"，不如说是**把扩展做成机械流程**：方法表即契约、错误码穷举即类型、载体可换即抽象。复杂度是实打实的，但每一分都有审计出口。

## 八、浏览器里跑第二棵 Cordis 树

`implemented/architecture/2026-07-19-gui-web-client-architecture.md`：host 是一棵 Cordis 树，**浏览器是第二棵**——同一个 vendored Loader，配一个自研 ClientModuleSystem（懒 CJS 表 + external script 到达 + HMR）补 Node 缺席的底层。

- **UI 能力全部是 `dsh.client` 插件**：manifest 声明 `inject` / `immediately`，host 编 `__DSH_BOOT__` 图，两阶段 boot（immediately 预拉 → 全量激活，settled 一次成型，无渐进渲染）；
- **slot 系统组合页面**：组件零 Cordis 运行时依赖，一次 `register` 调用占一个 slot、声明子 slot、声明 store、注入业务面；每个渲染项在独立 error boundary 里；
- **业务对象层 React-free**：事件窗口、流式累积在对象层维护**不可变快照**（每次业务更新只替换对应键的引用），React 纯投影（uSES + 引用保持）——token 流不抖渲染树，`assistant/chunk` 每动画帧最多发布一次；Notifier 微任务合批：N 次变更一次通知一次渲染；
- **会话 scope 观看驱动、惰性建、常驻吃帧**：切走再切回即渲染；host 侧会话死亡不拆 scope（冻结为只读视口）。

代价也明说了：loader/module-table 机制是自研基础设施，全程自己养；一次成型 boot 放弃首屏渐进性；双 tsconfig aggregate 让"哪个编译单元看到这个文件"成为开发中要回答的问题。这是"运行时插件化"的完整价格清单。

## 九、沙箱：landlock-run 与 fail-closed 哲学

### 9.1 自包含启动器

`native/landlock-run/README.md`：约 300 行 C11、musl 静态链接、直接调 Landlock 内核 UAPI 的 **self-restrict-then-exec** 启动器——先给自己装 ruleset 再 `exec` 目标命令，ruleset 跨 `execve` 继承：**宿主进程不受限，被包装命令及其后代全程受限**。内核不能强制时 fail-closed（exit 125，不运行命令）。分发为平台预编译 npm 包 + `probe()` 功能探测（`full` / `partial` / `unusable`）——探测是功能性的（真的建 ruleset 并强制），不是查版本号。内核 ABI 不够新时报 `partial`（如旧 ABI 管不了 truncate），不假装 full。

### 9.2 能力缝与平台链（`implemented/feature/2026-07-06-sandbox.md`）

`ctx.sandbox` 缝：`confine(argv, policy)` 返回**包装后的 argv**，consumer 直接 spawn；无可用后端抛 `SANDBOX_UNAVAILABLE`，**绝不静默降级为无沙箱**。平台链：Linux 功能探测 bwrap → Landlock；macOS Seatbelt（依赖已废弃的 `sandbox-exec` CLI，fail-closed 兜底）；Windows restricted-token 链是 2026-08-08 的决策，报告 `partial`。

关键设计点：

- **denialSignatures + runnerFailureRules**：每后端带"内核拒绝文本特征"与"启动器故障特征"，区分**"命令被沙箱拒"**（正常结果）与**"沙箱坏了"**（基础设施错误）——这是大多数"加个 wrapper"方案忽略的语义层；
- **模式只声明文件效应**：`read-only` / `workspace-write` / `danger-full-access`，网络与进程可见性**不承诺**——诚实边界；
- **升级路径 = 一次审批**：被拒后模型可带 `sandbox_permissions`（必须严格更宽）+ `justification` 重试一次，经 approval seam 人审；**grant 不持久化**，拒绝即结束，无 `allow_always`。重试是新的 `tool/call`（新参数、新结果事实），不是隐藏重入；
- **每会话模式是会话日志的一部分**：`sandbox/mode` 事件 + `effective = findLast(events) ?? config default` 折叠——重启免疫、多会话隔离，零外部配置存储。决策记录还留着一次失败实验：把模式写进稳定 system prompt，模型从此拒绝尝试会被拒的操作（首个手工会话 12 轮里 5 轮零工具调用），沙箱变软锁，该方案被移除；
- **进程内工具（fs/web）经 `dsh-fs-sandbox` 复用同一模式词汇做路径围栏**——argv 包装对闭包 `ctx` 的函数无意义，它不假装统一。

沙箱是**可组合的能力**，不是某个 executor 的私藏——四行 `cordis.yml` 就把一个无沙箱编码 agent 变成沙箱产品路径（`examples/acp-agent` 默认即此组合）：

```yaml
- id: sandbox
  name: '@deepseek-ai/dsh-sandbox-local'   # 每平台 runner provider（ctx.sandbox）
- id: bash
  name: '@deepseek-ai/dsh-bash-sandbox'    # 受限 executor，替换 dsh-bash-local
  config:
    mode: workspace-write                  # 部署默认模式
    workspaceRoot: !!js process.cwd()      # workspace-write 可写的边界
- id: approval
  name: '@deepseek-ai/dsh-user-approval'   # 升级闸门的通道
  config:
    policy: ask
- id: permission
  name: '@deepseek-ai/dsh-permission-presets'  # 产品面的模式/策略选择器
```

交换对 `ctx.shell` 的所有消费者透明（bash 工具、hook 命令、后台任务照旧 spawn 包装后的 argv）；删掉 sandbox 与 permission 条目、换回 `dsh-bash-local` 即退出沙箱，升级字段随之从工具 schema 消失——**能力门控在挂载的 executor 上，不在配置上**；省略 approval 则一切升级 fail-closed；部分组合在加载时 fail loud。

## 十、hooks：兼容适配器，不是权力工具

### 10.1 原生层：hook 不是包

"原生 hook"就是一个订阅 typed 事件的普通插件（`implemented/feature/2026-06-30-interception-extension-points.md`）：

| 事件 | 模式 | 语义 |
|---|---|---|
| `agent/session-start` | emit（不能阻塞） | 纯通知，可 `agent.inject()` 种上下文 |
| `agent/pre-step` | waterfall | `PreStepDecision`：enter / reject |
| `tools/pre-execute` | waterfall | `PreToolDecision`：allow / deny / ask |
| `tools/post-execute` | waterfall | `PostToolDecision`：block / 替换 / 附加上下文 |
| `agent/turn-stopping` | serial | 要续则 `agent.steer()` |

立场原话："Anything a bridge can do, a plain plugin can do directly"——原生插件更强大（无序列化边界、全 ctx、typed 返回）。

### 10.2 兼容层：两个桥 + 一个共享协议库

`dsh-hooks-claude-code`（7 个 hook 点：SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / Stop / SubagentStart / SubagentStop）与 `dsh-hooks-codex`（5 个）把用户已有的 CC/Codex `hooks.json` shell 命令钩子翻译到上述 typed 事件。共享库 `dsh-hook-protocol` 持有**真正相同的协议原语**（`implemented/feature/2026-06-30-hook-protocol-lib.md`；事实基础：Codex 引擎刻意实现了 CC hook 协议的子集）：

| 原语 | CC 方言 | Codex 方言 |
|---|---|---|
| matcher | 纯 `[A-Za-z0-9_|]+` 视为字面量（`|` = 精确替代），其余视为正则；缺省/空/`*` = 全匹配 | 恒为未锚定正则 |
| stdin payload | 基础字段（`session_id` / `transcript_path` / `cwd` / `hook_event_name`）+ 每事件字段，**带尾换行**；注入 `CLAUDE_PROJECT_DIR` 等 env | snake_case 字段 + `turn_id` / `model` / `permission_mode`，**无尾换行**；无 env 注入 |
| 退出码 | exit 0 = stdout lenient JSON；exit 2 = blocking error（stderr 为原因）；其他 = 非阻断错误 | 同左 |
| 合并 | 多匹配 hook 串行执行，**deny > ask > allow** 最严格折叠，block 原因 `\n\n` 连接，上下文按序累积 | 同左 |

每条 hook 调用写 `hook/invoked` + `hook/result` 会话事件（log-only，不上 surface）——**拒绝/阻断有持久决策证据**。上下文注入一律标 `source: plugin`（防"插件上下文冒充用户"）；只加上下文不阻断的 hook 必须 `next()` 委派，否则短路后续策略监听器——这两条是 hook 语义安全的双保险。配置加载与校验 fail loud：matcher 正则非法 = 整配置拒绝加载、注册零个监听器，不静默跳过；桥读不到/解析不了配置文件则记录后跳过，不 crash boot。

已知缺口（决策记录明示，`TODO` 挂起）：`updatedInput` 工具入参改写只记录 + 警告；`continue:false` 硬停未实现；stop loop-guard（CC 的八次连续 block 上限）未实现；per-session hook config 未实现。**宣称"跑用户既有 hooks 原样执行"要打折**——见文末风险。

## 十一、工程实践："用 agent 开发 agent"的样本

dsh 的工程过程本身值得单独记录：

- **Agent Notes 是决策宪法**：非平凡改动必须同 PR 附五段式笔记（Problem / Decision / Alternatives / Consequences / Verification），`implemented/` 描述已落地现实，归档即冻结、不再是现行权威。仓库里 600+ 条带日期的记录（implemented 状态 500+ 条），从 2026-06-11 到开源日约两个月——**每个"为什么"都有出处**，本文能写出来全靠它；
- **文档预算门禁**（`docs/AGENTS.md`）：根 `AGENTS.md` ≤1600 词、`architecture.md` ≤1800、子树 ≤600，超了先挪内容再提额度——文档也是编译产物；
- **生成式目录**：config catalog / tool catalog / persistence catalog / module graph / Cordis API 全部由脚本从源码生成并 freshness-gated——手写文档会漂移的问题用生成解决；
- **验证分级**：unit → 真实 Loader 组合测试 → keyless snapshot（可回放的真实装配转写，不依赖 mock）→ real-API e2e（无 key 自跳过）→ 每文件 100% coverage 门禁。snapshot 体系让"模型/用户可见行为"有确定性回归。

这里有个内在矛盾值得点破：**文档预算 + 五段式笔记 + 每文件覆盖率，是"agent 团队写 agent 产品"的特化纪律**——人肉执行成本极高，但 agent 执行它恰好成本低。读它的文档比读大多数开源项目信息密度高，但也要警惕"文档即意图"：实现可能落后于文档。

## 十二、观察、风险与对自建工具链的启示

### 观察

1. **预览版迭代极快、明确破坏兼容**：rc.5 + "THERE WILL BE COMPATIBILITY-BREAKING CHANGES"；磁盘格式 bump-and-reject（旧格式拒绝不迁移，`SESSION_FORMAT_VERSION` 恒 0）；两个月里前门两次摇摆（readline → TUI → Web）、ACP 一次主动退化。**产品形状仍在快速漂移——按模式跟踪，别按版本追车**。
2. **复杂度换自由度，价格透明**：219 包、双 tsconfig aggregate、浏览器第二棵树、自研模块系统——为"运行时插件化 + 热重载 + 浏览器插件"付的全套账单，决策记录逐项列了成本。插件化是它的产品本身；对多数工具链，"可配置"比"可插件化"更划算。
3. **默认绑定自家生态**：默认 provider 是 DeepSeek API；模型无关靠 `ctx.llm` 适配器缝，但开箱体验与生态围绕自家 API；第三方插件生态（`dsh-plugin` topic）刚起步。
4. **vendored Cordis 双刃剑**：rescope + 私有补丁 = 上游演进自担；`vendor/` 同步有流程但仍是维护负担。
5. **hooks 兼容是子集兼容**：入参改写、硬停、loop-guard 均未实现。迁移既有 CC/Codex hooks 前先对照 Known Limitations。
6. **示例 ≠ 产品面**：`examples/` 的 6 个组合（acp-agent / headless-agent / jsonrpc-agent / mcp-memory / web-cordis / web-schedule）多为 keyless snapshot 载体与组装示范，不是产品承诺——TUI 即因"无 shipped composition"被整包删除。
7. **热度信号**：开源首日即破 3 万 star 说明"DeepSeek 牌 harness"有强市场关注，但关注度不等于稳定性。
8. **它是框架，不是产品**：dsh 的入口是 profile / headless / SDK / 插件体系——定位是"agent 的基础设施"（让生态在它上面建产品），而不是开箱即用的产品；Claude Code / Codex 则是后者的代表（一体式、无插件体系）。这解释了它为什么"文档比产品成熟"：框架先证明机制，产品才需要打磨体验。可以把它理解成"Agent 界的 Kubernetes"——当年 K8s 同样被批"太复杂、不是产品"，但作为基础设施赢了。插件化 vs 一体化是路线之争，胜负取决于场景：一体化的当下体验 vs 可组合的未来灵活性；而它附带的产品面（`dsh web`）是用框架思维做的产品，恰是"技术成熟 ≠ 产品成熟"批评的落点。

### 对自建 agent 工具链的启示

| 机制 | 启示 |
|---|---|
| 事件溯源会话 + 派生历史 | session 即 append-only 事件日志，消息历史从日志派生——回放 / 恢复 / telemetry 结构性免费，分叉结构性不可能 |
| surface replace 阴影 | 上下文压缩 = 追加一条带 `replace` 标记的汇总事件（`sourceEventSeqs` 引用被阴影事件）——压缩后回放仍确定，别改日志 |
| 元数据出日志（SessionHeader） | format version / cwd 是存储关注点，不是可回放状态——避免"每行日志都是状态"的教条 |
| 策略状态事件化（`sandbox/mode` + fold） | 权限/模式是日志事件 + findLast 折叠——重启免疫、会话隔离，零外部配置存储 |
| landlock-run：fail-closed + probe + denial 可辨识 + 一次更宽重试 | 进程沙箱的务实样板：静态二进制可直接 spawn；"沙箱拒了命令"与"沙箱坏了"必须可区分；grant 不持久化 |
| ACP automation-only | UI 职责与自动化协议分家；自动化契约只放最小文本 / 任务 / 权限面，会话归属与取消按精确对象隔离 |
| 四象限 RPC + rpcId 全链路 | 审批 / 问答帧稳定 id + 重连回放；方法表单一事实源，加方法 = 机械改动，错误码穷举即类型 |
| hooks 协议语义库 | matcher / 退出码 / merge 优先级（deny > ask > allow）是现成规格书；拒绝留持久审计事件；hook 配置加载失败 fail loud |

## 十三、更深一层：它服务的对象是模型自己

往更深一层看：它服务的对象可能既不是 C 端用户、也不是普通开发者——而是**模型自己**。让 harness 的一切都可替换、可卸载、可逆转，本质是为"agent 在运行中优化自己的 harness"铺路：自进化需要的不只是能力，而是**结构上允许被替换**。这个视角下，DSH 和 Prime Agent（同样主打 harness 自迭代）指向同一条路线——harness 从"用模型"变成"被模型改"。这也解释了它的设计为何对日常使用显得"过度"：那套复杂度不是为今天的人类用户准备的，是为明天的模型准备的。

## 结语

DeepSeek Harness 是一款"文档成熟度反常地高"的预览版——它的决策记录让外人能读懂每一个设计取舍的 why，这在开源 agent 工具里是稀缺品。事件溯源会话、surface 阴影压缩、fail-closed 沙箱、automation-only 的 ACP，这四样东西对任何自建 agent 工具链都有直接参考价值；而 219 包的插件化架构本身，是一道"要不要为自由度付费"的清醒判断题。

展望到 1.0，值得跟踪的几件事：磁盘格式是否冻结（`SESSION_FORMAT_VERSION` 何时离开 0）、hooks 已知缺口何时补齐（入参改写 / 硬停 / loop-guard）、Windows 沙箱链能否从 `partial` 毕业、`dsh-plugin` 生态能否长出第三方组合——这四件事分别对应稳定性、兼容性、安全边界与生态，恰好是预览版最容易被质疑的四点。

## 附录：获取与安装

```bash
# 即装即用（发布版，当前 0.1.0-rc.x）
npx @deepseek-ai/dsh web        # 启动 Web UI，默认 http://127.0.0.1:3080
npm install -g @deepseek-ai/dsh  # 或全局安装后直接敲 dsh

# 源码（含全部决策记录，适合跟迭代/研究）
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness && pnpm install && pnpm run build
pnpm dsh web

# 无头模式跑一次性任务
dsh --profile headless "运行项目测试并总结结果"
```

配置与数据默认在 `$DSH_HOME`（未设置时为 `~/.dsh`）：模型凭据、profile 补丁层、会话日志都在这里。注意：npm 发布版（rc.6）比仓库 master（rc.5）略新，以 npm 为准。

相关链接：[GitHub 仓库](https://github.com/deepseek-ai/deepseek-harness) · [官方站点](https://www.deepseek.com/harness/)（含四种预设模式说明：标准 / PTC / 极简 / 创造）· [Cordis 设计论文](https://github.com/cordiverse/paper)。

最后重复一遍文首的提醒：它开源首日破 3 万 star 说明关注度极高，但关注度不等于稳定性。对一个 rc.5 的预览版，最合理的态度是：**值得吸收的机制大胆吸收，需要兑现的承诺谨慎等待，下个版本见。**

