// BlogAI — shared on-device AI routing for the blog terminals.
// Used by both the homepage console-box and /html/terminal/ as a classic
// script exposing window.BlogAI. All rendering goes through the injected io
// adapter ({ write, writeln, prompt }) so each page keeps its own xterm.
//
// Engines:
//   'n2' = official Needle 2 WASM (default, English only — Chinese input is
//          translated on-device via the Chrome 138+ Translator API first)
//   'n1' = needle-rs 26M (handles Chinese — toggled by `ai2 on/off`,
//          persisted in localStorage)
window.BlogAI = (function () {
    'use strict';

    var CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
    var CN_NUM = { '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

    // needle-rs flat tool format
    var TOOLS_N1_JSON = JSON.stringify([
        {
            name: 'search_posts',
            description: 'Search blog posts by keyword or topic',
            parameters: { query: { type: 'string' } }
        },
        {
            name: 'list_recent_posts',
            description: 'List the most recent blog posts',
            parameters: {}
        },
        {
            name: 'list_posts_by_tag',
            description: 'List blog posts that have a specific tag',
            parameters: { tag: { type: 'string' } }
        },
        {
            name: 'describe_post',
            description: 'Get the summary of a specific blog post — use when the user asks what a post or article is about, or wants a brief introduction to it',
            parameters: { query: { type: 'string' } }
        }
    ]);

    // Needle 2 expects the OpenAI-style tool schema
    var TOOLS_N2_JSON = JSON.stringify([
        {
            name: 'search_posts',
            description: 'Search blog posts by keyword or topic',
            parameters: {
                type: 'object',
                properties: { query: { type: 'string', description: 'search keywords' } },
                required: ['query']
            }
        },
        {
            name: 'list_recent_posts',
            description: 'List the most recent blog posts',
            parameters: { type: 'object', properties: {} }
        },
        {
            name: 'list_posts_by_tag',
            description: 'List blog posts that have a specific tag',
            parameters: {
                type: 'object',
                properties: { tag: { type: 'string', description: 'tag name' } },
                required: ['tag']
            }
        },
        {
            name: 'describe_post',
            description: 'Get the summary of a specific blog post — use when the user asks what a post or article is about, or wants a brief introduction to it',
            parameters: {
                type: 'object',
                properties: { query: { type: 'string', description: 'topic or title keywords of the post' } },
                required: ['query']
            }
        }
    ]);

    function create(io) {
        var posts = [];
        var lastResults = [];
        var engine = 'n2';
        try { engine = localStorage.getItem('needle-engine') || 'n2'; } catch (e) {}
        var busy = false;
        var cancelled = false;
        var n1Worker = null;
        var n2Worker = null;
        // resolves the in-flight route promise early when cancel() fires
        var cancelHook = null;

        // ---------- index ----------

        // /index.json chunks each post into several entries (objectID with
        // ":N:M" suffixes) for lunr snippets — deduplicate by uri, keeping
        // the first chunk which holds the leading content
        function loadIndex() {
            return fetch('/index.json').then(function (r) { return r.json(); }).then(function (raw) {
                var byUri = new Map();
                for (var p of raw) {
                    if (!byUri.has(p.uri)) byUri.set(p.uri, p);
                }
                posts = Array.from(byUri.values());
                posts.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
                return posts.length;
            }).catch(function () { return 0; });
        }

        // ---------- keyword search ----------

        function scorePost(p, terms) {
            var hay = {
                title: (p.title || '').toLowerCase(),
                tags: (p.tags || []).join(' ').toLowerCase(),
                cats: (p.categories || []).join(' ').toLowerCase(),
                content: (p.content || '').toLowerCase()
            };
            var score = 0;
            for (var t of terms) {
                if (hay.title.includes(t)) score += 10;
                if (hay.tags.includes(t)) score += 8;
                if (hay.cats.includes(t)) score += 6;
                if (hay.content.includes(t)) score += 2;
            }
            return score;
        }

        function searchPosts(query) {
            var q = (query || '').toLowerCase().trim();
            if (!q) return [];
            // whitespace terms for latin, plus the raw string as one term for CJK
            var terms = q.split(/\s+/).filter(Boolean);
            // extract latin/digit runs too, so CJK-wrapped keywords like
            // 找一下deepseek的文章 still match as "deepseek"
            for (var m of q.matchAll(/[a-z0-9][a-z0-9._+-]*/g)) {
                if (!terms.includes(m[0])) terms.push(m[0]);
            }
            if (!terms.includes(q)) terms.push(q);
            return posts
                .map(function (p) { return { p: p, s: scorePost(p, terms) }; })
                .filter(function (x) { return x.s > 0; })
                .sort(function (a, b) { return b.s - a.s; })
                .slice(0, 8)
                .map(function (x) { return x.p; });
        }

        function printPosts(list) {
            lastResults = list;
            if (!list.length) {
                io.writeln('没有匹配的文章。换个关键词，或用 \x1b[1msem <查询>\x1b[0m 试试语义搜索？');
                return;
            }
            list.forEach(function (p, i) {
                // OSC 8 hyperlink: title itself is clickable
                var link = '\x1b]8;;' + location.origin + p.uri + '\x07\x1b[1;36m' + p.title + '\x1b[0m\x1b]8;;\x07';
                io.writeln('  \x1b[1;33m[' + (i + 1) + ']\x1b[0m ' + link);
                io.writeln('      \x1b[2m' + p.date + '  ' + (p.tags || []).join(', ') + '\x1b[0m');
            });
            io.writeln('\x1b[2m输入 open <序号> 打开对应文章\x1b[0m');
        }

        function describePost(p) {
            lastResults = [p];
            var link = '\x1b]8;;' + location.origin + p.uri + '\x07\x1b[1;36m' + p.title + '\x1b[0m\x1b]8;;\x07';
            io.writeln(link);
            io.writeln('\x1b[2m' + p.date + '  ' + (p.tags || []).join(', ') + '\x1b[0m');
            // index.json's content field holds the post's summary
            io.writeln((p.content || '').trim() || '（这篇文章没有简介）');
            io.writeln('\x1b[2m输入 open 1 阅读全文\x1b[0m');
        }

        function openResult(n) {
            var p = lastResults[n - 1];
            if (!p) {
                io.writeln('没有这个序号。先 search 或 ls 出结果。');
                return;
            }
            io.writeln('打开 \x1b[1;36m' + p.uri + '\x1b[0m ...');
            window.open(p.uri, '_blank');
        }

        // ---------- tools ----------

        function execBlogTool(name, args, rawInput) {
            switch (name) {
                case 'search_posts': {
                    var q = args.query || '';
                    io.writeln('\x1b[2m$ search_posts("' + q + '")\x1b[0m');
                    var results = searchPosts(q);
                    // the model can garble pure-CJK queries — retry with the
                    // original user input when its extraction found nothing
                    if (!results.length && rawInput && rawInput !== q) {
                        io.writeln('\x1b[2m$ search_posts("' + rawInput + '") (retry)\x1b[0m');
                        results = searchPosts(rawInput);
                    }
                    if (!results.length && /最近|最新|recent|latest|new/i.test(rawInput || q)) {
                        io.writeln('\x1b[2m$ list_recent_posts() (fallback)\x1b[0m');
                        results = posts.slice(0, 8);
                    }
                    printPosts(results);
                    break;
                }
                case 'list_recent_posts':
                    io.writeln('\x1b[2m$ list_recent_posts()\x1b[0m');
                    printPosts(posts.slice(0, 8));
                    break;
                case 'list_posts_by_tag':
                    io.writeln('\x1b[2m$ list_posts_by_tag("' + (args.tag || '') + '")\x1b[0m');
                    printPosts(posts.filter(function (p) { return (p.tags || []).includes(args.tag); }).slice(0, 8));
                    break;
                case 'describe_post': {
                    var dq = args.query || '';
                    io.writeln('\x1b[2m$ describe_post("' + dq + '")\x1b[0m');
                    var p = searchPosts(dq)[0];
                    if (!p) {
                        io.writeln('没找到相关文章。换个关键词试试？');
                        break;
                    }
                    describePost(p);
                    break;
                }
                default:
                    throw new Error('unknown tool: ' + name);
            }
        }

        // ---------- deterministic local intents ----------
        // The Needle models are function-calling routers, not chat models, so
        // greetings/identity/describe/anaphora intents are handled here in the
        // user's language. Each returns true when it handled the input.

        function smallTalk(input) {
            var t = input.trim();
            var zh = CJK_RE.test(t);
            var isGreeting = /^(hi|hello|hey|yo|你好|您好|嗨|哈喽|在吗|在么)[!！~。.\s]*$/i.test(t);
            var isIdentity = /(你是谁|你是什么|介绍一下你|你能做什么|你会什么|what are you|who are you|what can you do|introduce yourself)/i.test(t);
            if (!isGreeting && !isIdentity) return false;
            if (isGreeting) {
                io.writeln(zh
                    ? '你好！我是这个终端内置的端侧 AI，可以帮你找文章、列最新文章、介绍某篇讲了什么。有什么想找的？'
                    : 'Hi! I\'m the on-device AI in this terminal — I can find posts, list recent ones, or tell you what a post is about. What are you looking for?');
            } else {
                io.writeln(zh
                    ? '我是这个博客终端内置的端侧 AI，基于 Cactus Compute 的 Needle 模型，完全在你的浏览器里运行，不经过任何服务器或 LLM API。'
                    : 'I\'m the on-device AI built into this blog terminal, powered by Cactus Compute\'s Needle model — running entirely in your browser, no server or LLM API involved.');
                io.writeln(zh
                    ? '我能做的：按主题找文章（找一下 hugo 的文章）、列最新文章、按 tag 筛选、简要介绍某篇文章讲了什么。输入 help 查看全部命令。'
                    : 'What I can do: find posts by topic (find posts about hugo), list recent posts, filter by tag, and briefly introduce what a post is about. Type help for all commands.');
            }
            return true;
        }

        // "第一篇讲了什么" — resolve ordinals against the last result list
        function tryAnaphora(input) {
            var m = input.match(/第\s*([0-9]+|[一二两三四五六七八九十])\s*(篇|个|条)/);
            if (!m) return false;
            var n = /^[0-9]+$/.test(m[1]) ? parseInt(m[1], 10) : CN_NUM[m[1]];
            var p = lastResults[n - 1];
            if (!p) {
                io.writeln('没有上一次结果的第 ' + n + ' 篇。先 search 或 ls 出结果。');
                return true;
            }
            describePost(p);
            return true;
        }

        // "what is X about"-style questions — the small models' tool choice
        // for these is unstable, so extract keywords locally
        function tryDescribeIntent(input) {
            var t = input.trim();
            var kw = null, m;
            if ((m = t.match(/^what(?:\s+is|'s|s)\s+(.+?)\s+about[?？!！.\s]*$/i))) kw = m[1];
            else if ((m = t.match(/^tell me about\s+(.+?)[?？!！.\s]*$/i))) kw = m[1];
            else if ((m = t.match(/^(?:介绍一下?|简介|说说)\s*[：:]?\s*(.+?)[?？!！。\s]*$/))) kw = m[1];
            else if ((m = t.match(/^(.+?)(?:这篇?文章)?(?:讲了什么|讲什么|说了什么|是什么)[?？!！。\s]*$/))) kw = m[1];
            if (!kw) return false;
            // drop filler words so the keyword search hits the title/tags
            kw = kw.replace(/\b(the|this|that|article|post|articles|posts)\b/gi, ' ')
                   .replace(/的?文章/g, ' ')
                   .replace(/\s+/g, ' ').trim();
            execBlogTool('describe_post', { query: kw || t }, t);
            return true;
        }

        // split compound requests like "找 X 的文章并介绍第一篇" — conservative:
        // only explicit conjunctions, so "ci and cd" stays one query
        function splitCompound(input) {
            var parts = input.split(/，|；|然后|接着|并且|并(?=介绍|打开|描述|说说)|\s+and then\s+|\s+then\s+/i)
                .map(function (s) { return s.trim(); })
                .filter(Boolean);
            return parts.length > 1 ? parts : [input];
        }

        // ---------- workers ----------

        // inference runs in a module worker so the UI stays responsive
        function getN1Worker() {
            if (!n1Worker) {
                n1Worker = new Worker('/lib/needle-rs/worker.js', { type: 'module' });
            }
            return n1Worker;
        }

        // Needle 2 glue (needle.js) is a classic script, so a classic worker
        function getN2Worker() {
            if (!n2Worker) {
                n2Worker = new Worker('/lib/needle2/worker.js');
            }
            return n2Worker;
        }

        // ---------- spinner ----------

        function startSpinner(status0) {
            var frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            var fi = 0, status = status0, firstToken = false, line = '', stopped = false;
            var draw = function () { io.write('\r\x1b[2K\x1b[2m' + frames[fi] + ' ' + status + '\x1b[0m'); };
            draw();
            var timer = setInterval(function () {
                if (firstToken) return;
                fi = (fi + 1) % frames.length;
                draw();
            }, 80);
            return {
                setStatus: function (s) { status = s; },
                showToken: function (piece) {
                    firstToken = true;
                    line += piece;
                    var shown = line.length > 60 ? '…' + line.slice(-59) : line;
                    io.write('\r\x1b[2K\x1b[2m' + shown + '\x1b[0m');
                },
                stop: function () {
                    if (stopped) return;
                    stopped = true;
                    clearInterval(timer);
                    io.write('\r\x1b[2K');
                }
            };
        }

        // ---------- model routes ----------

        function needle1Route(input) {
            return new Promise(function (resolve) {
                var started = performance.now();
                var spinner = startSpinner('thinking');
                var done = false;
                function finish(fn) {
                    if (done) return;
                    done = true;
                    spinner.stop();
                    try { fn(); } finally { resolve(); }
                }
                cancelHook = function () { finish(function () { io.writeln('^C'); }); };

                var worker = getN1Worker();
                worker.onerror = function (ev) {
                    finish(function () {
                        io.writeln('\x1b[2m[needle] worker 错误（' + ev.message + '），按关键词搜索处理\x1b[0m');
                        printPosts(searchPosts(input));
                    });
                };
                worker.onmessage = function (ev) {
                    var msg = ev.data;
                    if (msg.type === 'progress') {
                        spinner.setStatus(msg.message);
                    } else if (msg.type === 'token') {
                        spinner.showToken(msg.piece);
                    } else if (msg.type === 'done') {
                        finish(function () {
                            io.writeln('\x1b[2m[needle] ' + (performance.now() - started).toFixed(0) + 'ms\x1b[0m');
                            try {
                                // the 26M model emits truncated CJK unicode escapes —
                                // strip malformed escapes before parsing (valid ones are kept)
                                var sanitized = msg.out.replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '');
                                var calls = JSON.parse(sanitized);
                                if (!Array.isArray(calls) || !calls.length) throw new Error('empty tool call');
                                for (var c of calls) execBlogTool(c.name, c.arguments || {}, input);
                            } catch (e) {
                                io.writeln('\x1b[2m[needle] 解析失败（' + e.message + '），按关键词搜索处理\x1b[0m');
                                printPosts(searchPosts(input));
                            }
                        });
                    } else if (msg.type === 'error') {
                        finish(function () {
                            io.writeln('\x1b[2m[needle] 解析失败（' + msg.message + '），按关键词搜索处理\x1b[0m');
                            printPosts(searchPosts(input));
                        });
                    }
                };
                worker.postMessage({ query: input, tools: TOOLS_N1_JSON });
            });
        }

        function needle2Route(input) {
            return new Promise(function (resolve) {
                // `started` is reset after translation so the final [needle2]
                // timing line reflects inference only — translation time is
                // reported on the translation trace line itself
                var started = performance.now();
                // no token stream — needle_complete returns in one shot
                var spinner = startSpinner('thinking');
                var done = false;
                function finish(fn) {
                    if (done) return;
                    done = true;
                    spinner.stop();
                    try { fn(); } finally { resolve(); }
                }
                function fallback(msg) {
                    finish(function () {
                        io.writeln(msg);
                        printPosts(searchPosts(input));
                    });
                }
                cancelHook = function () { finish(function () { io.writeln('^C'); }); };

                (async function () {
                    var query = input;
                    if (CJK_RE.test(input)) {
                        if (!('Translator' in self)) {
                            fallback('\x1b[2m[needle2] 仅支持英文输入（Chrome 138+ 可端侧翻译中文），已按关键词搜索；中文路由请 ai2 off 切回 Needle 1\x1b[0m');
                            return;
                        }
                        try {
                            spinner.setStatus('translating (on-device)');
                            var t0 = performance.now();
                            var translator = await self.Translator.create({ sourceLanguage: 'zh', targetLanguage: 'en' });
                            query = await translator.translate(input);
                            var transMs = performance.now() - t0;
                            spinner.setStatus('thinking');
                            // leave a visible trace of what the model actually got
                            if (query.trim() !== input.trim()) {
                                io.write('\r\x1b[2K');
                                io.writeln('\x1b[2m[needle2] 翻译: ' + input + ' → ' + query + '（' + transMs.toFixed(0) + 'ms）\x1b[0m');
                            }
                            started = performance.now();
                        } catch (e) {
                            fallback('\x1b[2m[needle2] 端侧翻译不可用（' + e.message + '），已按关键词搜索\x1b[0m');
                            return;
                        }
                    }
                    if (cancelled) { finish(function () {}); return; }

                    var worker = getN2Worker();
                    worker.onerror = function (ev) {
                        fallback('\x1b[2m[needle2] worker 错误（' + ev.message + '），按关键词搜索处理\x1b[0m');
                    };
                    worker.onmessage = function (ev) {
                        var msg = ev.data;
                        if (msg.type === 'progress') {
                            spinner.setStatus(msg.message);
                        } else if (msg.type === 'done') {
                            finish(function () {
                                io.writeln('\x1b[2m[needle2] ' + (performance.now() - started).toFixed(0) + 'ms\x1b[0m');
                                var out = null, calls = [];
                                try {
                                    out = JSON.parse(msg.out);
                                    calls = out.function_calls || [];
                                } catch (e) { /* fall through to the hint below */ }
                                if (!calls.length) {
                                    // needle2 chose to respond instead of calling a
                                    // tool — show its reason and nudge the user to
                                    // rephrase rather than dumping keyword results
                                    var reason = (((out && out.reasoning) || '') + '').trim();
                                    if (reason) {
                                        io.writeln('\x1b[2m[needle2] ' + (reason.length > 200 ? reason.slice(0, 200) + '…' : reason) + '\x1b[0m');
                                    }
                                    io.writeln('没理解这个请求。换个更准确的说法试试，比如：');
                                    io.writeln('  \x1b[1mfind posts about hugo\x1b[0m · \x1b[1mshow me recent posts\x1b[0m · \x1b[1mposts tagged ai\x1b[0m');
                                    io.writeln('\x1b[2m中文提问可 ai2 off 切回 Needle 1，或用 search <关键词> 直接搜。\x1b[0m');
                                    return;
                                }
                                for (var c of calls) {
                                    var args = c.arguments || {};
                                    if (typeof args === 'string') {
                                        try { args = JSON.parse(args); } catch (e) { args = {}; }
                                    }
                                    execBlogTool(c.name, args, input);
                                }
                            });
                        } else if (msg.type === 'error') {
                            fallback('\x1b[2m[needle2] 推理失败（' + msg.message + '），按关键词搜索处理\x1b[0m');
                        }
                    };
                    worker.postMessage({ query: query, tools: TOOLS_N2_JSON });
                })();
            });
        }

        // ---------- semantic search (opt-in, `sem` command) ----------

        var semPipeline = null;
        var semVectors = null;

        function cosine(a, b) {
            // vectors are L2-normalized, so the dot product is the cosine
            var s = 0;
            for (var i = 0; i < a.length; i++) s += a[i] * b[i];
            return s;
        }

        // on-device embeddings via transformers.js — bge-small-zh is only
        // ~24MB (int8) and handles our Chinese-heavy content well
        async function semSearch(query) {
            if (!query || !query.trim()) {
                io.writeln('用法: sem <查询>');
                return;
            }
            if (!semPipeline) {
                io.writeln('\x1b[2m[sem] 加载语义模型 bge-small-zh（24MB）...\x1b[0m');
                var t0 = performance.now();
                var mod = await import('https://fastly.jsdelivr.net/npm/@huggingface/transformers@3.7.6/+esm');
                // model is vendored under /lib/sem/ — same origin, no CORS or
                // huggingface.co reachability issues (hf-mirror sends no CORS
                // headers, so a runtime mirror fallback is not an option)
                mod.env.allowRemoteModels = false;
                mod.env.allowLocalModels = true;
                mod.env.localModelPath = '/lib/sem/';
                // wasm device defaults to dtype q8 → onnx/model_quantized.onnx
                semPipeline = await mod.pipeline('feature-extraction', 'bge-small-zh-v1.5');
                io.writeln('\x1b[2m[sem] 模型就绪（' + ((performance.now() - t0) / 1000).toFixed(1) + 's）\x1b[0m');
            }
            if (!semVectors) {
                io.writeln('\x1b[2m[sem] 计算 ' + posts.length + ' 篇文章的向量...\x1b[0m');
                var texts = posts.map(function (p) {
                    return (p.title || '') + '。' + (p.tags || []).join(' ') + '。' + (p.content || '');
                });
                var out = await semPipeline(texts, { pooling: 'mean', normalize: true });
                semVectors = out.tolist();
            }
            // bge models recommend an instruction prefix on the query side
            var qOut = await semPipeline(['为这个句子生成表示以用于检索相关文章：' + query], { pooling: 'mean', normalize: true });
            var qv = qOut.tolist()[0];
            var scored = semVectors
                .map(function (v, i) { return { p: posts[i], s: cosine(qv, v) }; })
                .sort(function (a, b) { return b.s - a.s; })
                .slice(0, 8);
            io.writeln('\x1b[2m[sem] 相关度: ' + scored.map(function (x) { return x.s.toFixed(2); }).join(' ') + '\x1b[0m');
            printPosts(scored.map(function (x) { return x.p; }));
        }

        // ---------- master route ----------

        async function route(input) {
            if (busy) return;
            busy = true;
            cancelled = false;
            try {
                var parts = splitCompound(input);
                for (var part of parts) {
                    if (cancelled) break;
                    if (smallTalk(part)) continue;
                    if (tryAnaphora(part)) continue;
                    if (tryDescribeIntent(part)) continue;
                    if (engine === 'n2') await needle2Route(part);
                    else await needle1Route(part);
                }
            } finally {
                busy = false;
                cancelled = false;
                cancelHook = null;
                io.prompt();
            }
        }

        // Ctrl+C: terminate the in-flight inference, rebuilding workers lazily
        // on the next query
        function cancel() {
            if (!busy) return false;
            cancelled = true;
            if (n1Worker) { n1Worker.terminate(); n1Worker = null; }
            if (n2Worker) { n2Worker.terminate(); n2Worker = null; }
            var h = cancelHook;
            cancelHook = null;
            if (h) h();
            return true;
        }

        function setEngine(v) {
            engine = v === 'n1' ? 'n1' : 'n2';
            try { localStorage.setItem('needle-engine', engine); } catch (e) {}
        }

        return {
            loadIndex: loadIndex,
            route: route,
            cancel: cancel,
            isBusy: function () { return busy; },
            getEngine: function () { return engine; },
            setEngine: setEngine,
            searchPosts: searchPosts,
            printPosts: printPosts,
            execBlogTool: execBlogTool,
            openResult: openResult,
            // semantic search runs through the same busy/prompt machinery as
            // model routes so the terminal doesn't double-prompt
            sem: async function (query) {
                if (busy) return;
                busy = true;
                try {
                    await semSearch(query);
                } catch (e) {
                    io.writeln('\x1b[2m[sem] 语义搜索不可用（' + e.message + '）\x1b[0m');
                } finally {
                    busy = false;
                    io.prompt();
                }
            },
            listPosts: function (tag) {
                printPosts(tag
                    ? posts.filter(function (p) { return (p.tags || []).includes(tag); }).slice(0, 8)
                    : posts.slice(0, 8));
            }
        };
    }

    return { create: create };
})();
