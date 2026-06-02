# 也谈谈 AI 编程


使用 AI 编程已经有一段时间了，从最初的代码补全，到辅助编程，再到完全由 AI 生成代码——体验和感受都和以往大不相同。

## 从恐惧到接纳

起初，我还会调侃 AI 不过如此，只能给人类打打下手。但后来，当第一次目睹整个项目完全由 AI 写出时，我感受到的不是兴奋，反而在一段时间里感到深深的恐惧——害怕自己真的会被替代。

好在心态慢慢调整了过来，逐渐接纳了 AI 编程这种新方式，也看清了它的优势与局限，并由此生出一些新的认知。

更意外的是，身边很多资深程序员，本来已经到了写代码的厌倦期——该踩的坑都踩过，该写的轮子都写过，对着一屏又一屏的代码早已没了新鲜感——反而因为 AI 编程焕发了第二春。群里的 @Samuel 就是典型，每天一个点子，靠烧 token 快速落地，已经做出了好几个完整作品。AI 替掉了那些重复、枯燥的部分，把人解放出来，只去做想象力最活跃的那一层。写代码，忽然又变得好玩了。

另一个群里，深夜还不断有群友兴奋地分享 AI 编程的成果。我说这就像打游戏一样。AI 编程能即时得到奖励反馈——写 prompt 就是出招，代码跑通就是通关，报错就是再来一局。这套多巴胺回路，和游戏的任务-奖励循环没什么两样，很容易让人上瘾。

## AI 的三大局限

首先，无论人类还是 AI，都有各自的局限。人类的局限在于算力——再聪明的大脑也算不过计算机。而 AI 的局限，我认为主要有三点：

1. 感知现实的能力有限；
2. 缺乏自驱力；
3. 还不能承担责任。

本来还想加上"记忆力与人类有差距"这一条，但这方面的项目迭代太快了。像 OpenClaw 的 Dreamer 模式（让 AI 在后台持续思考和记录）这类进展，或许用不了多久，记忆问题就不再是障碍了。

### 感知现实的鸿沟

先说感知现实的能力。目前 AI 的知识主要来自大模型训练时的数据——这些数据由人类投喂、标记，其质量直接决定 AI 输出的上限。AI 本身无法验证对错，缺少与现实世界的直接交互，这是幻觉的主要根源。它感知现实的通道，除了训练数据，就只剩下人类当下的输入了。

有人说还有互联网——可互联网本质上仍是人类输入的产物，只不过最初的目的并非为了训练 AI；也有人说未来会有机器人，但至少目前还未成气候，更何况我们讨论的是 AI 编程。

举一个自己踩过的坑。项目里有个前端资源依赖了 unpkg.com 的 CDN，国内用户加载极慢。我让 AI 优化，它给出的方案依次是：换 jsDelivr、加 `async` 标签、做资源预加载——全是面向海外场景的"标准答案"。它不知道国内有备案制度，不知道 unpkg 在国内基本不可达，也不知道哪些 CDN 节点在国内真正可用。最终是我基于过往的基础架构经验，自己设计了一套按请求来源做智能 CDN 分发的方案才解决。

这个例子很典型：AI 的知识来自训练数据，而训练数据里 90% 以上的工程实践是英文世界贡献的。它天然地"生在一张英语互联网里"，对中国的网络环境、合规要求、用户习惯几乎没有体感。这不是它不够聪明，而是它根本没有感知这个"现实切片"的通道。

同样的道理，OpenClaw 等工具（让 AI 能直接操作浏览器、文件系统、Shell 的智能 Agent）虽然能有效扩展 AI 在计算机领域的感知与执行边界，但它依然局限在屏幕之内。大量真实需求诞生于非数字化的场景——用户抱怨、竞品动态、政策变化——这些信息并不天然存在于 AI 能触及的网络范围内。你如果不喂给它，它就不知道。

既然 AI 感知现实的唯一实时通道是人类的输入，那沟通质量就变成了天花板。如今 Markdown 已被视为与大模型交流最友好的格式，微软近期开源的 MarkItDown 也因此备受关注——这款工具专门用于将各类文档转换为 Markdown 格式，其设计初衷正是为了让内容更好地被大语言模型理解。换句话说，格式的门槛正在被工具抹平，剩下的变量就是人本身的表达能力了。

个人的表达能力——尤其是书面表达——将直接决定与 AI 的协作效率。同一个需求，不同的描述方式，产出天差地别。举个例子：

> 模糊版本："帮我加个用户登录功能。"

AI 大概会给你一个用户名+密码的最简实现，没有 token 刷新，没有错误重试，没有安全策略。

> 清晰版本："实现用户登录模块，需求如下：
> 1. 支持邮箱+密码登录，密码 bcrypt 加盐，登录成功返回 JWT access token（15min）+ refresh token（7d）
> 2. 连续 5 次登录失败锁定账号 30 分钟，返回剩余锁定时间
> 3. /refresh 端点接受 refresh token，验证过期后返回新 token pair
> 4. /logout 端点将 refresh token 加入黑名单
> 5. 所有密码相关错误统一返回'邮箱或密码错误'，不暴露具体原因"

两份提示词的差距，就是一段勉强能跑的代码和一个能直接进 staging 的模块之间的差距。至于哪个版本更像有项目经验的人写出来的，一目了然。

### 自驱力的缺失

我原本用"驱动力"这个词，后来觉得范围太大（毕竟外部压力也是驱动力），于是改为"自驱力"——它才是决定上限的关键。当下的 AI 如同婴儿，衣食无忧，又缺乏对现实的完整感知，因此几乎没有自驱力。它编程的全部动力，来自人类的指令。

但凡用过 AI 编程的人都会发现：它从不会超越人类已有的知识边界，准确说，是它能在网络上找到的现有知识。面对成熟、文档完善的库，它得心应手——比如 React、Spring Boot、Django 这类生态繁荣的框架，AI 几乎不会犯基础错误。但遇到文档稀少、讨论冷门的库，表现则大打折扣。

最近用过某个冷门的上下文缓存 API，官方文档寥寥数页，社区里的讨论一只手数得过来。让 AI 写一个带缓存命中率监控的客户端，它信誓旦旦地生成了几百行代码，但把自动缓存当成了手动控制来设计，加了一堆不需要的缓存预热、手动失效逻辑，和你想要的命中率统计完全对不上——因为它没有真正的上下文理解能力，只能从有限的文档片段里硬猜。而一个有过缓存系统实战经验的人，扫一眼就能发现这几个切入点根本不对。

这就是 AI 知识获取方式的本质缺陷：它不是从第一性原理推导，而是在训练数据的分布里做插值。React、Spring Boot 这类数据密集的领域，插值结果精准；文档稀少的冷门库，数据稀疏，插值立刻崩。它不会像人一样说"这个库我没用过，但根据同类缓存系统的设计惯例，ttl 单位大概率是秒"——它没有这个推理链路。这也能反过来解释前面说的"焕发第二春"：AI 打包了所有"已有解"的部分，把它们压缩成了 token 燃烧即可调用的能力，但人类依然是唯一能处理"无解"和"首次求解"的存在。

这就是现状：AI 一板一眼地执行需求，创意和想法仍是人类独有的领地——这大概也是我们暂时不必过度惊慌的理由。

退一步说，即使未来 AI 有了某种形式的自驱力，它创造的上限仍然是重组已有知识——跨领域做远距离连接的能力极强，但从第一性原理推翻前提、重新定义问题，它做不到。这不是动机问题，是架构问题：LLM 的本质是在训练数据分布里做插值，插值得再精巧也跳不出分布边界。而人类那些真正改变范式的突破——相对论、现代主义、互联网协议——恰恰不是从已有知识里"插"出来的。所以，自驱力缺失只是 AI 不能创新的表层原因，底层原因是它根本没有"从零重构世界"的认知架构。

### 责任的归属

最后说"不能背锅"。这与自驱力紧密相关。自驱力可以来自内在目标，也可以来自外部的提问。AI 没有自驱力，它行动的动机完全取决于你。因此，做错了，责任天然在你。在社会权力结构中，AI 与人类并不对等，现有的体系尚未给它留出位置。它本质上仍是一个工具——只不过比以往任何工具都更好用罢了。

说个真实场景。以前线上出过一个 bug——用户头像上传后偶尔被裁成纯黑。查了半天，发现是 AI 生成的图片裁剪逻辑里，Canvas 的裁剪区域在图片未加载完时就执行了绘制，而且对非标准比例的图片没有做缩放适配——源图的裁剪坐标越界，Canvas 上留了大片未绘制的黑色背景。一个 code path 处理了缩略图（尺寸固定，恰巧不出问题），另一个处理原图裁剪的路径在极端比例下暴雷了。修是快修好了，但问题来了：谁引入了这个 bug？谁来为此负责？

你当然可以说是 AI 写的代码，但代码是谁审的？是谁点了 merge 的按钮？事故复盘会上，坐那儿解释"为什么没测到这个边界条件"的人还是你。AI 不用写复盘报告，更不用在周会上被 CTO 问"这个问题你打算怎么从流程上杜绝"。

所以，用 AI 写代码的人，最后都会明白一件事：代码可以 AI 写，但事故复盘会上，坐那儿解释的人还是你。

## 如何与 AI 共处：三条行动建议

想清楚这几点，就能更好地把握如何做好 AI 编程了。

### 1. 做好与 AI 的有效沟通

即便你有丰富的项目背景，也要意识到 AI 与人的差异，选择它更容易理解的方式交流。

首先，将需求拆解到足够细的颗粒度。前面登录模块的例子已经说明了这一点：模糊的一句话 vs 结构化的五条需求，产出质量不在一个量级。实际操作中我的习惯是：先花 5 分钟把需求写成一份不超过半页的需求清单，再喂给 AI。这 5 分钟的投资回报率高得惊人——它不是多费了工夫，而是省掉了后续反复沟通和修 bug 的时间。

其次，善用 Markdown 做结构化输入。段落标题、编号列表、代码块——这些格式能帮 AI 精准定位意图。很多人觉得这是在"伺候"AI，但换个角度看，这和写好的 commit message、画清晰的架构图是同一件事：把想法对齐成可执行的指令。这项能力，在项目管理、跨团队协作中同样通用。

### 2. 将重心转移到创意上

一个精准的问题、一个有价值的方向，才是你不可替代的核心价值。

当 AI 承担了越来越多的"实现"工作，人类的优势便愈发体现在"定义"上。什么叫"定义"？不是"帮我写个购物车"，而是想清楚：这个购物车的库存校验是在加购时做还是结算时做？优惠券的互斥规则怎么设计？并发减库存用乐观锁还是 Redis 队列？这些问题没有一个标准答案，它们的取舍取决于业务场景、团队能力、时间成本，而这不是 AI 能替你判断的事。

过去被认为更"能写"的那部分生产力，正在被 AI 快速接手；而资深程序员在"定义"问题上的经验优势，反而因此被放大了。因为定义问题靠的是判断力，判断力来自踩过的坑，而 AI 目前还没学会踩坑。

这有点像改革开放时的工厂：靠手艺吃饭的国企工人被流水线替代了——标准化、可复制、不再依赖个人经验。但流水线没有消灭工厂，反而让更多没有手艺的农民工进了城。AI 编程同理：手写代码的"手艺溢价"在跌，但定义问题、拆解需求、做判断的能力反而供不应求。

这个趋势不只存在于编程领域。AI 拉低了所有创作门类的技术门槛，正在催生一场"文艺大爆发"：普通人用即梦生成华强买瓜、雪山救狐、天庭三反骨大闹寂静岭，网文作者靠 AI 辅助把质量下限拉到了一个前所未有的高度。创意来自普通人，AI 负责把创意变成能看、能读的东西。

代码也是同样的逻辑。DeepSeek-TUI 的作者 Hunter Bown 原本是个音乐家：北得克萨斯州大学音乐教育本科，毕业后当了三年乐队指挥，后来又读了 MBA 和专利法，编程完全是半路出家、自学成才。他的曾祖父 Ralph Bown Sr. 是贝尔实验室的研发副总裁、无线电先驱，而他给自己的总结是："他是科学家，爱音乐；我是音乐家，爱科学。"他用 AI 辅助做出了 GitHub 近 5000 star 的终端编程 Agent，还在 2026 年五一用 DeepSeek 润色了一篇中文帖子向中国开发者喊话——"鲸鱼兄弟们好，我是做 DeepSeek-TUI 的那个美国佬"——帖子获得 37.5 万浏览，整个中国技术圈被一个美国人用地道的中文逗乐了。AI 没有取代他的创造力，反而让他一次性跨过了"不会写代码"和"不会说中文"两重技术悬崖。

{{< image src="/img/deepseek-tui.jpg" alt="DeepSeek-TUI 作者 Hunter Bown 的推文和项目截图" caption="Hunter Bown 的 DeepSeek-TUI 项目" width="500px" linked=false >}}

朱时茂最近谈过一个观点：AI 永远竞争不过演员的表演，因为演员的表演是真实的，AI 的表情是做出来的。他曾在春节用 AI 数字分身拜年，自己都感叹"太像了，也太不像话了"，但他也清醒地指出——"数字人能复刻我的五官，却复刻不了我演《牧马人》时对苦难的共情。"他说的是表演，但编程何尝不是？AI 生成的代码，语法正确、逻辑通顺，但它缺少一种"灵魂"——它总要从训练数据里找一个模板来套，而这个模板未必是最适合你当前场景的。因为 AI 没有在凌晨三点被报警电话叫醒的经历，没有和产品经理为"这个边界条件到底算不算 bug"争论过三个来回，也没有在重构后发现性能反而下降的那种懊恼。这些真实体验，才是你定义问题时做出正确取舍的直觉来源。

所以，不要担心 AI 会让你失业。你该担心的，是你是否停留在"只会写代码"的层面。往上走，去做定义问题的人。

五年后，决定一个产品成败的，不再是团队里谁代码写得最好，而是谁对问题理解得最深——因为所有人都能写代码了。

### 3. 坚持理解

这一点并非我的原创，而是来自 NGINX 核心团队成员洪志道的分享。他在一篇关于"2026 还需要继续坚持手搓代码吗"的回答中，讲了一个让我印象极深的故事——物理学家费曼小时候的经历：

> 我小时候，有个孩子指着一只鸟问我："你知道这是什么鸟吗？"我说不知道。他说："这是棕喉画眉。你爸爸什么都没教你吧？"
>
> 其实不是。我爸爸会指着一只鸟对我说："看到那只鸟了吗？它叫斯宾塞莺——不过这个名字是我随口编的。就算你知道它在全世界所有语言里的叫法，你对这只鸟本身还是一无所知。你知道的，只是不同地方的人怎么称呼它。"
>
> 接着他说："现在，我们来真正看看这只鸟。"他让我观察它怎么啄食，为什么总是梳理羽毛，飞起来的时候翅膀又是怎么动的。这些，才是真正关于这只鸟的知识。
>
> 这件事我记了一辈子：知道一个东西的名字，和真正理解它，是两回事。

我认为，坚持理解是承担责任的基石——你必须清楚 AI 生成的东西究竟在做什么。无论你是通过代码审查进行白盒验证，还是只做黑盒测试，都应如此。

我依然提倡有空读一读生成的代码。比如前面提到的 Prompt Caching 客户端，AI 写的代码虽然几个关键逻辑是错的，但它在错误重试策略上的实现方式反而给了我启发——它用了指数退避+抖动（jitter）的方案，比我原来手写的固定间隔重试更健壮。读代码既能规避潜在问题，又能学习你不熟悉的模式，这反过来又会提升你提需求的精准度与发现问题的敏感度。尤其在基础项目中，稳定性要求高，能参考的外部资料又远比 CRUD 类应用少，更要坚持检查。

有些人觉得有了 AI 技术就不再重要，我不是很认同。回到前面 unpkg CDN 的例子：AI 给的方案来自它能搜到的"常见做法"，但它搜不到的是国内用户的网络拓扑真实情况。这类判断，靠的不是查文档，而是多年踩坑积累下来的技术常识。越是基础的东西，AI 越难从表面文档里学到精髓，人类工程师的深度理解反而越有价值。

## 活反而更多了？

用了 AI 编程以后，老实说，活不仅没少，反而更多了。

以前我写一个功能，流程是：理解需求 → 查资料 → 写代码 → 自测 → 提 PR。现在变成了：理解需求 → 梳理成一页需求清单 → 与 AI 多轮对话迭代方案 → 审查 AI 生成的代码（包括检查边界、性能、安全性）→ 补写 AI 漏掉的测试用例（边界条件它基本覆盖不全）→ 验证 → 提 PR。每一步拆开来看都有价值，但加起来，花的时间未必比手写更少。

区别在于：同样花 4 个小时，以前的产出是"一段功能代码"，现在的产出是"一段功能代码 + 一份规格说明 + 一组测试用例 + 一份代码审查记录"。工作密度的提升远比效率的提升更明显。

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" width="100%" style="max-width:720px;display:block;margin:1.2em auto"><defs><linearGradient id="old" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient><linearGradient id="new" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#818cf8"/></linearGradient><linearGradient id="out" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#34d399"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-opacity="0.1"/></filter></defs><text x="20" y="28" fill="#64748b" font-size="14" font-weight="700" font-family="system-ui,sans-serif">以前</text><text x="60" y="28" fill="#94a3b8" font-size="12" font-family="system-ui,sans-serif">4 小时 → 1 项产出</text><g filter="url(#sh)"><rect x="20" y="38" width="112" height="52" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="1.2"/><text x="76" y="60" text-anchor="middle" fill="#475569" font-size="13" font-weight="600" font-family="system-ui,sans-serif">理解需求</text><text x="76" y="78" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">自己琢磨</text></g><line x1="132" y1="64" x2="144" y2="64" stroke="#94a3b8" stroke-width="1.5"/><polygon points="150,64 144,60 144,68" fill="#94a3b8"/><g filter="url(#sh)"><rect x="150" y="38" width="112" height="52" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="1.2"/><text x="206" y="60" text-anchor="middle" fill="#475569" font-size="13" font-weight="600" font-family="system-ui,sans-serif">查资料</text><text x="206" y="78" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">Google / 文档</text></g><line x1="262" y1="64" x2="274" y2="64" stroke="#94a3b8" stroke-width="1.5"/><polygon points="280,64 274,60 274,68" fill="#94a3b8"/><g filter="url(#sh)"><rect x="280" y="38" width="112" height="52" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="1.2"/><text x="336" y="60" text-anchor="middle" fill="#475569" font-size="13" font-weight="600" font-family="system-ui,sans-serif">写代码</text><text x="336" y="78" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">手写实现</text></g><line x1="392" y1="64" x2="404" y2="64" stroke="#94a3b8" stroke-width="1.5"/><polygon points="410,64 404,60 404,68" fill="#94a3b8"/><g filter="url(#sh)"><rect x="410" y="38" width="96" height="52" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="1.2"/><text x="458" y="60" text-anchor="middle" fill="#475569" font-size="13" font-weight="600" font-family="system-ui,sans-serif">自测</text><text x="458" y="78" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">跑一下 OK</text></g><line x1="506" y1="64" x2="518" y2="64" stroke="#94a3b8" stroke-width="1.5"/><polygon points="524,64 518,60 518,68" fill="#94a3b8"/><g filter="url(#sh)"><rect x="524" y="38" width="176" height="52" rx="8" fill="#fff" stroke="#94a3b8" stroke-width="1.2"/><text x="612" y="60" text-anchor="middle" fill="#475569" font-size="13" font-weight="600" font-family="system-ui,sans-serif">提 PR</text><text x="612" y="78" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="system-ui,sans-serif">完事，产出 = 一段功能代码</text></g><line x1="20" y1="110" x2="700" y2="110" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,4"/><text x="20" y="148" fill="#6366f1" font-size="14" font-weight="700" font-family="system-ui,sans-serif">现在</text><text x="60" y="148" fill="#818cf8" font-size="12" font-family="system-ui,sans-serif">4 小时 → 4 项产出（工作密度提升）</text><g filter="url(#sh)"><rect x="20" y="160" width="94" height="46" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2"/><text x="67" y="180" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="system-ui,sans-serif">理解需求</text><text x="67" y="196" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">梳理清单</text></g><line x1="114" y1="183" x2="124" y2="183" stroke="#6366f1" stroke-width="1.5"/><polygon points="130,183 124,179 124,187" fill="#6366f1"/><g filter="url(#sh)"><rect x="130" y="160" width="94" height="46" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2"/><text x="177" y="180" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="system-ui,sans-serif">AI 对话</text><text x="177" y="196" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">多轮迭代</text></g><line x1="224" y1="183" x2="234" y2="183" stroke="#6366f1" stroke-width="1.5"/><polygon points="240,183 234,179 234,187" fill="#6366f1"/><g filter="url(#sh)"><rect x="240" y="160" width="94" height="46" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2"/><text x="287" y="180" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="system-ui,sans-serif">审查代码</text><text x="287" y="196" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">边界 · 安全</text></g><line x1="334" y1="183" x2="344" y2="183" stroke="#6366f1" stroke-width="1.5"/><polygon points="350,183 344,179 344,187" fill="#6366f1"/><g filter="url(#sh)"><rect x="350" y="160" width="88" height="46" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2"/><text x="394" y="180" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="system-ui,sans-serif">补测试</text><text x="394" y="196" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">边界用例</text></g><line x1="438" y1="183" x2="448" y2="183" stroke="#6366f1" stroke-width="1.5"/><polygon points="454,183 448,179 448,187" fill="#6366f1"/><g filter="url(#sh)"><rect x="454" y="160" width="80" height="46" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2"/><text x="494" y="180" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="system-ui,sans-serif">验证</text><text x="494" y="196" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">端到端</text></g><line x1="534" y1="183" x2="544" y2="183" stroke="#6366f1" stroke-width="1.5"/><polygon points="550,183 544,179 544,187" fill="#6366f1"/><g filter="url(#sh)"><rect x="550" y="160" width="150" height="46" rx="6" fill="#fff" stroke="#6366f1" stroke-width="1.2"/><text x="625" y="180" text-anchor="middle" fill="#475569" font-size="11" font-weight="600" font-family="system-ui,sans-serif">提 PR</text><text x="625" y="196" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">附规格 + 测试</text></g><rect x="20" y="222" width="160" height="36" rx="6" fill="#fff" stroke="#10b981" stroke-width="1.2"/><text x="100" y="244" text-anchor="middle" fill="#10b981" font-size="12" font-weight="600" font-family="system-ui,sans-serif">功能代码</text><text x="192" y="244" fill="#10b981" font-size="14" font-family="system-ui,sans-serif">+</text><rect x="208" y="222" width="140" height="36" rx="6" fill="#fff" stroke="#10b981" stroke-width="1.2"/><text x="278" y="244" text-anchor="middle" fill="#10b981" font-size="12" font-weight="600" font-family="system-ui,sans-serif">规格说明</text><text x="360" y="244" fill="#10b981" font-size="14" font-family="system-ui,sans-serif">+</text><rect x="376" y="222" width="136" height="36" rx="6" fill="#fff" stroke="#10b981" stroke-width="1.2"/><text x="444" y="244" text-anchor="middle" fill="#10b981" font-size="12" font-weight="600" font-family="system-ui,sans-serif">测试用例</text><text x="524" y="244" fill="#10b981" font-size="14" font-family="system-ui,sans-serif">+</text><rect x="540" y="222" width="160" height="36" rx="6" fill="#fff" stroke="#10b981" stroke-width="1.2"/><text x="620" y="244" text-anchor="middle" fill="#10b981" font-size="12" font-weight="600" font-family="system-ui,sans-serif">代码审查记录</text><rect x="20" y="276" width="680" height="30" rx="6" fill="url(#new)"/><text x="360" y="296" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="system-ui,sans-serif">时间不变，产出翻四倍——你顺手把 PM + 测试的活全干了</text><text x="360" y="330" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">这就是新时代的"全栈"</text></svg>

实际上，我顺手把产品经理、项目协调人、测试、前后端的活儿全干了。

这大概是新时代的"全栈"吧。

回看开头提到的那种恐惧——被替代的恐惧——现在反而释然了。AI 确实越来越强，但它强在"做"，不在"判"。它能把一件事做得又快又好，但它不能替你决定该做什么、为什么要做。它不能替你为线上事故负责，也不能替你在凌晨三点感受到用户骂声背后的真实痛点。这些缺口，恰好就是人的位置。

所以，不必恐惧 AI 变强。该担心的，是你除了"会写代码"之外，什么都给不了。

下次用 AI 写代码之前，先花 3 分钟把需求写成一页需求清单。试试看，一周之后你会发现——不是 AI 变强了，是你变强了。

---

*本文是「AI杂谈」系列之一。下一篇：[AI 不会问第一个问题](/posts/ai-wont-ask-first-question/) —— 自驱力与创新，为什么人的护城河不在"做"而在"问"。*

