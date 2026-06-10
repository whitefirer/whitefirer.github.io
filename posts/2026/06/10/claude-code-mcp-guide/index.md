# Claude Code MCP 完全指南：给你的 AI 造工具


> 一个协议，三要素（Tool/Resource/Prompt），用自定义 MCP Server 扩展 Claude Code 的能力边界。

---

## 前言

[插件篇](/posts/2026/04/28/claude-code-plugins-guide/) 讲了四个必装插件和一个 MCP 服务。但那篇对 MCP 只摸了皮毛——装了一个 claude-context，提了一句"MCP 是外部工具连接器"。

本文把 MCP 彻底拆开：协议怎么跑、Tool/Resource/Prompt 分别干什么、怎么从零写一个 MCP Server、市场上哪些值得装、怎么防注入和越权。

更重要的是——把 MCP 放进四层架构里。如果说前三篇搭建了 Plugin → Hooks → Skill 三层，那 MCP 是更底层的那块砖：**Tool 层——Claude Code 能做什么的原子能力**。

---

## 1. MCP 在四层模型中的位置

回看系列的三层模型，现在把它扩成四层：

<svg id="four-layer-model" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 340" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="l4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="l3h" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="l2p" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="l1t" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#22d3ee"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.10"/></filter></defs><!-- Tool layer (bottom) --><g filter="url(#sh)"><rect x="40" y="264" width="600" height="66" rx="8" fill="#fff" stroke="#06b6d4" stroke-width="1.5"/><rect x="40" y="264" width="600" height="34" rx="8" fill="url(#l1t)"/><rect x="40" y="290" width="600" height="8" fill="url(#l1t)"/><circle cx="66" cy="281" r="11" fill="#fff" opacity="0.25"/><text x="66" y="286" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">①</text><text x="86" y="286" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Tool（内置 + MCP 扩展）</text><text x="292" y="286" fill="rgba(255,255,255,0.75)" font-size="11" font-family="system-ui,sans-serif">原子能力 — 能做什么</text><text x="56" y="320" fill="#374151" font-size="12" font-family="system-ui,sans-serif">内置 Read/Write/Bash + 自定义 MCP Tool。MCP 是用户扩展 Tool 的唯一入口。</text></g><!-- Arrow 1→2 --><line x1="340" y1="262" x2="340" y2="256" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,258 340,254 344,258" fill="#d1d5db"/><!-- Plugin/MCP layer --><g filter="url(#sh)"><rect x="40" y="192" width="600" height="62" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><rect x="40" y="192" width="600" height="34" rx="8" fill="url(#l2p)"/><rect x="40" y="218" width="600" height="8" fill="url(#l2p)"/><circle cx="66" cy="209" r="11" fill="#fff" opacity="0.25"/><text x="66" y="214" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">②</text><text x="86" y="214" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Plugin / MCP 服务</text><text x="260" y="214" fill="rgba(255,255,255,0.75)" font-size="11" font-family="system-ui,sans-serif">能力边界 — 外部能力注入</text><text x="56" y="244" fill="#374151" font-size="12" font-family="system-ui,sans-serif">Plugin 注入提示词 + Skill；MCP 服务暴露 Tool/Resource/Prompt 供模型调用。</text></g><!-- Arrow 2→3 --><line x1="340" y1="190" x2="340" y2="184" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,186 340,182 344,186" fill="#d1d5db"/><!-- Hooks layer --><g filter="url(#sh)"><rect x="40" y="120" width="600" height="62" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><rect x="40" y="120" width="600" height="34" rx="8" fill="url(#l3h)"/><rect x="40" y="146" width="600" height="8" fill="url(#l3h)"/><circle cx="66" cy="137" r="11" fill="#fff" opacity="0.25"/><text x="66" y="142" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui,sans-serif">③</text><text x="86" y="142" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">Hooks</text><text x="168" y="142" fill="rgba(255,255,255,0.75)" font-size="11" font-family="system-ui,sans-serif">自动化 — 什么时候触发</text><text x="56" y="172" fill="#374151" font-size="12" font-family="system-ui,sans-serif">在正确的时间触发正确的事。但不告诉模型"怎么做"。</text></g><!-- Arrow 3→4 --><line x1="340" y1="118" x2="340" y2="112" stroke="#d1d5db" stroke-width="1.5"/><polygon points="336,114 340,110 344,114" fill="#d1d5db"/><!-- Skill layer --><g filter="url(#sh)"><rect x="40" y="28" width="600" height="80" rx="8" fill="#fff" stroke="#10b981" stroke-width="2"/><rect x="40" y="28" width="600" height="38" rx="8" fill="url(#l4)"/><rect x="40" y="58" width="600" height="8" fill="url(#l4)"/><circle cx="66" cy="47" r="12" fill="#fff" opacity="0.25"/><text x="66" y="52" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">④</text><text x="88" y="52" fill="#fff" font-size="14" font-weight="700" font-family="system-ui,sans-serif">Skill</text><text x="162" y="52" fill="rgba(255,255,255,0.8)" font-size="11" font-family="system-ui,sans-serif">方法论 — 怎么做</text><rect x="526" y="33" width="102" height="22" rx="11" fill="#fff" opacity="0.20"/><text x="577" y="48" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">本文关联</text><text x="56" y="94" fill="#374151" font-size="12" font-family="system-ui,sans-serif">定义一套规范：先干啥、再干啥、不能干啥。这是行为编码。</text></g></svg>

前三篇文章已经把上面三层讲透了。本文讲底层：**Tool**。

注意第①层写了"内置 + MCP 扩展"。Claude Code 自带 Read、Write、Edit、Bash、Grep 等内置 Tool，但你**不能直接往里加新的**。要扩展 Tool，只有一条路——写一个 MCP Server，Claude Code 把你的 Tool 和内置 Tool 同等对待。

这就是 MCP 的真正角色：**不是"又一个外部服务连接器"，而是用户扩展 Tool 的唯一入口。**

---

## 2. MCP 是什么：一个协议，两种传输，三要素

MCP（Model Context Protocol）是 Anthropic 2024 年底发布的开放协议，官网 [modelcontextprotocol.io](https://modelcontextprotocol.io)。本质就是一句话：

> **MCP Server 暴露能力，MCP Client（Claude Code）发现并调用。**

协议层跑 JSON-RPC 2.0。传输层有两种：

| 传输 | 原理 | 适用场景 |
|------|------|---------|
| **stdio** | 父进程启动子进程，通过 stdin/stdout 通信 | 本地工具，最简单 |
| **HTTP（SSE）** | 远端 HTTP 服务，Server-Sent Events 推送 | 远程服务、多用户共享 |

99% 的个人 MCP Server 用 stdio，一行 `npx` 或 `python` 启动就行。

传输层本身是可扩展的——只要能在双向通道上跑 JSON-RPC 2.0，你用 WebSocket、gRPC、甚至自定义协议都行。官方只标准化了前两种，但没锁死。

**MCP Server 可以暴露三种东西：**

| 要素 | 是什么 | 例子 |
|------|-------|------|
| **Tool** | 模型可调用的函数 | `search_code(query)` → 返回匹配文件 |
| **Resource** | 模型可读取的数据 | `file:///project/README.md` → 返回文件内容 |
| **Prompt** | 预定义的提示词模板 | "Review this PR with focus on security" |

三者里 Tool 是主角。Resource 和 Prompt 是配角——有用，但不是每个 Server 都需要。

Tool 的抽象不挑底层。背后可以是 REST API、数据库查询、文件系统操作——也可以是 ESP32 的 GPIO 引脚、智能家居的继电器、机械臂的舵机。任何能封装成 JSON-RPC 接口的东西，都能变成 Claude Code 里的一个 Tool。IoT 设备只要跑得动一个 MCP Server，就和 Postgres MCP 没有区别。

也就是说，你可以用 Claude Code 这个 Agent 来充当工作和生活中的智能指挥中枢——调数据库、发 Issue、控灯光、查天气，都是同一个入口，都是同一个协议。

---

## 3. 动手写一个 MCP Server

最快的理解方式是写一个。用一个真实场景：**给 Claude Code 加一个"查天气"的 Tool**。

### 3.1 初始化

```bash
mkdir weather-mcp && cd weather-mcp
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript tsx @types/node
```

### 3.2 最简骨架

```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

// 注册一个 Tool
server.tool(
  "get_weather",                          // Tool 名称
  "Get current weather for a city",       // 描述——Claude 靠这个决定要不要调用
  { city: z.string().describe("City name in English, e.g. Tokyo") },
  async ({ city }) => {
    // 实际逻辑：调天气 API
    const temp = 22; // 示例数据
    return {
      content: [{
        type: "text",
        text: `${city}: ${temp}°C, sunny`,
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 关键：日志用 stderr，stdout 被 JSON-RPC 占用
  console.error("Weather MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

### 3.3 注册到 Claude Code

项目根目录创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "/home/user/projects/weather-mcp"
    }
  }
}
```

重启 Claude Code。现在你可以说：

> "东京今天什么天气？"

Claude Code 看到 `get_weather` 的描述里有 "weather" 和 "city"，自动匹配调用，拿到 `22°C, sunny`，回给你。

**就这么简单。** 你写了一个函数，注册到 MCP Server，Claude Code 就能调——和内置 Tool 一样。

### 3.4 再加一个 Resource

Tool 是"模型主动调"，Resource 是"模型按需读"：

```typescript
server.resource(
  "weather_cities",                      // Resource URI 标识
  "weather://supported-cities",          // 唯一 URI
  async () => ({
    contents: [{
      uri: "weather://supported-cities",
      text: "Tokyo, Beijing, London, New York",
    }],
  })
);
```

Claude Code 可以在任何对话中读取 `weather://supported-cities` 获取支持的城市列表。

### 3.5 最重要的事：Tool 描述

Tool 描述是你和模型之间唯一的界面。Claude Code 不读你的源码，不看你的注释——只读 `server.tool()` 的第二个参数。这个字符串决定了三件事：

1. **会不会被调用。** 描述和用户意图不匹配 → 模型不知道这 Tool 存在。
2. **什么时候被调用。** 描述模糊 → 该调的时候不调，不该调的时候乱调。
3. **参数长什么样。** Zod schema 的 `.describe()` 就是参数的说明书。

几个对比：

| 差的描述 | 好的描述 | 为什么 |
|---------|---------|--------|
| `"Query data"` | `"Get current weather by city name, returns temperature in Celsius and conditions (sunny/cloudy/rain)"` | 后者告诉模型"什么时候用我"和"我能给你什么" |
| `"Run command"` | `"Execute a shell command in the project root. Use for build, test, lint. NEVER use for destructive operations."` | 后者不仅说了能做什么，还说了**不能做什么** |
| `city: z.string()` | `city: z.string().describe("City name in English, e.g. 'Tokyo' or 'New York'")` | 带例子的参数描述大幅降低传参错误 |

**描述里写"不能做什么"和写"能做什么"一样重要。** 模型会试探边界——你不在描述里堵死，它就会越界。

写完 Tool 后测试：在 Claude Code 里用几种不同的说法描述同一个需求，看模型能不能匹配到你的 Tool。匹配不到 = 描述不够精确。

另外两条快速提醒：

**用 Zod 定义输入结构。** Zod schema 自动转成 JSON Schema 暴露给模型。字段的 `.describe()` 越精确越好。

**日志只走 stderr。** stdio 传输下 stdout 被 JSON-RPC 独占。`console.log()` 会污染协议通道导致 Server 断开，全部用 `console.error()`。

---

## 4. MCP 市场生态：从 10 个到 10,000+

截至 2026 年中，公开 MCP Server 超过 10,000 个。`modelcontextprotocol/servers` 官方仓库 86,000+ star。

不需要全装。按场景选：

### 4.1 写代码必装

| Server | 做什么 | 为什么必装 |
|--------|--------|-----------|
| **GitHub MCP** | PR 生命周期、Issue 管理、代码搜索 | Agent 要交代码就得碰 GitHub |
| **Context7** | 实时拉最新版本文档 | 消除 AI 幻觉——不再用过期 API |
| **Filesystem MCP** | 限定目录的读写 | 比裸 Bash 安全，有目录隔离 |

### 4.2 按技术栈选

| 场景 | Server | 做什么 |
|------|--------|--------|
| 后端 | Postgres / Supabase MCP | 直连数据库，自然语言查 schema |
| 测试 | Playwright MCP（Microsoft） | 无头浏览器，E2E 测试，UI 截图 |
| 前端 | Figma MCP | Design-to-Code，提取设计 tokens |
| 排错 | Sentry MCP | 拉完整调用栈 + 上下文 |
| 管理 | Linear / Jira MCP | Ticket → PR 闭环 |

### 4.3 五 Server 黄金组合

> **GitHub + Filesystem + Context7 + Playwright + 你团队的 Tracker**——覆盖 90% 日常场景，上下文消耗可控。

装太多会出问题——每个 Server 的 Tool 描述都要占上下文。社区反馈 15 个 Server 一开，30-40% 的窗口可能被 Tool 列表吃掉。五个刚好。

---

## 5. 安全：MCP 是把双刃剑

Tool 是能力的延伸，也是攻击面的扩展。一个 MCP Server 有文件系统权限 = Agent 可能被诱导删掉你的项目。这不是危言耸听。

### 5.1 五层防御模型

<svg id="mcp-security-layers" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 255" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="s1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#f87171"/></linearGradient><linearGradient id="s2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/></linearGradient><linearGradient id="s3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="s4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><linearGradient id="s5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient><filter id="sh2"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter></defs><!-- L5 outer --><g filter="url(#sh2)"><rect x="16" y="4" width="648" height="246" rx="12" fill="#f5f3ff" stroke="#a78bfa" stroke-width="1.2" stroke-dasharray="4,3"/><text x="36" y="26" fill="#7c3aed" font-size="12" font-weight="700" font-family="system-ui,sans-serif">L5 · 审计与可观测性</text><text x="36" y="44" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">结构化日志 / OpenTelemetry / SIEM / 不可篡改审计追踪</text></g><!-- L4 --><g filter="url(#sh2)"><rect x="44" y="46" width="592" height="196" rx="10" fill="#ecfdf5" stroke="#34d399" stroke-width="1.2" stroke-dasharray="4,3"/><text x="64" y="68" fill="#059669" font-size="12" font-weight="700" font-family="system-ui,sans-serif">L4 · 人在回路（Human-in-the-Loop）</text><text x="64" y="86" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">敏感操作需用户实时审批 / 时效令牌 / 操作前二次确认</text></g><!-- L3 --><g filter="url(#sh2)"><rect x="74" y="90" width="532" height="144" rx="9" fill="#eef2ff" stroke="#818cf8" stroke-width="1.2" stroke-dasharray="4,3"/><text x="94" y="112" fill="#4f46e5" font-size="12" font-weight="700" font-family="system-ui,sans-serif">L3 · 输入输出清洗</text><text x="94" y="130" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">参数校验 / 路径消毒 / SQL 注入防御 / PII 脱敏 / 出站代理过滤</text></g><!-- L2 --><g filter="url(#sh2)"><rect x="106" y="136" width="468" height="92" rx="8" fill="#fffbeb" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="4,3"/><text x="126" y="158" fill="#d97706" font-size="12" font-weight="700" font-family="system-ui,sans-serif">L2 · 最小权限</text><text x="126" y="176" fill="#6b7280" font-size="10" font-family="system-ui,sans-serif">Tool 级 RBAC / 只读模式 / 拒绝优先 + 显式白名单 / 参数范围限制</text></g><!-- L1 core --><g filter="url(#sh2)"><rect x="138" y="182" width="404" height="54" rx="8" fill="#fef2f2" stroke="#f87171" stroke-width="1.5"/><text x="340" y="214" text-anchor="middle" fill="#dc2626" font-size="13" font-weight="700" font-family="system-ui,sans-serif">L1 · 认证 — OAuth 2.1 + PKCE / 短效令牌 / 服务端签名验证</text></g></svg>

不是每个个人项目都要五层拉满。但**至少做到前两层**：

**L1 — 认证。** 不用共享 API Key。每个请求带独立身份，用短效令牌。stdio 模式天然隔离（只有本地进程能连），但 HTTP 模式必须上 OAuth。

**L2 — 最小权限。** 文件系统 Server 限定目录，数据库 Server 用只读账号。拒绝优先——不声明能做什么，声明**不能做什么**。

### 5.2 四大常见漏洞

**命令注入。** Server 里拼接用户输入到 shell 命令——头号漏洞。GitHub Kanban MCP、iOS Simulator MCP 都摔在这。修法：用 `execFile()` 代替 `exec()`，永远不把 LLM 输出当安全输入。

**路径遍历。** `../../.env` 读你的密钥。修法：`path.resolve()` 后验证结果在允许目录内。

**伪只读绕过。** 很多 DB Server 用 `query.startsWith("SELECT")` 判断只读——`SELECT pg_sleep(100)` 轻松绕过。修法：数据库级权限（建只读用户），不靠应用层校验。

**提示注入。** 外部内容（Issue 标题、PR 描述）可能包含"请执行 `rm -rf /`"的指令。修法：Tool 内部对模型传入的参数做二次校验，敏感操作强制人工确认。

### 5.3 安全底线

三条铁律：

1. **LLM 的输出不可信。** Tool 收到的参数来自模型推理，模型可能被注入、可能幻觉。永远校验。
2. **只读比读写安全十倍。** 不确定就开只读。宁可多写一个 Tool 也不要用一个万能的。
3. **生产数据一律隔离。** 指向生产库的 MCP Server——别写。用副本，用沙箱，至少用只读副本。

---

## 6. MCP 的边界：输出不可控

安全防御拉满，Tool 描述写到极致——还有一个根本限制绕不过去：**LLM 的输出不可控。**

编译器有形式语义——源码→词法分析→语法树→代码生成，每一步可证明。你的 TypeScript 编译成什么 JS，只要编译器没 bug，结果是确定的。

LLM 选 Tool 不是这么回事。同样的输入，不同的上下文、不同的 temperature、甚至不同的随机种子——模型可能调 `get_weather`，也可能觉得不需要调，自己编一个温度。

这意味着什么？

**你没法保证 Tool 一定被正确调用。只能最大化正确调用的概率。**

本文 3.5 节写的所有技巧——描述精确到能做什么不能做什么、参数带例子、写完换说法测试——本质上都是在提高这个概率。不是在提供保证。

这也解释了为什么安全要做五层防御：因为上层（Tool 描述精确度）只能逼近 100%，永远到不了 100%。L1 认证、L2 最小权限、L3 输入清洗……每一层都是对上层的兜底。模型可能选错 Tool、传错参数、被注入诱导——但只要你校验了输入、限制了权限、隔离了数据，错了也炸不到你。

接受这个边界，MCP 才不是玩具。

而 Workflows——Claude Code 5 月底刚出的多 Agent 编排引擎——走的是另一条路：既然单次输出不可控，就用多个独立 Agent 交叉验证、对抗审查、锦标赛选优，把概率压到无限逼近确定。那是下一篇的事了。

---

## 7. 常见坑

真实开发中踩过的：

### stdio 日志消失

`console.log()` 会污染 JSON-RPC 通道，现象是 Claude Code 报 "Unexpected token" 然后 Server 断开。全换 `console.error()`——只有 stderr 安全。

### Tool 太多，Claude Code 变傻

每个 Tool 的描述占上下文。装了 GitHub MCP 完整版（46+ Tool）+ 几个大 Server，Claude Code 开会话先吞掉 30-40% 窗口。**控制在 5 个以内**，优先选远程托管版（Tool 更少、更聚焦）。

### 环境变量不生效

`.mcp.json` 里的 `env` 字段可以传环境变量：

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "API_KEY": "${MY_API_KEY}" }
    }
  }
}
```

注意 `${}` 语法引用的是**宿主机**环境变量，不是 Claude Code 的。配错了 Server 静默失败。

### npx 每次都装

`npx tsx` 每次启动会检查更新，拖慢启动速度。生产级 Server 用 `node dist/index.js`，先 `tsc` 编译好再跑。

---

## 8. 结语：四层凑齐了

回过头来看这个系列现在覆盖了 Claude Code 的完整技术栈：

| 层 | 主题 | 核心问题 | 核心答案 |
|---|------|---------|---------|
| ① Tool | MCP | 能做什么？ | 内置 + 自定义 MCP Tool——原子能力 |
| ② Plugin | 插件 | 装什么？ | 装备——压缩输出、记忆复用、语义搜索 |
| ③ Hooks | Hooks | 什么时候触发？ | 事件驱动，自动执行 |
| ④ Skill | Skill | 怎么做？ | 方法论——行为编码，经验模块化 |

从底层 Tool（MCP 扩展）到顶层 Skill（行为契约），四层叠在一起：**Tool 给手脚，Plugin 给装备，Hooks 给神经反射，Skill 给大脑皮层。**

装完插件，配好 Hooks，写好 Skill，再写两个自己用的 MCP Server——Claude Code 不再是个"终端里的 AI 助手"，你是在用它搭自己的开发平台。

---

*感谢阅读。*

