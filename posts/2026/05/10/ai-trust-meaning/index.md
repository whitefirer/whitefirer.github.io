# AI 能做事，不能扛事


{{< image src="night-debugging.jpg" alt="凌晨三点的线上事故排查" caption="凌晨三点，屏幕是唯一的光源。搞砸、扛住、被原谅——AI 没经历过这些。" width="600px" linked=false >}}

前两篇发出来后，一个读者给我私信留言，提了几个很实在的问题。

他公司的测试团队因为质量不达预期被解散了，开发现在要背测试质量和 bug 全责。老板私下说，他的管理经验正在被 AI 时代冲击，想大幅缩减人数。他以前从不担心独立开发者，而现在很担心，因为一个人加 AI 就能复刻出一样甚至更优秀的产品。

他还问：既然你用 AI 顺手把 PM 和测试的活儿全干了，那放大一点，将来大部分中小公司是不是只需要几个人，借助 AI 把产品、测试、运维、安全、基础设施全扛起来？

这几个问题指向同一个盲区。前两篇讲了 AI 在**能力层**的缺口——感知现实有限、没有自驱力、做不到范式突破。这些是 AI"能不能"的问题，也是能力层里人仍然有优势的地方。

但读者问的不是 AI 能不能，而是**人还剩什么**。

这是我的答案：AI 替代的是能力层里"已有解"的部分。但能力层之上，还有一层东西，AI 碰不到。我管它叫**存在层**：价值判断、信任、意义。

---

## 两层地图

先说清楚这个框架。

能力层：推理、编码、执行、解决问题，是"怎么做"和"能不能"。AI 在这层全面铺开，大部分事做得比人好。前两篇给 AI 画的三条线，即**感知现实、自驱力、创新**是这层里 AI 的三个缺口，也是人在这层最后的优势。

存在层：价值判断、信任、意义。即"值不值得做"、"谁来做"、"为什么而做"、"要不要做"。它不是技术问题，是你作为一个人，在组织、社会、文化里的位置问题。AI 在这层没有存在感，并不是因为它不够聪明，也是因为它没有作为"人"参与社会的资格。

往下说三个点。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 420" width="100%" style="max-width:700px;display:block;margin:1.2em auto">
  <defs>
    <linearGradient id="capBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="100%" stop-color="#e2e8f0"/></linearGradient>
    <linearGradient id="existBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#eef2ff"/><stop offset="100%" stop-color="#e0e7ff"/></linearGradient>
    <linearGradient id="capTitle" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#475569"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
    <linearGradient id="existTitle" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4338ca"/><stop offset="100%" stop-color="#6366f1"/></linearGradient>
    <filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.06"/></filter>
  </defs>

  <rect x="20" y="20" width="660" height="130" rx="10" fill="url(#capBg)" stroke="#cbd5e1" stroke-width="1"/>
  <rect x="20" y="20" width="660" height="32" rx="10" fill="url(#capTitle)"/>
  <rect x="20" y="42" width="660" height="10" fill="url(#capTitle)"/>
  <text x="50" y="42" fill="#fff" font-size="14" font-weight="700" font-family="system-ui,sans-serif">能力层 — 「怎么做」「能不能」</text>
  <text x="520" y="42" fill="#e2e8f0" font-size="11" font-family="system-ui,sans-serif">推理 · 编码 · 执行 · 解决问题</text>

  <rect x="45" y="60" width="370" height="40" rx="6" fill="#fff" stroke="#94a3b8" stroke-width="0.8" filter="url(#sh)"/>
  <text x="230" y="78" text-anchor="middle" fill="#475569" font-size="12" font-weight="600" font-family="system-ui,sans-serif">AI 全面铺开，大部分事做得比人好</text>
  <text x="230" y="93" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">CRUD · 代码生成 · 测试用例 · 翻译 · 文档</text>

  <rect x="430" y="60" width="225" height="40" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2" filter="url(#sh)"/>
  <text x="542" y="78" text-anchor="middle" fill="#4f46e5" font-size="12" font-weight="600" font-family="system-ui,sans-serif">AI 的三个缺口</text>
  <text x="542" y="93" text-anchor="middle" fill="#818cf8" font-size="10" font-family="system-ui,sans-serif">感知现实 · 自驱力 · 范式创新</text>

  <line x1="415" y1="80" x2="428" y2="80" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>

  <rect x="45" y="108" width="150" height="28" rx="4" fill="#10b981" opacity="0.1" stroke="#10b981" stroke-width="0.8"/>
  <text x="120" y="126" text-anchor="middle" fill="#059669" font-size="10" font-weight="600" font-family="system-ui,sans-serif">AI 替代「已有解」</text>

  <rect x="430" y="108" width="225" height="28" rx="4" fill="#6366f1" opacity="0.08" stroke="#6366f1" stroke-width="0.8"/>
  <text x="542" y="126" text-anchor="middle" fill="#4f46e5" font-size="10" font-weight="600" font-family="system-ui,sans-serif">人的优势 — 前两篇画的三条线</text>

  <line x1="40" y1="170" x2="660" y2="170" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="6,3"/>
  <polygon points="350,175 340,165 360,165" fill="#94a3b8"/>

  <rect x="20" y="190" width="660" height="130" rx="10" fill="url(#existBg)" stroke="#a5b4fc" stroke-width="1"/>
  <rect x="20" y="190" width="660" height="32" rx="10" fill="url(#existTitle)"/>
  <rect x="20" y="212" width="660" height="10" fill="url(#existTitle)"/>
  <text x="50" y="212" fill="#fff" font-size="14" font-weight="700" font-family="system-ui,sans-serif">存在层 — 「值不值得做」「谁来做」「为什么而做」</text>
  <text x="575" y="212" fill="#c7d2fe" font-size="11" font-family="system-ui,sans-serif">价值 · 信任 · 意义</text>

  <rect x="45" y="235" width="190" height="55" rx="6" fill="#fff" stroke="#818cf8" stroke-width="1" filter="url(#sh)"/>
  <text x="140" y="272" text-anchor="middle" fill="#1e293b" font-size="12" font-weight="600" font-family="system-ui,sans-serif">价值判断</text>
  <text x="140" y="258" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui,sans-serif">性能 or 可维护？上线 or 打磨？</text>
  <text x="140" y="284" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">AI 没有「我觉得」</text>

  <rect x="255" y="235" width="190" height="55" rx="6" fill="#fff" stroke="#818cf8" stroke-width="1" filter="url(#sh)"/>
  <text x="350" y="272" text-anchor="middle" fill="#1e293b" font-size="12" font-weight="600" font-family="system-ui,sans-serif">信任</text>
  <text x="350" y="258" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui,sans-serif">搞砸 → 扛住 → 被原谅</text>
  <text x="350" y="284" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">AI 没搞砸过，没扛过</text>

  <rect x="465" y="235" width="190" height="55" rx="6" fill="#fff" stroke="#818cf8" stroke-width="1" filter="url(#sh)"/>
  <text x="560" y="272" text-anchor="middle" fill="#1e293b" font-size="12" font-weight="600" font-family="system-ui,sans-serif">意义</text>
  <text x="560" y="258" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui,sans-serif">「这值得做吗？」</text>
  <text x="560" y="284" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">AI 不问为什么而做</text>
  <text x="350" y="388" text-anchor="middle" fill="#64748b" font-size="12" font-family="system-ui,sans-serif">AI 只能在能力层做题，进不了存在层做人</text>
</svg>

---

## 价值判断：AI 没有"我觉得"

回到那个读者的问题。pizza team 在技术上完全可行，但 pizza team 做不了的第一个东西是：**做选择。**

你做一个产品，每天遇到的选择不是技术问题，是价值观问题：

- 性能优先还是可维护性优先？
- 快速上线还是要打磨到满意？
- 用户数据可以卖，还是不卖？
- 出了事故是透明披露还是悄悄修掉？

这些不是 prompt 能描述清楚的问题。不是因为 AI 不够聪明，而是因为这些问题没有标准答案。它们的答案取决于你相信什么。

AI 能给你列出每个选项的 pros and cons，但它不能替你选。选择的那一刻，你投射出去的是你的价值观，不是你的推理能力。

就像前两篇反复出镜的 Karikó。数据站在对面，她选"继续"，因为她相信原理是对的。这个"我相信"，AI 没有。

再举一个近的例子。2026 年 5 月，antirez 发布 ds4，README 里特意补了一句："如果你不接受 AI 辅助代码开发，这个软件不适合你。"这不是技术声明，是价值观声明。他在说：我选择这个开发方式，你如果不同意，可以不用。用 AI 写了 1500 行 C 代码发出来，还是选择手写，这本身是一个价值判断，不是一个能力问题。

小到一行代码的风格选择，大到职业生涯的方向切换，价值的权重永远在，AI 永远不背这个权重。

---

## 信任：人信人，不是信概率

pizza team 做不了的第二个东西是：**让甲方签字。**

你知道一个创业公司怎么拿下第一个大客户吗？不是技术方案写得比大厂好。是那个 CTO 飞了三趟北京，在客户会议室里被问了两个小时的刁钻问题，走的时候对方说了一句话："你们团队人不多，但我信得过你。"

信任是人对人的。它不是对能力的评估——大厂能力更强。它是一种对"这个人搞砸过，然后扛住了"、"这个人说能做到，就是能做到"、"这个人上次出事故的时候，没有甩锅"的积累。

你签一个 SaaS 合同，服务可用性 SLA 写的是 99.9%。这个东西谁来赔付？AI 吗？是签合同的那个法人、那个公司、那个 CTO。对方买的是你的服务能力，但签合同的时候，他买的是你出事了会兜底。

这就是为什么 SOC 2、等保、合规审计这些东西审的都是人、流程、制度，不是 prompt 质量。不是技术不够先进，是法律体系不给非人主体留位置。

再往下说一层。团队内部的信任也是人对人的。我最信任的同事不是代码写得最好的那个，是上次线上炸了，凌晨三点我们俩一起盯着屏幕、一句废话没有、闷头排查了两个半小时的那个。这种信任来自**脆弱性的共享**——我们共同经历过糟糕的时刻，你知道对方在那时候是什么样子。

AI 没有"搞砸过"的概念。它不能跟你一起共情一个凌晨三点的线上事故。它不能犯过错后承担后果。而恰好是"搞砸"、"扛住"、"被原谅"构成了人与人之间最深的信任纽带。

所以，pizza team 能做出一个好产品，但签不下一个需要 SLA 的合同。不是因为产品不够好，是对方不知道该找谁负责。

---

## 意义：AI 不说"为什么"

最后一个点，存在层最深的地方。

AI 处理符号，人不只处理符号。人问："这值得做吗？"

这是一个 AI 永远问不出来的问题。不是因为难度高，是因为"值得"不是一个可计算的量。它不来自数据分布，来自你对自己生命的感受。

一个程序员用 AI 三天写出了一个小 SaaS。功能完美，性能好，部署顺利。但三个月后他不维护了。不是因为技术上遇到了什么困难，而是因为他发现"帮人自动生成营销文案"这件事，他不觉得有意义。

另一个程序员，用 AI 花半年做了一个开源的教育工具，给偏远地区的孩子用。用户量不大，bug 还不少，但他每天晚上下班之后还在修。问他为什么，他说："我小时候就没这个。"

这两个例子，AI 看不出区别。对 AI 来说，它们都是"代码已生成、测试已通过"。但第一个人会慢慢放弃，第二个人会一直做下去。区别不在能力层，而在意义层：**你觉得什么东西值得你的时间。**

自驱力的燃料其实是意义感。Karikó 相信 mRNA 值得做 40 年，Linus 觉得有个自己的操作系统是好玩的，antirez 觉得推理引擎不够快就得自己造一个——这些都不是功利计算。自驱力让你往前走，意义感告诉你值得往哪走。没有意义感撑着的自驱力，烧不了 40 年。

而"我觉得这事值"，这种话 AI 说不出来。

---

你的护城河不在你能写多少行代码、能管多少台服务器、能覆盖多少种测试用例。AI 在这些事情上迟早超过你。

你的护城河是：你知道什么东西值得做，你敢为它负责，你愿意跟别人一起扛，只是因为你扛过。

测试团队被裁了，开发背上质量全责，短期看似降本，长期看是风险转嫁，只是延缓，治标不治本。因为质量不是测出来的，是被在乎出来的。你在乎，你就会测。你不在乎，把 test case 拷给你你也不会认真跑。

pizza team 能做出来。但做出来之后的事，比如谁签字、谁兜底、谁扛住凌晨三点的线上事故，答案不是"几个人加 AI"。答案是一个又一个具体的人，有名字、有脸、有自己搞砸过又被原谅的经历。

所以，不必恐惧。去问第一个问题，去做那个在乎的人。

---

---
