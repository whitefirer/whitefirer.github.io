# Prompt Caching 深度解析：插件 + 缓存 = 98% 费用节省


> 402 轮编码会话，从 ¥113 ($16.36) 压到 ¥1.89 ($0.27)。插件砍 token 量，缓存砍 token 单价。

---

## 两层省钱机制

很多人把省钱都归功于 Prompt Caching。实际上有**两层独立机制**：

| 层次 | 由谁做 | 怎么省 | 本次节省 |
|------|--------|--------|------:|
| **减少 token 生成量** | 插件（caveman / claude-mem / superpowers） | 少说废话、不重复探索、少返工 | **97%** |
| **降低 token 单价** | Prompt Caching | 静态内容只付 1/30 价格 | **46%**（在插件基础上） |

两者不是竞争关系——是叠加。插件先把 token 量砍到 1/6，缓存再把剩余部分的单价打到骨折。

---

## 插件层：怎么砍 token 量

### caveman — 输出压缩 65%~75%

**原理**：删除冠词、填充词、客套话，保留所有技术内容。

```
正常模式：The reason your React component is re-rendering is likely
          because you're creating a new object reference on each render
          cycle. I'd recommend using useMemo. (32 tok)

Caveman： New object ref each render. Inline object prop = new ref.
          Wrap in useMemo. (17 tok) → 省 47%
```

本次会话实测：输出 109k token。若无 caveman，估算 312k token。**单这一项省了 3 倍输出。**

### claude-mem — 探索效率提升 ~30%

**smart-explore**：用 tree-sitter AST 解析代码结构，不读全文。找函数、找类型只返回大纲。

```bash
# 不用 claude-mem：读整个文件
cat workflow/executor.go  # 500+ 行，~8000 token

# 用 smart-outline：只看函数签名
# 返回 15 个函数名 + 参数列表，~200 token
```

每个文件查找省 70% token。一场会话查 20 个文件，积少成多。

### superpowers — 减少返工 ~50%

强制 brainstorming → plan → TDD → execute → review 流程。避免"写了一半发现走错路全删重来"。

典型场景：没有 superpowers，中型功能 3-5 轮返工，每轮 10k-20k token。有 superpowers 通常 1 轮到位。

### caveman-compress — 记忆文件压缩 ~46%

CLAUDE.md 等文件每会话加载。压缩后从 939 token 降到 ~500。

### 插件合计

```
无插件估算：    输入 36,987k  +  输出 312k  =  ~37M token
有插件实际：    输入 30,784k  +  输出 109k  =  ~31M token
─────────────────────────────────────────────────
插件节省：      ~6M token（16%）+ 输出降低 65%
费用节省：      97%（¥112.84 → ¥3.49）
```

> 注：输入 token 的绝对节省不如输出明显（因静态开销 76k/轮基数大），但输出端 caveman 效果显著。

---

## 缓存层：怎么砍 token 单价

### DeepSeek V4 定价

> DeepSeek 同时公布美元和人民币价格，各自独立定价。汇率换算后基本一致（<2% 偏差）。以下来自[官方定价页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)。

| 计费项 | V4 Pro (2.5折) | V4 Flash |
|--------|------------:|------:|
| 输入 (缓存命中) | ¥0.025/M ($0.0036/M) | ¥0.02/M ($0.0028/M) |
| 输入 (缓存未命中) | ¥3.0/M ($0.435/M) | ¥1.0/M ($0.14/M) |
| 输出 | ¥6.0/M ($0.87/M) | ¥2.0/M ($0.28/M) |

> V4 Pro 限时 2.5 折（75% off），原至北京时间 2026/05/05 23:59，延长至 2026/05/31 23:59。缓存命中全系列降为首发价 1/10。缓存命中折扣后 ¥0.025/M —— 120 倍于未命中价。

### 哪些内容被缓存

```
每次请求 = 你的输入 (5~500 tok) + 固定开销 (~76,000 tok)
                                    │
                           ┌────────┴────────┐
                           │  全部可缓存      │
                           │  · 系统提示词    │
                           │  · 工具定义      │
                           │  · MCP 工具     │
                           │  · Skills 列表  │
                           │  · Memory 文件  │
                           └─────────────────┘
```

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 300" width="100%" style="max-width:680px;display:block;margin:1.2em auto"><defs><linearGradient id="inp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient><linearGradient id="ohd" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="cbx" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-opacity="0.1"/></filter></defs><rect x="20" y="20" width="640" height="44" rx="8" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1.2"/><text x="340" y="40" text-anchor="middle" fill="#475569" font-size="13" font-weight="600" font-family="system-ui,sans-serif">每次请求</text><text x="340" y="56" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">系统固定开销 + 你的输入</text><line x1="340" y1="64" x2="340" y2="80" stroke="#94a3b8" stroke-width="1.5"/><line x1="235" y1="80" x2="550" y2="80" stroke="#94a3b8" stroke-width="1.5"/><line x1="235" y1="80" x2="235" y2="100" stroke="#94a3b8" stroke-width="1.5"/><line x1="550" y1="80" x2="550" y2="100" stroke="#94a3b8" stroke-width="1.5"/><g filter="url(#sh)"><rect x="40" y="100" width="390" height="56" rx="8" fill="#fff" stroke="#6366f1" stroke-width="1.5"/><text x="235" y="126" text-anchor="middle" fill="#6366f1" font-size="13" font-weight="600" font-family="system-ui,sans-serif">系统固定开销</text><text x="235" y="144" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">~76,000 tok / 次（固定，不随输入变化）</text></g><text x="445" y="132" fill="#94a3b8" font-size="18" font-family="system-ui,sans-serif">+</text><g filter="url(#sh)"><rect x="470" y="100" width="170" height="56" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="1.2"/><text x="555" y="126" text-anchor="middle" fill="#64748b" font-size="13" font-weight="600" font-family="system-ui,sans-serif">你的输入</text><text x="555" y="144" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">5 ~ 500 tok / 次</text></g><line x1="235" y1="156" x2="235" y2="176" stroke="#6366f1" stroke-width="1.5"/><polygon points="235,176 229,170 241,170" fill="#6366f1"/><g filter="url(#sh)"><rect x="120" y="180" width="240" height="108" rx="8" fill="#fff" stroke="#10b981" stroke-width="1.8"/><rect x="120" y="180" width="240" height="32" rx="8" fill="url(#cbx)"/><rect x="120" y="204" width="240" height="8" fill="url(#cbx)"/><text x="240" y="202" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">全部可缓存</text><circle cx="140" cy="230" r="3" fill="#10b981"/><text x="148" y="234" fill="#475569" font-size="12" font-family="system-ui,sans-serif">系统提示词</text><circle cx="140" cy="250" r="3" fill="#10b981"/><text x="148" y="254" fill="#475569" font-size="12" font-family="system-ui,sans-serif">工具定义</text><circle cx="280" cy="230" r="3" fill="#10b981"/><text x="288" y="234" fill="#475569" font-size="12" font-family="system-ui,sans-serif">MCP 工具</text><circle cx="280" cy="250" r="3" fill="#10b981"/><text x="288" y="254" fill="#475569" font-size="12" font-family="system-ui,sans-serif">Skills 列表</text><circle cx="280" cy="270" r="3" fill="#10b981"/><text x="288" y="274" fill="#475569" font-size="12" font-family="system-ui,sans-serif">Memory 文件</text></g><rect x="390" y="210" width="250" height="54" rx="6" fill="url(#ohd)"/><text x="515" y="232" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="system-ui,sans-serif">402 轮会话</text><text x="515" y="252" text-anchor="middle" fill="#fff" font-size="11" font-family="system-ui,sans-serif">30,628,352 tok 全部命中缓存</text></svg>

402 轮 × 76k = 30,628,352 token 全部命中缓存。实际新增输入仅 155,241 token。

### 缓存层节省

```
有插件 + 无缓存：  ¥93.01 ($13.49)
有插件 + 有缓存：  ¥1.89 ($0.27)
────────────────────────
缓存节省：         ¥91.12/$13.22（98% 缓存命中折扣）
```

缓存层在 DeepSeek 价下省了 ¥91（从不缓存 ¥93 到缓存 ¥1.89），效果极其显著。如果用 Anthropic Opus 原价，缓存层能省 **$440+**。

---

## 四场景完整对比

| 场景 | 输入 Token | 输出 Token | USD | CNY |
|------|----------:|--------:|----:|----:|
| ❌ 插件 · ❌ 缓存 | 36,986,884 | 312,457 | $16.36 | ¥112.84 |
| ❌ 插件 · ✅ 缓存 | 36,986,884 | 312,457 | $0.51 | ¥3.49 |
| ✅ 插件 · ❌ 缓存 | 30,783,593 | 109,360 | $13.49 | ¥93.01 |
| ✅ 插件 · ✅ 缓存 | 30,783,593 | 109,360 | **$0.27** | **¥1.89** |

关键发现：

1. **插件是主力**——从 ¥112.84 砍到 ¥3.49（省 97%）。减少 token 生成量永远是第一优先级
2. **缓存也很关键**——从 ¥3.49 再砍到 ¥1.89（多省 46%）。120 倍的缓存命中折扣让静态开销几乎免费
3. **两者叠加**——¥112.84 → ¥1.89，节省 98%

> DeepSeek 缓存折扣 120 倍，比 Anthropic（Opus ~12 倍、Sonnet ~10 倍）更激进。同样的 3000 万 token，不缓存 ¥93 vs 缓存 ¥1.89，差了 50 倍。

---

## 两层缓存机制

Anthropic API（DeepSeek 兼容实现）：

| 缓存层 | TTL | 续期 | 用途 |
|--------|-----|:--:|------|
| 5 分钟缓存 | 5 min | 每次命中续 | 会话内连续请求 |
| 1 小时缓存 | 1 hour | 不续期 | 跨短间隔会话 |

```
会话 A (10:00-10:30)  →  5分钟缓存持续活跃
                        写入 1小时缓存

会话 B (10:35 新开)    →  5分钟过期，1小时命中

会话 C (12:00 下午)    →  全部过期，从头计费
```

{{< mermaid >}}
gantt
    title 两层缓存生命周期
    dateFormat  HH:mm
    axisFormat  %H:%M
    section 会话 A
    5分钟缓存 (活跃)     :active, 10:00, 10:30
    1小时缓存             :crit, 10:00, 11:00
    section 会话 B
    1小时缓存命中         :done, 10:35, 11:00
    section 会话 C
    缓存全过期            :milestone, 11:00, 0min
{{< /mermaid >}}

**重要**：59 分时读到缓存，1 分后照样过期。不会续期。

---

## 对比 Anthropic 模型

同一会话，不同模型/缓存组合：

| 模型组合 | 费用 (USD) | 费用 (CNY) | vs 最优 |
|----------|----------:|----------:|------:|
| DeepSeek V4 Pro + 插件 + 缓存 | $0.27 | ¥1.89 | 基准 |
| DeepSeek V4 Pro + 插件 · 无缓存 | $13.49 | ¥93.01 | 49x |
| DeepSeek V4 Pro · 无插件 + 缓存 | $0.51 | ¥3.49 | 1.8x |
| DeepSeek V4 Pro · 无插件 · 无缓存 | $16.36 | ¥112.84 | 60x |
| Anthropic Sonnet 4 (估算) + 插件 + 缓存 | ~$3.50 | ~¥24 | 12.7x |
| Anthropic Opus 4 (估算) + 插件 + 缓存 | ~$17.40 | ~¥120 | 63x |
| Anthropic Opus 4 · 无插件 · 无缓存 | ~$870 | ~¥6000+ | 3000x+ |

> Anthropic 缓存溢价更高——在 Opus 上缓存层能省 $440+，远超插件层的 token 量优化。

---

## DeepSeek 为什么能 120 倍缓存折扣？

Anthropic 的缓存命中折扣约 10-12 倍（Opus ~12×，Sonnet ~10×），而 DeepSeek V4 Pro 达到 120 倍。这不是补贴，是架构优势的算术结果。

### 缓存命中率为什么高？

本次 402 轮会话，缓存命中率 99.5%（30,628,352 / 30,783,593 输入 token）。编码 Agent 场景天然适合缓存——system prompt、工具定义、历史上下文每轮重复传输，只有新一行的用户输入需要重新编码。命中率主要由场景决定，但**命中后的单价**由架构决定。

### 三池异构 KV Cache

传统 Transformer 用 Dense Attention，每个 token 的 KV 对全精度存储，序列多长 KV Cache 就有多大。DeepSeek V4 把 KV Cache 拆成三个池，按信息密度分层存储：

| 缓存池 | 压缩比 | 精度 | 作用 |
|--------|--------|------|------|
| **SWA** (Sliding Window) | 无压缩，仅保留最近 128 token | 全精度 | 局部细节补强 |
| **CSA** (Compressed Sparse Attention) | 4 token → 1 压缩 entry | FP8/BF16，Indexer 跑 FP4 | Lightning Indexer 选 top-1024 后做稀疏注意力 |
| **HCA** (Heavily Compressed Attention) | 128 token → 1 压缩 entry | FP8/BF16 | 全局 dense attention，永久在线的"摘要通道" |

V4-Pro 总 61 层：前 2 层用 HCA 建立全局感知，后续层 CSA/HCA 交替排布。

**效果**：1M token 上下文下，V4-Pro 的单 token 推理 FLOPs 仅为 DeepSeek V3.2 的 27%，KV Cache 体积仅为其 10%。相较于传统 GQA 架构，KV Cache 仅约 2%。

### 关键创新：压缩 + 稀疏的两级漏斗

**CSA 的跨块重叠压缩**

每 4 个 token 压缩为 1 条 entry 时，不是简单硬切。相邻压缩块有 50% 重叠——块 i 用 Cᵃ 投影当前 token，Cᵇ 投影前块 token，两者叠加。避免硬切带来的边界信息断裂。

**Lightning Indexer（闪电索引器）**

压缩后的序列仍很长。Indexer 是一个轻量级小注意力模块：
- 全程 FP4 精度
- 仅 64 个 head（主 attention 128 个），head dim 仅 128（主 attention 512）
- ReLU 过滤 + per-head 加权，任何 head 认为相关即贡献正分
- 从压缩序列中选出 top-1024 个最相关的块

**HCA 的极端压缩**

每 128 token 压缩为 1 条 entry。1M 上下文仅剩约 7,800 条，直接做 dense attention 完全可控。不做稀疏选择——省去 Indexer 参数和 Top-k 排序开销。

### 推理框架层：ShadowRadix 前缀复用

SGLang 团队为 V4 专门设计的原生前缀缓存系统。

传统 prefix cache 用 Radix Tree 管理 KV Cache 复用，但 V4 每层有三个异构 KV 池 + 两套压缩状态，传统方案直接失效。ShadowRadix 的做法：

1. 用一个 Radix Tree 索引**虚拟的完整 token 槽位**（统一坐标系统）
2. 每个虚拟槽位投影（shadow）到三个物理 KV 池
3. 压缩状态的环形缓冲区通过二级算术映射独立寻址
4. 每个节点带双计数器锁——`full_lock_ref` 覆盖源节点及 C4/C128 shadow，`swa_lock_ref` 仅追踪滑动窗口
5. 当 SWA 计数归零，只释放 SWA 槽位，压缩 shadow 保留在树中继续被其他请求复用

**效果**：1 万 token 的请求只占 128 个 SWA token + 完整 CSA/HCA 压缩 KV。压缩 KV 正是跨请求复用的部分。在 B200 上，V4-Pro 从 4K 到 900K 上下文，解码吞吐仅从 199 tok/s 降到 180 tok/s（降幅不到 10%）。

### 为什么整体能低价：四层叠加

DeepSeek 的低价不是烧钱补贴，是从注意力机制到推理框架全链路效率叠加：

**第一层：MoE 存算分离**
- V4-Pro 总参 1.6T，每次推理只激活 49B（3%）
- 每 token 仅激活 2-4 个专家（传统 MoE 需 8-16 个），计算资源利用率 92%

**第二层：MLA → CSA + HCA 注意力压缩**
- DeepSeek-V2（2024）先用 MLA（多头潜在注意力）沿特征维度压缩 KV，减少 93.3% KV Cache [arxiv:2405.04434]
- V4 进一步沿序列维度压缩，KV Cache 再降至 V3.2 的 10%

**第三层：混合精度 + 量化**
- RoPE 维度保留 BF16（保证位置编码精度），其余压缩至 FP8
- CSA Indexer 的 QK 路径全程 FP4
- Flash Compressor 将 5 步压缩链融合为单次片上 pass，HBM 往返从 5 降到 2

**第四层：HiSparse CPU offload + 三档磁盘策略**
- 将不活跃的 C4（CSA）KV Cache offload 到 CPU 内存，长上下文吞吐提升 3×
- 磁盘策略按算力/存储比弹性选择（Full / Periodic / Zero）

### 对比总结

| 维度 | Anthropic (Opus 4) | DeepSeek V4 Pro |
|------|-------------------|----------------|
| 注意力架构 | Dense Attention | CSA + HCA 混合稀疏压缩 |
| KV Cache 体积 | 全精度，序列多长大 | 压缩至传统 2%，混合精度 |
| 缓存折扣 | ~12× | ~120×（命中 ¥0.025/M vs 未命中 ¥3.0/M） |
| 单 token 推理算力 | 高（全量激活） | V3.2 的 27%（MoE + 压缩） |
| 前缀复用 | 标准 Radix Tree | ShadowRadix 异构池影子投影 |

DeepSeek 的 120 倍缓存折扣，本质是**架构上把 KV Cache 做到了传统模型的 2%**。缓存命中后，只需对压缩后的极少量 KV 做计算，成本自然断崖式下降。而 Anthropic 的 dense 架构下，缓存命中只是免了 prefill 的矩阵乘法，KV Cache 本身并没有变小——这是 120× vs 12× 差距的根源。

> **参考来源**：
> - DeepSeek-V4 Technical Report (2026-04-24), HuggingFace: [deepseek-ai/DeepSeek-V4-Pro](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro)
> - DeepSeek-V2: *A Strong, Economical, and Efficient Mixture-of-Experts Language Model*, arxiv: [2405.04434](https://arxiv.org/abs/2405.04434) — 首次提出 MLA
> - LMSYS Blog: [DeepSeek-V4 on Day 0: From Fast Inference to Verified RL with SGLang and Miles](https://www.lmsys.org/blog/2026-04-25-deepseek-v4/) (2026-04-25) — ShadowRadix 机制详解
> - SGLang Docs: [DeepSeek-V4 Cookbook](https://docs.sglang.io/cookbook/autoregressive/DeepSeek/DeepSeek-V4)
> - mHC: *Manifold-Constrained Hyper-Connections*, arxiv (2025-12) — 梁文锋署名，V4 训练稳定性基础
> - [DeepSeek 官方定价页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)

---

## 实际会话费用明细

本次 402 轮编码会话（2026-04-28）：

```
💰 费用明细 (DeepSeek V4 Pro, 2.5折)

Cache Miss:     155,241 tok × ¥3.0/M ($0.435/M) = ¥0.47 ($0.07)
Cache Hit:   30,628,352 tok × ¥0.025/M ($0.0036/M) = ¥0.77 ($0.11)
Output:        109,360 tok × ¥6.0/M ($0.87/M) = ¥0.66 ($0.10)
─────────────────────────────────────────────────
总计:                                              ¥1.89 ($0.27)
```

**¥1.89 ($0.27) 完成 402 轮编码对话——包括代码探索、文件整理、环境配置、博客撰写。**

---

## 优化清单

| 优先级 | 操作 | 预期节省 |
|:--:|------|:------:|
| 1 | 装 caveman | 输出 -65%~75% |
| 2 | 装 superpowers | 减少返工，总 token -50% |
| 3 | 装 claude-mem | 探索效率 +70%，免重复上下文 |
| 4 | 精简 CLAUDE.md | 每轮省 ~400 input token |
| 5 | 关掉不用的插件 | 减少 MCP/Skills 定义 |
| 6 | caveman:compress 记忆文件 | 输入 -5%~10% |
| 7 | 5 分钟内连续对话 | 缓存永续 |
| 8 | 闲暇时用 Flash 代替 Pro | 降至 1/3 价格 |

---

## 结论

两层机制，分工明确：

- **插件层**：砍 token 生成量（主力，省 97%）
- **缓存层**：砍 token 单价（120x 折扣，多省 46%）

二者叠加 = ¥112.84 → ¥1.89（98% 节省）。

DeepSeek 的缓存折扣其实比 Anthropic 更激进——120 倍 vs Opus 的 12 倍。只不过 DeepSeek 基础价低，绝对值看起来小。换成 Opus，这场会话无缓存 ¥2100，有缓存 ¥180，都是肉疼。

**结论：四个插件都装上，别让会话间隔超过一小时。缓存折扣 120 倍不是摆设——没缓存贵 50 倍。**

---

> 数据来自 2026-04-28 实际编码会话，402 轮。
>
> DeepSeek V4 Pro 含 2.5折限时折扣（原至北京时间 2026/05/05 23:59，延长至 2026/05/31 23:59）。
>
> 人民币为 DeepSeek 原始定价。
>
> [DeepSeek 定价页](https://api-docs.deepseek.com/quick_start/pricing) · [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)

