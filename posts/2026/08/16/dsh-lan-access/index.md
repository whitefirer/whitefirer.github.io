# 把 DeepSeek Harness 开放到局域网：手机访问的几个坑与解法清单


## 一、目标：让手机也能用局域网里的 dsh

DeepSeek Harness（dsh）的 web UI 默认绑 `127.0.0.1`，官方态度很明确：「`--host 0.0.0.0` 在远程访问具备鉴权层之前不予支持」。想从手机、平板访问，主流过渡方案是：**dsh 继续绑本地，前面架一个带鉴权的反向代理**（我挂在了自用的 agent 工作台 cenacle 里），局域网设备经代理访问。

PC 上一切正常。换成手机打开 `http://192.168.0.102:9101`，接连踩了两个坑：

1. 首页能出来，一点「打开工作区」就白屏报错：`crypto.randomUUID is not a function`
2. 修完白屏后，我自己写的 dsh 插件（[browser-fs](/posts/2026/08/15/dsh-plugin-browser-fs/)，让 agent 直接读你当前设备上的文件）在手机上点「授权目录」又失效：`showDirectoryPicker` 根本不存在

两个坑症状不同，根因是同一个：**安全上下文（Secure Contexts）规范**。

## 二、根因：安全上下文把 Web API 分成了两类

规范里「安全上下文」大致是：`https://` 页面、`localhost`/`127.0.0.1`（被特殊豁免）、`file://`。而 `http://192.168.0.102` 这种**局域网 IP + 明文 HTTP**，不算。

PC 上为什么没踩到？因为我习惯用 `http://localhost:9101` 访问——localhost 被豁免了。手机没有 localhost 可言，只能用局域网 IP，立刻现形。

关键认知是：受安全上下文限制的 API 其实分两类，命运完全不同——

| 类别 | 例子 | 非安全上下文下的表现 | 能否补救 |
|---|---|---|---|
| 纯函数/数据类 | `crypto.randomUUID`、`crypto.subtle` | 函数不存在 | **可以 polyfill**（有 `crypto.getRandomValues` 这个豁免原语兜底） |
| 权限/对话框门控类 | `showDirectoryPicker`（File System Access）、`getUserMedia`、Clipboard 读写、`Notification`、Service Worker | 整个 API 对象不存在 | **补不出来**，只能降级或上 HTTPS |

任何用了这些 API 的现代前端（Vite/React 生态里 UUID 库遍地都是），在「局域网 HTTP」场景下都是直接崩给你看，而不是温柔降级。

## 三、坑一的修复：在反代层注入 polyfill

三条路权衡：

**1. 给服务上 HTTPS。** 治本，但局域网场景代价不小：自签证书要在每台手机装根证书，或者搞内网域名 + DNS-01 签真证书。对「我自己在家用」属于杀鸡用牛刀（完整方案对比见第六节清单）。

**2. 改上游代码，去掉 randomUUID 依赖。** 不现实——这次是 dsh，下次是 code-server、别的什么工具，每个都打补丁没法维护，升级还丢。

**3. 在反向代理层注入 polyfill。** 代理本来就过手所有响应，给 HTML 统一注入一小段 `crypto.randomUUID` 的兼容实现即可。一次投入，所有挂载的工具受益，上游零改动。

我选了 3。代理本体是 `net/http/httputil.ReverseProxy`，关键在 `ModifyResponse` 钩子：只处理 `text/html`，把 polyfill 脚本插到 `<head>` 之后（要保证它在页面任何业务脚本之前执行）：

```go
ModifyResponse: func(resp *http.Response) error {
    if !strings.Contains(strings.ToLower(resp.Header.Get("Content-Type")), "text/html") {
        return nil
    }
    body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
    resp.Body.Close()
    if err != nil {
        return err
    }
    if loc := headRe.FindIndex(body); loc != nil {
        body = append(body[:loc[1]], append([]byte(polyfillSnippet), body[loc[1]:]...)...)
    } else {
        body = append([]byte(polyfillSnippet), body...)
    }
    resp.Body = io.NopCloser(bytes.NewReader(body))
    resp.ContentLength = int64(len(body))
    resp.Header.Set("Content-Length", strconv.Itoa(len(body)))
    resp.Header.Del("ETag") // 内容已变，旧摘要作废
    return nil
},
```

注意两个细节：改了 body 就要同步 `Content-Length`；`ETag` 必须摘掉，否则缓存校验会拿旧摘要说事。

polyfill 本体用 `crypto.getRandomValues` 实现（它**不受**安全上下文限制，这才是整个方案成立的关键），再老的浏览器退 `Math.random`：

```js
if (window.crypto && !crypto.randomUUID) {
  var grv = crypto.getRandomValues ? crypto.getRandomValues.bind(crypto) : null;
  crypto.randomUUID = function () {
    var b = grv ? grv(new Uint8Array(16)) : null;
    if (!b) { b = []; for (var i = 0; i < 16; i++) b.push(Math.floor(Math.random() * 256)); }
    b[6] = (b[6] & 15) | 64;   // version 4
    b[8] = (b[8] & 63) | 128;  // variant
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] < 16 ? "0" : "") + b[i].toString(16));
    var s = h.join("");
    return s.slice(0,8)+"-"+s.slice(8,12)+"-"+s.slice(12,16)+"-"+s.slice(16,20)+"-"+s.slice(20);
  };
}
```

### 一个顺手的坑：Accept-Encoding 删不掉

要改 body 就不能让上游返回压缩内容，直觉写法是在转发前删掉请求头：

```go
pr.Out.Header.Del("Accept-Encoding") // 不够！
```

实测上游照样收到 `gzip`。原因是 Go 的 `http.Transport` 看到出站请求**没有** `Accept-Encoding` 时会自作主张补一个 `gzip`（它本想帮你自动解压）。正确写法是显式声明不接受压缩：

```go
pr.Out.Header.Set("Accept-Encoding", "identity")
```

这个行为在文档里写着，但不踩一次很难记住。

单测覆盖了注入位置（必须在 `<head>` 之后）、`Content-Length` 同步、非 HTML 内容原样透传、以及上面那个 `Accept-Encoding` 断言。上线后手机再开工作区，正常加载——坑一解决。

## 四、坑二：授权按钮失效——不是所有 API 都能 polyfill

白屏修好后，轮到我写的 [browser-fs 插件](/posts/2026/08/15/dsh-plugin-browser-fs/)出问题：它依赖 `window.showDirectoryPicker` 让用户授权一个本地目录给 agent 读写。这个 API 属于上表右列——**整个对象在非安全上下文里根本不存在**，polyfill 无米下锅。

这类「权限门控」API 没有补丁可打，只有两条路：上 HTTPS，或者**应用层降级**。我给插件做了后者：

- 启动时检测 `typeof window.showDirectoryPicker === 'function'`，检测不到自动进入「兼容模式」（不要看 `isSecureContext` 标志位——我的反代 polyfill 恰好动过它，会误判）
- 兼容模式用 `<input type="file" webkitdirectory>` 选目录——这个老 API **不受**安全上下文限制，手机浏览器普遍支持；但 iOS 上目录选择形同虚设（返回 0 个文件），所以授权区是「选择目录 / 选多个文件」**双入口**，选不到会给明确错误提示而不是静默
- 选中后插件把文件列表整理成目录树，agent 照常列目录、读文件；文件预览（文本截断/图片 blob）两个模式同路径可用；降级体现在：**只读**（拿不到可写句柄，写操作返回明确错误）、**页面刷新后需重选**（没有句柄就没有 IndexedDB 持久化；目录树上的「↻」按钮在兼容模式下等价于重新选择目录）
- UI 上挂「兼容模式」徽标，并列出获得完整模式的三条途径（SSH 端口转发、Chrome flag、HTTPS）

效果是手机上从「完全不可用」变成「能让 agent 读我手机上的文件」——对「把资料丢给 agent 处理」这个主场景够用了。

## 五、不只我一个人踩到

这个坑有多普遍？dsh 开源不到 48 小时，社区里已经长出了一圈「曲线救国」的方案：

- `dsh-lan` 插件：一条 overlay 把 dsh web 绑到局域网，同时注入 `crypto.randomUUID` polyfill——和本文第三节一模一样的思路，只是注入点从反代换成了 dsh 自己的 HTML 变换钩子；
- `dsh-webui-auth` 插件：给核心包打补丁加会话闸门，还做了「升级后自动重打」的自救逻辑；
- Caddy basic-auth 一键包：密码保护 + systemd 常驻的运维向方案；
- 还有直接做多用户网关的（登录门户 + 每用户实例隔离）。

这些项目的 README 里几乎都能翻到同一句话的官方引用：「`--host 0.0.0.0` 在远程访问具备鉴权层之前不予支持」。大家都知道这些是过渡产物——但过渡期的需求是真实的，而过渡期里最先崩的那个报错，往往就是 `crypto.randomUUID`。

## 六、解法清单：局域网/手机访问内网服务

| 方案 | 能解决什么 | 代价 | 适用场景 |
|---|---|---|---|
| SSH 端口转发 `ssh -L 9101:127.0.0.1:9101 user@host` | 全部（localhost 豁免生效） | 每台设备一条隧道；手机要用 Termius/Termux 类 App，体验差 | 桌面调试 |
| Chrome `chrome://flags/#unsafely-treat-insecure-origin-as-secure` | 全部（把指定源标记为安全） | 逐浏览器设置；微信内置浏览器没门 | 安卓 Chrome 自用 |
| 反代注入 polyfill | 「可补」类 API（randomUUID 等） | 一次性实现，注意 Accept-Encoding | 内网统一挂载多个工具 |
| 应用层降级 | 「权限门控」类 API | 功能阉割（如只读） | 自己写的组件/插件 |
| 裸 VPN（WireGuard / ZeroTier） | **不能解决**——隧道加密≠安全上下文，浏览器只看 URL 的 scheme+host，`http://10.x.x.x` 走 VPN 依然白屏 | —— | 只解决「连得上」，不解决「跑得起」 |
| Tailscale Serve / Cloudflare Tunnel | 全部（自动签真证书的 HTTPS 域名） | 依赖第三方服务，流量路径出局域网 | 没域名也想零配置真 HTTPS |
| HTTPS 自签 + 点过警告 | 全部（`isSecureContext` 只看 scheme 不看证书有效性，点过去就是安全上下文） | 每个浏览器点一次警告；微信内置浏览器更烦 | 临时自用 |
| HTTPS + mkcert 根证书 | 全部，且无警告 | 每台设备装一次根 CA（iOS 要装描述文件并手动开信任） | 固定几台设备自用 |
| HTTPS + 域名 + DNS-01 真证书 | 全部，治本，且手机零配置 | 要有个域名，DNS 服务商配 API | 多人共用、长期运行 |

一个常见误解要特别说明：**VPN 本身不改变安全上下文**。WireGuard/ZeroTier 把流量加密送到对端，但浏览器看到的 URL 还是 `http://内网 IP`——它不知道也不关心底层链路加密了没有。能解决问题的是 Tailscale Serve、Cloudflare Tunnel 这类「VPN/隧道工具附带的 HTTPS 能力」：它们给你的是带真证书的 `https://` 域名，这才算数。

另一个常被问到的是**手机改 hosts**：Android 改 `/etc/hosts` 要 root，iOS 要越狱；无 root 的等价物是 Hosts Go、DNS66 这类「本地 VPN 型」App（代价是常驻一个 VPN 槽位），或者干脆不改手机——在路由器/PC 上跑 dnsmasq、AdGuard Home 当局域网 DNS。但 hosts/DNS 只解决「域名到 IP 的映射」，不解决安全上下文，它始终是真证书方案的配角。实际上多数时候连它都不需要：把域名的**公网 A 记录直接指向内网 IP**（如 `192.168.0.102`）即可——DNS-01 签证书只验证域名控制权、不要求公网可访问，手机拿到域名后走局域网直连，零配置无警告。唯一的坑是部分路由器默认开启「DNS 重绑定保护」会拦截这种解析，关掉或加白名单即可。

实战建议组合用：反代 polyfill 打底（覆盖工具类 API），自己写的组件做降级（兜住权限类 API），真要给多人长期用再上 HTTPS。

## 七、附：一个 Python 最小实现（单文件，带鉴权）

不想搭工作台的话，「HTTPS 反代 + 简单鉴权」一个 Python 脚本就够（完整版在 cenacle 仓库 `tests/debug/https_proxy.py`，约 150 行）。四个要点：

- **用 aiohttp 而不是标准库**——WebSocket 必须透传（dsh 的终端流走 WS，不透传就是哑终端），标准库手写帧转发不值得；
- 普通请求整源透传（零改写、流式回传），剥 hop-by-hop 头；
- Basic Auth：401 + `WWW-Authenticate` 头，浏览器自带弹窗，演示/自用足够；
- 443 对外 HTTPS，80 只做 301 跳转；<1024 端口要 root 或 `cap_net_bind_service`，调试期用 8443/8080 也一样。

核心代码：

```python
HOP = {"connection", "keep-alive", "te", "trailers",
       "transfer-encoding", "upgrade"}  # hop-by-hop 头必须剥掉

def check_auth(req, user, pwd):
    h = req.headers.get("Authorization", "")
    if h.startswith("Basic "):
        u, _, p = base64.b64decode(h[6:]).decode().partition(":")
        return u == user and p == pwd
    return False

async def proxy_http(req, upstream):
    sess = req.app["sess"]
    headers = {k: v for k, v in req.headers.items() if k.lower() not in HOP}
    async with sess.request(req.method, upstream + str(req.rel_url),
                            headers=headers, data=await req.read(),
                            allow_redirects=False) as up:
        out = web.StreamResponse(status=up.status)
        for k, v in up.headers.items():
            if k.lower() not in HOP:
                out.headers[k] = v
        await out.prepare(req)
        async for chunk in up.content.iter_any():
            await out.write(chunk)
        await out.write_eof()
        return out

async def proxy_ws(req, upstream):
    ws_in = web.WebSocketResponse()
    await ws_in.prepare(req)
    async with req.app["sess"].ws_connect(upstream + str(req.rel_url)) as ws_out:
        async def forward(src, dst):
            async for msg in src:
                if msg.type == WSMsgType.TEXT:
                    await dst.send_str(msg.data)
                elif msg.type == WSMsgType.BINARY:
                    await dst.send_bytes(msg.data)
                else:
                    break
        await asyncio.wait([asyncio.create_task(forward(ws_in, ws_out)),
                            asyncio.create_task(forward(ws_out, ws_in))],
                           return_when=asyncio.FIRST_COMPLETED)
    return ws_in
```

起服务：

```bash
pip install aiohttp
sudo python3 https_proxy.py --https-port 443 --http-port 80 \
  --cert ~/.cenacle/tls/fullchain.pem --key ~/.cenacle/tls/privkey.pem
```

如果你的开发机和我一样是 **Windows 宿主上的 QEMU Debian 虚拟机**（用户模式网络是 NAT，虚拟机拿到 `10.0.2.x`，局域网 IP 在 Windows 宿主上），虚拟机里监听好还不够，要让宿主的 443 能进虚拟机。QEMU 侧用 hostfwd 做端口转发——**运行中的虚拟机不用重启**，在 QEMU monitor 里热添加即可：

```
(qemu) hostfwd_add tcp::443-:443
(qemu) hostfwd_add tcp::80-:80
```

想永久生效再把同样的转发写进启动参数的 `-netdev user,id=n0,hostfwd=tcp::443-:443,...` 里。

再在 Windows 的管理员 PowerShell 里放行入站：

```powershell
New-NetFirewallRule -DisplayName "QEMU-HTTPS-443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

如果你的开发机是 **WSL2**，思路一样、工具不同——用 `netsh portproxy` 把 443 转发进 WSL：

```powershell
# 先看 443 有没有被旧规则占用，有就删了再加
netsh interface portproxy show all
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=localhost
New-NetFirewallRule -DisplayName "WSL2-HTTPS-443" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

（WSL 的 `connectaddress=localhost` 依赖其默认开启的 localhost 转发；不灵就换成 `ip addr` 里 WSL 的 eth0 地址，但它会随 WSL 重启变化。）

curl 实测四连：无鉴权 `401`（带 `WWW-Authenticate` 触发浏览器弹窗）→ basic auth 后 `200` 拿到 dsh 页面 → `http://` 请求 301 跳 https → WS 升级 `101` 正常透传。手机打开 `https://cenacle.whitefirer.org`（点过自签警告）即是完整安全上下文。

### 插曲：域名访问触发 dsh 的 DNS-rebinding 防御

页面能开不代表完事——一点「打开目录」就 403。对照实验（都是 `POST /api/host.listDirectory`）：

| Host | Origin | 结果 |
|---|---|---|
| `127.0.0.1:3080`（直连） | 无 | 200 |
| IP 字面量 | IP 字面量 | 200 |
| IP 字面量 | `cenacle.whitefirer.org` | **403** |
| `cenacle.whitefirer.org` | 无 | **403** |

dsh 对 Host 和 Origin 各查一遍：**非 localhost/IP 字面量一律 403**——这是 DNS-rebinding 防御，防的是恶意网站把公用域名指到 `127.0.0.1` 来打你本机服务。它宁可错杀我这种「域名指内网 IP」的场景。

修法在反代侧：转发时把 Host 改写成上游地址、剥掉 Origin（缺失的 Origin 反而放行——这条只挡「带错」不挡「没带」）。cenacle 的 Go 代理就是这么做的，上面 Python 版的 `skip` 清单也加了 `host`/`origin` 两个键。301 跳转腿不用处理——浏览器拿到新地址会自己重发。

## 八、收尾

这个问题的有趣之处在于：它只在「跨设备 + 明文 HTTP + 现代前端」三个条件叠加时出现，PC 开发自测完全覆盖不到。如果你也有局域网手机访问的服务，值得主动做两件事：

1. 拿真手机打开 Console 看一眼，别等用户报白屏；
2. 把代码里用到的现代 API 按「可 polyfill / 权限门控」分成两类，前者反代统一补，后者设计好降级路径。

以及，过渡方案终究是过渡方案——等官方鉴权落地，这些脚手架都可以体面退役。

