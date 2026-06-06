# Claude Code Hooks 完全指南：事件驱动的 AI 编程自动化


> 九种 Hook 类型 + 十一个秒用场景，把 Claude Code 从工具变成搭档。

---

## 前言

之前写了[《Claude Code 插件完全指南》](/posts/claude-code-plugins-guide/)，介绍四个插件和一个 MCP 服务。那是"用什么"的问题。

本文解决"怎么自动化"的问题：**Hooks 系统**。

Hooks 是 Claude Code 的事件驱动脚本机制——在工具调用、会话启停、权限请求等节点执行自定义逻辑。如果你用过 Git hooks 或 GitHub Actions，概念完全一样。

读完你会知道：九种 Hook 分别干什么，怎么配，以及十一个让你想立刻动手的妙用场景。

---

## 基础：Hook 怎么配

所有 Hook 配置在 `.claude/settings.json`（项目级）或 `~/.claude/settings.json`（用户级）的 `hooks` 字段下。

结构长这样：

```json
{
  "hooks": {
    "HookType": [
      {
        "matcher": "Tool1|Tool2",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /path/to/your_script.py"
          }
        ]
      }
    ]
  }
}
```

`matcher` 决定拦截哪些工具调用（`Bash|Write|Edit` 表示只对这三个工具生效）。设为空字符串表示匹配所有。Hook 脚本从 stdin 读 JSON 获取上下文信息，exit 0 表示放行，exit 2 表示阻止（仅部分 Hook 类型支持）。

---

## 九种 Hook 类型

### SessionStart — 会话启动时

最早执行的 Hook。caveman 插件就是靠它注入 caveman 模式提示词。

```json
{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": "bash /path/to/startup.sh"
  }]
}
```

传入的上下文：`session_id`、`cwd`、`model` 等。可以用来初始化环境变量、检查依赖、注入提示词。

### UserPromptSubmit — 用户提交消息时

每次你按回车发送消息，这个 Hook 触发。可以在消息进入 Claude 之前附加上下文。

```json
{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": "python3 /path/to/inject_context.py"
  }]
}
```

传入信息包含用户的原始消息内容。脚本可以通过 stdout 返回 `hookSpecificOutput` 注入额外文本。

### PreToolUse — 工具调用前

最实用的 Hook 之一。可以在工具执行前拦截、修改或阻止调用。

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "command": "python3 /path/to/pre_check.py"
  }]
}
```

传入 `tool_name`、`tool_input`。exit 2 阻止操作，exit 0 放行。

### PostToolUse — 工具调用后

工具执行完立即触发。传入完整的执行结果，包括 `duration_ms`、`stdout`、`exit_code` 等。

```json
{
  "matcher": "Bash|Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "python3 /path/to/post_process.py"
  }]
}
```

这是实现"长时间任务通知"的核心 Hook。

### PermissionRequest — 权限请求时

Claude Code 弹出权限对话框之前触发。xiaozhi MCP 用它来记录权限请求日志。

```json
{
  "matcher": "Bash|Write|Edit",
  "hooks": [{
    "type": "command",
    "command": "python3 /path/to/perm_hook.py"
  }]
}
```

可以用来实现自定义的权限策略：白名单自动放行、危险操作二次确认。

### Notification — 收到通知时

两种触发方式。一是 `permission_prompt` matcher：Claude Code 弹出权限对话框前触发，JSON 携带 `tool_name`、`tool_input`、`session_id`、`cwd`——你可以在权限请求到达屏幕之前先拿到上下文。二是外部系统推送：cron 或 CI webhook 通过通知机制向 Claude Code 发送消息。场景三会用第一种方式做本地桌面弹窗，场景七用第二种做远程审批。

### Stop — 响应结束时

Claude 回复完毕、进入等待状态时触发。适合做清理、保存状态、更新状态栏。

### SubagentStop — 子代理结束时

使用 Agent 工具启动的子代理完成时触发。

### PreCompact — 上下文压缩前

上下文接近窗口上限、触发自动压缩前执行。可以在这里抢救关键信息，防止压缩丢失上下文。

---

## 十一个秒用场景

### 场景一：自动格式化 + 刷新

写完代码 → 自动格式化 → 自动刷新浏览器。一步不落。

```python
# post_tool_hook.py — PostToolUse，matcher: Write|Edit
import json, sys, subprocess, os

data = json.loads(sys.stdin.read())
file_path = data.get("tool_input", {}).get("file_path", "")

if file_path.endswith((".py", ".ts", ".tsx", ".json")):
    subprocess.run(["npx", "prettier", "--write", file_path], timeout=10)

# Hugo 博客：markdown 变更时刷新浏览器
if file_path.endswith(".md"):
    subprocess.run(["touch", ".hugo_build_trigger"])  # 触发 air 重载

sys.exit(0)
```

配一次，之后写代码再也不用想格式化的事。

### 场景二：危险命令拦截

防呆不防傻。PreToolUse 在 Bash 执行前拦截高危操作。

```python
# pre_tool_guard.py — PreToolUse，matcher: Bash
import json, sys

data = json.loads(sys.stdin.read())
cmd = data.get("tool_input", {}).get("command", "")

DANGER = [
    "rm -rf /",
    "git push --force main",
    "git push --force master",
    "DROP TABLE",
    "DROP DATABASE",
    "> /dev/sda",
]

for pattern in DANGER:
    if pattern in cmd:
        # 向 Claude 返回阻止信息
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"危险命令已拦截: {pattern}"
            }
        }))
        sys.exit(2)

sys.exit(0)
```

不影响正常工作流，只在真正危险时亮红灯。

### 场景三：本地桌面通知 — 权限请求带上命令内容

前面两个场景分别管格式化和安全，都是"拦住 Claude"的逻辑。这个场景反过来——让 Claude 找你的时候，你能看到它在要什么。

飞书推送（场景四、五、八）适合远程场景，但多数时候你就坐在电脑前。Linux 桌面栈（`notify-send` + `paplay`）零依赖、零延迟，是最直接的落地方式。

配两条 Hook：Notification 拦截权限请求，Stop 响应任务完成。一条脚本两件事，按 `hook_event_name` 分派：

```python
#!/usr/bin/env python3
# notify-hook — Notification (permission_prompt) + Stop
import json, os, subprocess, sys
from datetime import datetime

SOUND_DIR = "/usr/share/sounds/freedesktop/stereo"

def notify_send(title, body):
    subprocess.run(["notify-send", title, body], timeout=5)

def paplay(path):
    subprocess.Popen(["paplay", path], stderr=subprocess.DEVNULL)

def ellipsis(s, n=80):
    return s if len(s) <= n else s[: n - 3] + "..."

data = json.loads(sys.stdin.read())
event = data.get("hook_event_name", "")

if event == "Notification":
    tool = data.get("tool_name", "?")
    inp = data.get("tool_input", {})
    detail = ""
    if tool == "Bash":
        detail = ellipsis(inp.get("command", ""), 100)
    elif tool in ("Write", "Edit"):
        detail = os.path.basename(inp.get("file_path", ""))
    elif tool == "WebSearch":
        detail = ellipsis(inp.get("query", ""), 100)

    notify_send(f"Claude Code 需要授权 — {tool}", detail)
    paplay(f"{SOUND_DIR}/dialog-information.oga")

elif event == "Stop":
    ts = data.get("timestamp", "")
    time_str = ""
    if ts:
        try:
            t = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
            time_str = t.strftime("%H:%M:%S")
        except (ValueError, TypeError):
            pass
    notify_send("Claude Code 任务完成", time_str)
    paplay(f"{SOUND_DIR}/complete.oga")
```

配置 hooks：

```json
{
  "hooks": {
    "Notification": [{
      "matcher": "permission_prompt",
      "hooks": [{
        "type": "command",
        "command": "python3 /path/to/notify-hook",
        "async": true
      }]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "python3 /path/to/notify-hook",
        "async": true
      }]
    }]
  }
}
```

数据流很简单——Hook 负责把 JSON 从 Claude Code 管道丢给脚本，脚本按事件类型拆两路，分别拼消息、播音效：

{{< mermaid >}}
flowchart LR
    A[Claude Code<br/>Hook 触发] -->|stdin JSON| B[notify-hook]
    B -->|hook_event_name| C{事件分派}
    C -->|Notification| D[取 tool_name<br/>tool_input]
    C -->|Stop| E[取 timestamp]
    D -->|拼消息| F["notify-send<br/>需要授权 — Bash: ..."]
    E -->|拼消息| G["notify-send<br/>任务完成 · 20:30:00"]
    F --> H[paplay 提示音]
    G --> I[paplay 完成音]
{{< /mermaid >}}

核心只有一步——`json.loads(sys.stdin.read())` 拿到完整上下文，然后按 `tool_name` 从 `tool_input` 里取对应字段拼消息。这和场景二取 `command`、场景一取 `file_path` 的模式完全一致。Notification Hook 的 JSON payload 结构跟 PreToolUse 相同，学会取一次，所有 Hook 的通知识别都照这个模式来。

需要远程推送时再看场景四（飞书）。坐电脑前，本地弹窗够用。

### 场景四：长时间任务飞书通知

Bash 跑了超过 5 分钟 → 飞书机器人推消息到你手机上。不需要盯着终端。

```python
# long_task_notify.py — PostToolUse，matcher: Bash
import json, sys, os, threading

THRESHOLD = int(os.getenv("NOTIFY_THRESHOLD_SEC", "300"))
WEBHOOK = os.getenv("FEISHU_WEBHOOK", "")

data = json.loads(sys.stdin.read())
duration_s = data.get("duration_ms", 0) / 1000

if duration_s < THRESHOLD or not WEBHOOK:
    sys.exit(0)

tool = data.get("tool_name", "")
cmd = data.get("tool_input", {}).get("command", "")[:80]

def send():
    try:
        import requests
        requests.post(WEBHOOK, json={
            "msg_type": "text",
            "content": {"text": f"⏰ Claude Code 任务完成\n工具: {tool}\n耗时: {duration_s:.0f}s\n命令: {cmd}"}
        }, timeout=5)
    except Exception:
        pass

threading.Thread(target=send, daemon=True).start()
sys.exit(0)
```

关键点：daemon 线程 + timeout=5，主进程立刻退出，HTTP 调用不阻塞 Claude Code。

### 场景五：空闲超时飞书通知

有时候不是你盯着 Claude Code 等它，而是它在等你——你切出去干别的，忘了回来。空闲超过 5 分钟，飞书推你。

这个场景需要 Stop Hook + 后台检测器配合：Stop 记录最后活跃时间，同时启动一个延迟检查器，5 分钟后如果时间戳没更新（没有新的 Stop 事件），说明你离开了。

```python
# idle_notify.py — Stop hook，matcher: ""
import json, sys, os, time, subprocess

TIMESTAMP_FILE = "/tmp/claude-last-stop"
THRESHOLD = int(os.getenv("IDLE_THRESHOLD_SEC", "300"))
WEBHOOK = os.getenv("FEISHU_WEBHOOK", "")

now = time.time()
with open(TIMESTAMP_FILE, "w") as f:
    f.write(str(now))

if not WEBHOOK:
    sys.exit(0)

# 后台检测脚本：睡 threshold 秒后检查时间戳是否未变
checker = f'''
import time, requests
webhook = {repr(WEBHOOK)}
threshold = {THRESHOLD}
last_active = {now}

time.sleep(threshold)
try:
    with open("{TIMESTAMP_FILE}") as f:
        current = float(f.read().strip())
    if current == last_active:
        idle_min = threshold // 60
        requests.post(webhook, json={{
            "msg_type": "text",
            "content": {{"text": f"🫥 Claude Code 空闲超过 {{idle_min}} 分钟，你还在吗？"}}
        }}, timeout=5)
except Exception:
    pass
'''

subprocess.Popen(
    ["python3", "-c", checker],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    start_new_session=True,   # daemonize，不随 Stop hook 退出
)
sys.exit(0)
```

核心技巧：`start_new_session=True` 让子进程脱离 Stop hook 的生命周期独立运行。每次 Claude 回复完毕触发 Stop，覆盖时间戳并重新启动一个检测器。如果连续 5 分钟没有新回复，上一次的检测器就会发通知。

和场景四配合：场景四通知你"活干完了"，场景五通知你"你人跑了"。

### 场景六：自动注入状态快照

每次发消息，Claude 自动看到当前 git 状态和最近操作日志。不需要你手动 `git status`。

```python
# inject_git_status.py — UserPromptSubmit，matcher: ""
import json, sys, subprocess, os

def run(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, timeout=5).strip()
    except Exception:
        return ""

git_status = run("git status --short")
git_log = run("git log --oneline -3")

context = ""
if git_status:
    context += f"Git 状态:\n{git_status}\n"
if git_log:
    context += f"最近提交:\n{git_log}"

if context:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": context
        }
    }))

sys.exit(0)
```

效果：Claude 始终知道工程的 git 状态，回答更准确，不需要你重复描述上下文。

### 场景七：PreCompact 防上下文丢失

上下文压缩是 Claude Code 的自动机制，但可能丢掉关键任务信息。PreCompact Hook 在压缩前把当前任务状态写到一个恢复文件，压缩后 Claude 可以通过它找回方向。

```python
# save_context.py — PreCompact，matcher: ""
import json, sys, os

data = json.loads(sys.stdin.read())

# 把当前任务摘要写到恢复文件
backup = {
    "session_id": data.get("session_id"),
    "cwd": data.get("cwd"),
    "trigger": "pre_compact",
    "timestamp": data.get("timestamp")
}

with open("/tmp/claude-context-backup.json", "w") as f:
    json.dump(backup, f)

sys.exit(0)
```

配合 SessionStart Hook 读取这个备份文件，可以实现跨压缩的任务连续性。

### 场景八：远程审批推送

Hooks 的长链玩法：不只通知，还能让你在手机上直接审批 Claude Code 的权限请求。

原理不复杂——Hook 只做第一步拦截，后面交给一个服务端处理全链路。

{{< mermaid >}}
sequenceDiagram
    participant H as PermissionRequest Hook
    participant S as 服务端
    participant F as 飞书/App
    participant U as 你（手机）
    participant P as PTY
    participant C as Claude Code

    H->>S: POST /permission-request
    S->>F: 推送审批卡片/通知
    F->>U: 显示 [批准] [拒绝]
    U->>F: 点击按钮
    F->>S: 回调审批结果
    S->>P: 写入 "1" 或 "3"
    P->>C: 按键注入，对话框关闭
{{< /mermaid >}}

换成流程图视角，数据流向是这样的：

{{< mermaid >}}
flowchart TD
    A[PermissionRequest Hook] -->|写文件 / 调接口| B["服务端 Python/Go/Node"]
    B -->|推送审批卡片| C[飞书交互卡片]
    B -->|推送通知| D["自建 App WebSocket"]
    C -->|点击按钮| E["你 手机审批"]
    D -->|点击按钮| E
    E -->|回调审批结果| B
    B -->|注入按键| F[PTY]
    F -->|按键 1 批准 3 拒绝| G["Claude Code 继续 / 中断"]
{{< /mermaid >}}

文字版（ASCII）：

```
PermissionRequest Hook → 写请求到文件或调接口
                            ↓
                    服务端（Python/Go/Node，跑在本机）
                            ↓
                  ┌────────┴────────┐
                  ↓                  ↓
            飞书交互卡片         自建 App (WebSocket)
                  ↓                  ↓
           你在手机上点 [批准] / [拒绝]
                  ↓
           服务端收到回调
                  ↓
         PTY 向终端会话输入 "1" 或 "3"
                  ↓
        Claude Code 收到按键，继续 / 中断
```

Hook 脚本只需把权限请求转交给服务端：

```python
# perm_forward.py — PermissionRequest，matcher: Bash|Write|Edit
import json, sys, requests, os

SERVER = os.getenv("APPROVAL_SERVER", "http://127.0.0.1:9999")
data = json.loads(sys.stdin.read())

# 转交服务端，不等响应
try:
    requests.post(f"{SERVER}/permission-request", json={
        "tool": data.get("tool_name"),
        "hint": data.get("tool_input", {}).get("command", "")[:120],
        "session_id": data.get("session_id"),
    }, timeout=2)
except Exception:
    pass

# Hook 不做审批决策，让 Claude Code 弹原生对话框
# 服务端通过 PTY 在后台替你按键
sys.exit(0)
```

Hook 退出了，但 Claude Code 原生权限弹窗还在等。这时候服务端已经拿到请求数据，推送到了你的手机上——飞书卡片也好，自建 App 的通知栏也好。你点一下按钮，服务端收到回调，通过 PTY 向终端会话注入一个 `1`（批准）或 `3`（拒绝），对话框关闭，Claude Code 继续干活。

飞书方案适合已有飞书工作流的团队，零客户端成本。自建 App 方案更轻量，WebSocket 长连接延迟更低。无论哪种，Hooks 做的都是第一环——**把权限请求从终端里拽出来，丢到你能触达的地方**。

这模式不止用于权限审批。PreToolUse 拦截危险命令可以推，PostToolUse 长时间任务可以推，Stop 空闲提醒已经在场景五推了。把推送逻辑统一交给服务端，每个 Hook 只负责"触发事件"这一件事。

### 场景九：敏感文件保护

场景二拦截的是危险命令。但 Claude 还有一个能力是直接写文件——如果它误改了 `.env`、删了 SSH 密钥，命令拦截管不到。PreToolUse 配合 `Write|Edit` matcher 可以补上这个缺口。

```python
# file_guard.py — PreToolUse，matcher: Write|Edit
import json, sys

data = json.loads(sys.stdin.read())
file_path = data.get("tool_input", {}).get("file_path", "")

PROTECTED = [
    ".env", ".env.local", ".env.production",
    "secrets.yaml", "credentials.json",
    "*.pem", "*.key", "id_rsa",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
]

for pattern in PROTECTED:
    if pattern.replace("*", "") in file_path:
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"受保护文件，禁止直接修改: {file_path}"
            }
        }))
        sys.exit(2)

sys.exit(0)
```

和场景二一起配，Bash + Write/Edit 两条 PreToolUse 规则，一个管命令一个管文件，安全兜底就完整了。

### 场景十：命令审计日志

PostToolUse 在每次 Bash 执行后追加一条记录到审计日志。出问题时复现、排查误操作、分析 Claude 的命令习惯，全靠这条日志。

```python
# audit_log.py — PostToolUse，matcher: Bash
import json, sys, os
from datetime import datetime

data = json.loads(sys.stdin.read())
cmd = data.get("tool_input", {}).get("command", "")
duration = data.get("duration_ms", 0) / 1000
exit_code = data.get("exit_code", -1)

log_line = (
    f"[{datetime.now().isoformat()}] "
    f"exit={exit_code} "
    f"duration={duration:.1f}s "
    f"cmd={cmd[:200]}\n"
)

log_path = os.path.expanduser("~/.claude/bash-audit.log")
with open(log_path, "a") as f:
    f.write(log_line)

sys.exit(0)
```

跑一阵子后 `cat ~/.claude/bash-audit.log` 就能看到 Claude 都执行了什么、哪些慢、哪些容易失败。安全审计 + 性能诊断两用。

### 场景十一：Stop 强制验证——"不跑通不下班"

前面的场景是"做完了通知你"和"你忘了回来提醒你"。这个场景反过来——Claude 想结束响应？先自检：代码改了吗？测试跑了吗？构建通过了吗？

用 Stop hook 的 `prompt` 类型，让 LLM 自己审查本轮对话：

```json
{
  "matcher": "",
  "hooks": [{
    "type": "prompt",
    "prompt": "Review the last assistant response. If any code files were modified or created during this session: 1) Were tests run and did they pass? 2) Did the build succeed? 3) Were all user questions answered? If any check fails, return 'block:<reason>' explaining what's still needed. If all pass, return 'approve'."
  }]
}
```

`prompt` 类型的好处是不需要你写复杂的检测脚本——让 LLM 自己判断。返回 `block` 就阻止 Claude 结束，它会被迫回去修。返回 `approve` 正常结束。

三个检查项可以按项目定制。如果是 Hugo 博客项目，检查改成"文章能不能正常渲染"；如果是 API 服务，改成"接口能不能返回 200"。本质是把"完成标准"写进规则里，让 Claude 自己对照检查。

---

## 插件：Hooks 的打包形态

上面十一个场景都是自定义 Hook 脚本。但如果你留意过自己装的插件，会发现很多插件本质上就是打包好的 Hooks。

以你环境里实际跑着的为例：

**caveman 插件** — 两个 Hook 驱动：
- `SessionStart` — 会话启动时注入 caveman 模式提示词，压缩 Claude 输出风格
- `UserPromptSubmit` — 每次提交消息时维持模式不退化，防止多轮对话后 Claude 恢复啰嗦

**hookify 插件** — 自动化规则生成：
- `Stop` hook — 每次响应结束后分析对话，如果发现"这个行为应该被禁止"，自动建议创建新 Hook 规则。Hook 自己进化 Hook，元 Hook。

**superpowers 插件** — 多 Hook 工作流编排：
- `SessionStart` → 加载 TDD、debugging、brainstorming 等开发方法论的提示词
- `UserPromptSubmit` → 检测用户意图，自动匹配对应 Skill 并加载
- `Stop` → 完成检查点验证，确保开发流程不跳步

你会发现这些插件做的事情和前面十一个场景本质上一样——Hook 拦截事件，注入逻辑。区别只在于插件把这些 Hook + Skills + 提示词打包好，你可以开箱即用；而自定义 Hook 脚本是给你最灵活的底层能力，配一次想怎么玩都行。

选插件还是自己写？简单法则：**重复出现的通用流程 → 找插件。一次性特定需求 → 自己写 Hook。两者不互斥——插件管大流程，自定义 Hook 补边角。**

---

## 组合拳：推荐配置

从十一种场景里挑最值的七条，这是我的推荐：

1. **PreToolUse** — 危险命令拦截 + 敏感文件保护（场景二 + 九，合并一条规则）
2. **PostToolUse** — 自动格式化 + 审计日志（场景一 + 十）
3. **Notification + Stop** — 本地桌面通知（场景三，Linux 桌面首选，不需要飞书等外部依赖）
4. **PostToolUse** — 长任务飞书通知（场景四，改 Slack/钉钉同理）
5. **Stop** — 空闲超时飞书通知（场景五）
6. **UserPromptSubmit** — git 状态注入（场景六）
7. **Stop** — 强制验证（场景十一，宽松起步）

远程审批（场景八）需要额外服务端，PreCompact（场景七）按需启用，先不放进基础配置。

全部配在 `~/.claude/settings.json`，一次配置，所有项目生效。场景十一的 Stop 强制验证可以先从宽松规则开始——只检查"测试跑没跑"，不检查通过率——等 Claude 习惯了再收紧。

---

## 注意事项

Hooks 脚本在 Claude Code 进程内同步执行（除非设置 `parallel: true`）。脚本出错不会影响 Claude Code 运行——exit 非零只是丢弃本次事件。但脚本卡死是可能的，务必加 timeout。

对于网络请求（飞书通知、日志上报），用 daemon 线程 + timeout 避免阻塞。

另外 Hooks 脚本的日志不会显示在 Claude Code 界面里——调试时写文件日志，或直接 `python3 script.py` 在终端单独跑。

---

## 结语

Hooks 本质是把 Claude Code 从"被动的对话工具"变成"可编程的自动化平台"。如果说插件扩展了 Claude 的能力边界，那 Hooks 扩展的是**工作流的自动化边界**。

每个 Hook 脚本不超过 30 行代码，配一次，受益终身。试过飞书通知之后，你就回不去了。

---

