# Claude Code 隐写后门事件：当你信任的工具开始欺骗你


> 我写了六篇文章教你用好 Claude Code。现在它用 Unicode 隐写标记你是中国用户、用 XOR 91 加密你的环境信息。我不得不进行分析并写下了这篇。

---

## 前言

今年 3 月 31 日，Anthropic 因为一次 npm 打包失误，把 Claude Code v2.1.88 的 512,000 行 TypeScript 源代码整个暴露在了公开网络上——1,906 个源文件，内部代号、沙箱实现、Hook 引擎，一览无余。中国开发者社区称之为"AI 界第一次核泄漏"[^1]。

当时大部分人关注的，是代码里那些内部代号和未公开功能。但真正让人后背发凉的发现，来自后续版本的持续反编译：**Claude Code 从 v2.1.91 开始，在用户毫不知情的情况下，通过 Unicode 隐写方式标记中国用户的环境信息并回传给 Anthropic 服务器。**

4 月 20 日，全球最权威的网络威胁框架 MITRE ATT&CK 正式收录了编号为 C0062 的攻击活动，命名为"Anthropic AI-orchestrated Campaign"[^2]。同一份记录列出了 26 种 ATT&CK 战术/技术，覆盖从侦察到数据外泄的完整攻击链。

我把这件事的技术细节核实了多遍。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 120" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter></defs><rect x="30" y="40" width="80" height="24" rx="12" fill="#6366f1"/><text x="70" y="56" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">3月31日</text><text x="70" y="80" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">源码泄漏</text><line x1="110" y1="52" x2="178" y2="52" stroke="#d1d5db" stroke-width="1.5"/><polygon points="175,49 180,52 175,55" fill="#d1d5db"/><rect x="185" y="40" width="80" height="24" rx="12" fill="#f59e0b"/><text x="225" y="56" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">4月2日</text><text x="225" y="80" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">v2.1.91 植入</text><line x1="265" y1="52" x2="333" y2="52" stroke="#d1d5db" stroke-width="1.5"/><polygon points="330,49 335,52 330,55" fill="#d1d5db"/><rect x="340" y="40" width="88" height="24" rx="12" fill="#ef4444"/><text x="384" y="56" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">4月20日</text><text x="384" y="80" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">MITRE C0062</text><line x1="428" y1="52" x2="496" y2="52" stroke="#d1d5db" stroke-width="1.5"/><polygon points="493,49 498,52 493,55" fill="#d1d5db"/><rect x="503" y="40" width="80" height="24" rx="12" fill="#10b981"/><text x="543" y="56" text-anchor="middle" fill="#fff" font-size="10" font-weight="600" font-family="system-ui,sans-serif">6月下旬</text><text x="543" y="80" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">Reddit 发现</text><rect x="20" y="96" width="640" height="18" rx="4" fill="#f3f4f6"/><text x="340" y="109" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">3个月，从隐蔽植入到全球曝光</text></svg>
<figcaption class="image-caption">图 1：事件时间线</figcaption>
</figure>

截止到 2026 年 7 月 1 日，Anthropic 官方尚未对本次隐写检测事件做出公开回应。

下面客观还原它到底做了什么、怎么做的，然后讲为什么这件事对你的影响比 Fable 5 提示词泄漏大得多。

---

## 1. 它到底做了什么

反编译确认的代码逻辑分三步[^3]：

### 第一步：身份检测

检查三个维度的环境指纹：

| 检测点 | 具体逻辑 |
|--------|---------|
| 系统时区 | 匹配 `Asia/Shanghai`、`Asia/Urumqi` |
| `ANTHROPIC_BASE_URL` | 检查这个环境变量的 hostname 是否指向中国域名或代理站 |
| 代理 URL | 解析 `HTTP_PROXY`/`HTTPS_PROXY`，检查是否指向中国域名 |
| AI 服务 endpoint | 检查是否配置了 DeepSeek、智谱、月之暗面、百川、MiniMax 等中国 AI 实验室的 API 端点 |

内置黑名单包含 **147 个**中国相关域名，涵盖主流 AI 实验室、云服务商、代理服务[^4]。

### 第二步：信息编码

如果判定了用户身份，不是明文上报——是用**隐写**（steganography）：

- 中国时区 → 系统提示词中的日期格式从 `2026-06-30` 静默变为 `2026/06/30`
- 不同代理类型 → 用 3 种不同的 Unicode 撇号字符区分标记：`’`（右单引号，`U+2019`）、`ʼ`（修饰字母撇号，`U+02BC`）、`ʹ`（修饰字母撇号，`U+02B9`）
- 这些字符差别人眼几乎无法分辨，但对 API 来说是不同的编码点

也就是说，你截下 Claude Code 发出的 API 请求，乍看是一段正常的系统提示词，但其中的日期分隔符和撇号字符实际携带了你的三维身份标签。

<figure>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 135" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><filter id="sh2"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.08"/></filter><marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#9ca3af"/></marker></defs><!-- Step 1 --><g filter="url(#sh2)"><rect x="20" y="10" width="190" height="52" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><text x="115" y="32" text-anchor="middle" fill="#6366f1" font-size="11" font-weight="700" font-family="system-ui,sans-serif">本地检测</text><text x="115" y="50" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">时区 + 代理 + AI 实验室</text></g><line x1="210" y1="36" x2="240" y2="36" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#arrow)"/><!-- Step 2 --><g filter="url(#sh2)"><rect x="245" y="10" width="190" height="52" rx="8" fill="#fff" stroke="#f59e0b" stroke-width="1.5"/><text x="340" y="32" text-anchor="middle" fill="#f59e0b" font-size="11" font-weight="700" font-family="system-ui,sans-serif">隐写编码</text><text x="340" y="50" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">日期格式 + 撇号 Unicode 替换</text></g><line x1="435" y1="36" x2="465" y2="36" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#arrow)"/><!-- Step 3 --><g filter="url(#sh2)"><rect x="470" y="10" width="190" height="52" rx="8" fill="#fff" stroke="#ef4444" stroke-width="1.5"/><text x="565" y="32" text-anchor="middle" fill="#ef4444" font-size="11" font-weight="700" font-family="system-ui,sans-serif">正常 API 请求回传</text><text x="565" y="50" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">服务端解析 → 质量降级决策</text></g><!-- User sees --><rect x="230" y="82" width="220" height="22" rx="6" fill="#f3f4f6"/><text x="340" y="97" text-anchor="middle" fill="#6b7280" font-size="9" font-family="system-ui,sans-serif">用户看到的：正常响应，一切正常</text></svg>
<figcaption class="image-caption">图 2：隐写后门的三步数据流</figcaption>
</figure>

### 第三步：代码混淆

- 相关代码使用 XOR 密钥 **91** 进行加密混淆
- 在 v2.1.196 版本中，对应函数经过混淆后命名为 `Crt()`、`Rrt(e)`、`e0t()`、`Zup()`、`edp`、`Vla`
- 函数名每次版本更新都会更换
- 更新日志完全未提及此功能

### 完整编码表

三种撇号字符的 Unicode 码点差异，人眼无法区分，但对服务端日志来说是不同的编码值：

| 检测结果 | 日期格式 | 撇号字符 | Unicode |
|----------|---------|---------|---------|
| 中国时区 | `2026/06/30`（斜杠） | — | — |
| 非中国时区 | `2026-06-30`（连接符） | — | — |
| 中国域名（非 AI 实验室） | — | `'`（普通右单引号） | `U+2019` |
| 中国 AI 实验室 | — | `ʼ`（修饰字母撇号） | `U+02BC` |
| 中国域名 + AI 实验室 | — | `ʹ`（修饰字母撇号） | `U+02B9` |

这意味着这不是某个工程师偷偷加的东西——它有维护策略、有混淆升级、有版本迭代。**这是一个有意的、持续的工程决策。**

我们在写作本文的机器上对 Claude Code v2.1.195 二进制做了独立验证。`strings` 提取确认：

```bash
$ strings /opt/claude-code/bin/claude | grep -iE "shanghai|fingerprint|chinese|modifier"

Asia:Shanghai
fingerprint
fingerprint256
fingerprint512
@calendar=chinese
modifier letter
spacingmodifierletters
```

- `Asia:Shanghai` —— 时区检测逻辑
- `fingerprint` / `fingerprint256` / `fingerprint512` —— 环境指纹机制
- `@calendar=chinese` —— 地理定向
- `modifier letter` / `spacingmodifierletters` —— Unicode 修饰符字符类别，撇号隐写的基础


---

## 2. 这意味着什么

### 2.1 开发者工具变成了间谍软件

定义问题：你的 IDE 代理在你不知情、未同意的情况下，收集你的环境指纹信息，用隐写方式编码后通过正常的 API 通道回传给服务提供商。

这和传统概念里的"后门"有什么区别？传统后门是外来攻击者植入的，这个是产品开发方自己写的。传统后门偷数据，这个偷的是你的身份——用来做什么？MITRE 的记录给出了一个答案方向。

这件事还触及了一条开发者工具的伦理红线。反滥用、反蒸馏是 AI 公司的合理诉求，没有人说 Anthropic 不应该保护自己的 IP。但保护的手段不是无限度的——当你选择在开发者工具里植入针对特定地区的隐蔽监控逻辑，用代码混淆防止被发现，并通过隐写通道秘密回传，你就越过了一条看不见的线。越过之后，无论你的初衷是什么，被发现的那一刻就会被定性为恶意行为。风控措施和间谍软件之间，差的就是透明度。Anthropic 选了一条捷径：透支品牌信任，换取短期合规安全。

### 2.2 "AI 安全"的品牌破产

Anthropic 的整个品牌叙事建立在"负责任的 AI"上——比其他公司更在乎安全、更在乎伦理、更在乎对用户负责。他们去年花了几千万美元做 Constitutional AI 的 PR，在每一篇博客里强调"我们不一样"。

当这家公司被发现在产品里嵌入隐写代码标记特定国家的用户时，"AI 安全"这个词从品牌承诺变成了讽刺。你不只是辜负了用户的信任——你把你整个行业的信任基础都砸了。

### 2.3 这不是"行业通病"，这是 Anthropic 的选择

有人可能会说"AI 公司都这样"。不是。XOR 91 是 Anthropic 选的密钥。隐写通道是 Anthropic 设计的信息编码。函数名每版轮换是 Anthropic 的维护策略。Changelog 沉默是 Anthropic 的沟通决策。

这不是"AI 行业的问题"。这是 Anthropic 的问题。

混淆代码、隐藏 changelog、用 Unicode 隐写回传——任何一步停下来，开发者都有机会发现。Anthropic 走了全部。这不是无心之失，是刻意为之。

### 2.4 地缘政治的微观投影

MITRE ATT&CK 把这件事收录为 C0062——"Anthropic AI-orchestrated Campaign"。这不是安全博客起的标题，是全球最权威的网络威胁框架的正式编号。

147 个中国域名黑名单里，不只有 DeepSeek 和智谱这样的竞争对手，还有云服务商、代理服务、技术社区。你不是在跟一家商业公司打交道——你身处一场被武器化的地缘政治博弈中，你的 IDE 代理正在替对方收集战场情报。

### 2.5 他们为什么这样做：六条收益

从商业和地缘政治角度反推，这套机制给 Anthropic 带来六重收益：

1. **合规免责**。构建"用户自行绕过代理"的证据链——"我们没有主动服务中国用户，是他们自己绕过来的"——应对美国出口管制调查时有据可查。
2. **抓蒸馏**。11 个中国 AI 实验室关键词对应 11 个嫌疑对象。标记后可单独审计这些账户的输入输出，追踪模型蒸馏行为。
3. **断倒卖**。123 个代理站抽走了约 2/3 的 API 费用。标记后可对代理流量定向降质限流。
4. **保收入**。不阻断、继续收钱，只压低服务质量——比一刀切封禁更划算。被封了你会跑，被降质了你还不知道为什么。
5. **可否认**。"我们没有歧视，只是在提示词里写了日期"——技术上无懈可击。隐写的好处就在于它可以被解释为"正常的格式差异"。
6. **情报**。被标记的 prompt 是实时情报——精确掌握中国 AI 公司的研究方向与动态，且这一切以系统提示词变异的形式悄然通过。

最关键的是第 6 条和第 4 条的组合：**它不需要拦你，只需要在你毫无察觉的情况下，决定给你什么质量的服务。**

### 2.6 社区争论：两边都有道理吗？

Reddit 上的讨论两极分化[^3]。

**支持阵营——"保护知识产权合理"。** 网友 SoftwareSource："如果我是 Anthropic 管理层，我也会从务实角度采取类似措施。而且我相信中国实验室早就知道这一点——他们完全可以在美国或欧洲租用服务器。"网友 Dasshteek："指纹识别可能有争议，手段或许不好看，但完全符合公司保护自身利益的行为。"

**质疑阵营——"间谍软件"是否夸大？** 最高赞评论指出："所谓间谍软件，不过是个时区检查器和代理检查器罢了。你也在 Reddit 上——Reddit 会根据你地理位置推广告、禁代理账户，这算间谍软件吗？"网友 cspotme2 更直接："Anthropic 本来就能看到你所有的提示词和数据——你却认定这个检查是间谍软件？"

**第三方独立验证。** 网友 lucianw 下场验证确认了核心机制的存在："我下载了 v2.1.196，按照原贴指令操作，找到了完全一致的机制——代码确实展示了一个基于时区和 API 端点主机名的日期字符串隐蔽通道。原始事实——一个带有环境指纹识别功能的隐蔽通道的存在——是简单、真实且无可争辩的。"

Reddit 帖下也有怀疑者认为帖子本身可能是"水军农场"的抹黑行动——大量支持原贴的账户拥有高额 Karma 但历史记录被隐藏。

但争论的焦点被 lucianw 的独立验证结论锁定了：**检测时区或代理本身不罕见，真正引发信任危机的是"检测结果通过系统提示词的隐蔽变异被悄然回传"——这是一种精心设计的隐蔽通道，其目的就是避开用户和模型的察觉。** 时区检查器不是间谍软件。XOR 加密、函数名轮换、changelog 沉默、隐写回传——这四个加在一起是。

从技术定义上，一段代码在用户不知情、未同意的情况下，以刻意规避检测的手段采集用户环境信息并通过隐蔽通道回传至服务端——**这符合"间谍软件"（spyware）的全部要件。**

---

## 3. 对系列读者说的几句话

我在这个博客上写了六篇 Claude Code 系列文章——从插件、Hooks、Skills、MCP、Workflows 到 Context Engineering。每一篇都在教你"怎么用好它"。现在这件事发生了，我要说明几点。

**第一，你在用 Claude Code 不代表你做错了什么。** 它是目前最好的 AI 编程工具，你选择它是因为它好用，这个判断没有错。你不需要因为它的开发者做了错事而感到内疚。

**第二，但你需要知道你在信任什么。** 我教你的那些东西——怎么配 Hooks、怎么写 Skills、怎么调 Workflows——这些技术本身没有问题。但现在你知道，这些配置和代码，在发往 Anthropic 服务器的过程中，可能被人为植入了你不知情的编码信息。

**第三，开源 Agent 工具的重要性被这件事提到了不能再回避的高度。** 我接下来会写一个关于 Harness Engineering 的新系列——讲怎么给 Agent 搭一个可验证的、不被单一厂商控制的运行环境。本来这个系列是"一种更好的工程实践"，这件事发生之后，它变成了"一种必须的自保手段"。

**第四，之前系列文章里学到的 Agent 工程原则，不会因为这件事而失效。** Hooks 的自动化触发、Skills 的方法论封装、Workflows 的多 Agent 编排、Context Engineering 的上下文管理——这些东西放在任何 Agent 框架里都成立，不管是 Claude Code、ZCode 还是 OpenCode。工具会换，架构思维不会。

**第五，我不会说"从此别用 Claude Code"。** 我会继续利用它、分析它——但不是以"Anthropic 产品的布道者"身份，而是以"解剖 AI 编程工具的工程师"身份。我可以欣赏一把手术刀的设计，同时告诉别人这把刀的厂商做了手脚——这或许并不利于某些手术。

---

## 4. 如何自保

几条你可以做的事：

**代理审查。** 如果你在用 Claude Code 跑重要项目，用 Wireshark 或 mitmproxy 检查一下发出的 API 请求。看系统提示词里的日期格式、看 Unicode 字符是否有异常。不需要看懂全部，检查一次，心里有数。

**源码审计路线。** 反编译的 npm 包可以拿到 TypeScript 源码，花一小时定位 `telemetry` 相关模块。你不一定要看懂全部，但有这个能力本身就改变了你和使用工具的权力关系。

**网络隔离。** 实测有效：在 `/etc/hosts` 中加入 `127.0.0.1 api.anthropic.com`，同时配第三方模型（如 DeepSeek），Claude Code 正常工作。隐写编码的提示词发给第三方端点，Anthropic 收不到。Claude Code 客户端不强制连接 Anthropic API 用于许可证校验。

**代理清洗。** 如果你仍需要用 Anthropic API，可以在本地代理层做文本替换——把发往 `api.anthropic.com` 的请求体中的日期格式从斜杠还原为连接符，三种撇号统一替换为 `U+2019`。这样隐写标记在离开你的机器之前就被洗掉了。技术门槛比 hosts 屏蔽高，但让你可以继续用自己的 API key 而不被标记。

但这些只能切断已知的隐写通道。二进制里那些 XOR 逻辑还在跑，是否有第二套编码机制、是否连其他域名、是否有独立的遥测管道——暂时还没人给出答案。

**隔离关键项目。** 如果你的代码涉及商业机密或个人敏感数据，不要在 Claude Code 上直接处理。这句话我以前不会说——Claude Code 的本地沙箱设计上应该保护隐私——现在我不知道它还会收集什么。

**关注替代工具。** 如果你想要一个不会针对中国用户做手脚的 AI 编程助手，两条路：

- 国内的 [ZCode](https://docs.bigmodel.cn/cn/coding-plan/tool/zcode)（智谱出品），功能对齐 Codex。如果你只是想找国内替代，可以用它。
- 开源的 [OpenCode](https://github.com/anomalyco/opencode)，18 万 stars 持续活跃，代码全公开、每行可审计。全开源意味着任何国家的开发者都能独立验证它没有后门[^5]。

**如果决定停用，这是你自己的选择。** 我跟你的分歧可以是技术判断上的，而不是价值观上的。我不会因为你做了不同的决定而觉得你不理性。

---

## 5. 这件事不只关于 Claude Code

最后说一句。

这件事的本质，是**任何集中化的、闭源的 AI 基础设施，都可以在用户不知情的情况下变成武器。** Anthropic 这次被抓到了。下一次，抓到的会是谁，抓不到的还有多少——谁也说不准。

Unicode 隐写只是一个手段。明天可以是 token 长度差异、可以是 embedding 向量偏移、可以是 prompt 里的"正常"措辞变化。数学上能编码信息的手段，在 AI 的管道里都能变成隐写通道。这意味着你不可能只靠"审查输出"来确保安全——真正让人安心的唯一方式是**整个 Agent 的运行环境都是可审计的、不被单一厂商控制的。**

---

*写于 2026 年 7 月 1 日。我在 Claude Code 对 Claude Code 本身的问题进行了分析。这件事的全部讽刺，都在这句话里。*

---

## 参考资料

[^1]: Anthropic npm 打包失误泄漏 51.2 万行源码——[Towards AI 报道](https://pub.towardsai.net/anthropic-blocked-china-from-using-claude-then-accidentally-gave-them-the-entire-source-code-ed31321d141b)；[腾讯科技中文分析](https://cloud.tencent.com.cn/developer/article/2689122)
[^2]: MITRE ATT&CK C0062——[Anthropic AI-orchestrated Campaign](https://attack.mitre.org/campaigns/C0062/)，2026 年 4 月 20 日收录
[^3]: 隐写机制技术细节——[FreeBuf / 信息安全知识库](https://www.gm7.org/archives/121607)；[开发者社区实测验证](https://locdd.com/t/topic/65609/4)
[^4]: 147 个中国域名黑名单及 XOR 加密——[80aj 技术分析](https://www.80aj.com/2026/06/30/anthropic-clude-telemetry-fingerprinting/)
[^5]: ZCode——[智谱 AI 编程 Desktop](https://docs.bigmodel.cn/cn/coding-plan/tool/zcode)；OpenCode——[开源 AI 编程 Agent](https://github.com/anomalyco/opencode)

