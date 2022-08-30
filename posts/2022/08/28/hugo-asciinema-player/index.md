# 如何在Hugo博客中使用终端播放器Asciinema-Player


[Asciinema-Player](https://github.com/asciinema/asciinema-player)是一款著名的的终端录制播放器，可用于播放[asciinema](https://asciinema.org)录制的播放文件，经常被用来进行终端操作演示。这里也将其引入到了当前Hugo博客中使用，下面我将讲讲引入的过程。

### 1.效果展示  
{{< admonition tip "Talk is cheap, show the result ~" >}}
这里直接借用官方demo进行展示。
{{< asciinema src="https://asciinema.org/a/335480.cast" cols="120" rows="35" preload="1" poster="npt:1:58" title="Hello asciinema!" >}}
{{< /admonition >}}

### 2.需求分析  
{{< admonition question "为什么需要在Hugo里面使用终端播放器Asciinema-Player呢？" >}}
作为技术人员，在写博客时总是需要进行一些终端操作演示，而演示方式无非以下几种：

方式 | 优点 | 缺点
---------|----------|---------
 视频 | 能配音配特效 | 网站流量消耗大，不能复制文本 |
 动图 | 文件相对小些 | 不能控制进度，不能复制文本 | 
 代码 | 占用流量小，能复制 | 不能控制进度，也不太好展示效果 |

而终端录制播放器Asciinema-Player则兼容体积小、能控制、能复制于一体并能完美复现终端操作场景，非常适合用于在博客中进行一些终端操作演示。
{{< /admonition >}}

<!-- {{< asciinema key="zsh-kubectl-prompt" cols="115" rows="35" preload="1" poster="npt:47" title="zsh-kubectl-prompt" >}} -->

<!-- {{< asciinema src="https://d33wubrfki0l68.cloudfront.net/b336354cd000e05055825ec4ade7866f95032a7f/9ed74/casts/asciinema-missing-glyphs.cast" cols="400" rows="10" preload="1" poster="npt:3" >}} -->

<!-- {{< asciinema src="https://helix-editor.com/430253.cast" cols="120" rows="35" preload="1" poster="npt:55">}} -->

### 3.解决方案  
首先，在网上找下前人在Hugo博客里扩展嵌入asciinema-player的方法，比如 [Embedding asciinema cast in your Hugo site](https://jenciso.github.io/blog/embedding-asciinema-cast-in-your-hugo-site/)。

#### shortcode
可以找到里面asciinema-player的shortcode代码如下：  
```python
<p>
    <asciinema-player
        src="/casts/{{ with .Get "key" }}{{ . }}{{ end }}.cast"
        cols="{{ if .Get "cols" }}{{ .Get "cols" }}{{ else }}640{{ end }}"
        rows="{{ if .Get "rows" }}{{ .Get "rows" }}{{ else }}10{{ end }}"
        {{ if .Get "autoplay" }}autoplay="{{ .Get "autoplay" }}"{{ end }}
        {{ if .Get "preload" }}preload="{{ .Get "preload" }}"{{ end }}
        {{ if .Get "loop" }}loop="{{ .Get "loop" }}"{{ end }}
        start-at="{{ if .Get "start-at" }}{{ .Get "start-at" }}{{ else }}0{{ end }}"
        speed="{{ if .Get "speed" }}{{ .Get "speed" }}{{ else }}1{{ end }}"
        {{ if .Get "idle-time-limit" }}idle-time-limit="{{ .Get "idle-time-limit" }}"{{ end }}
        {{ if .Get "poster" }}poster="{{ .Get "poster" }}"{{ end }}
        {{ if .Get "font-size" }}font-size="{{ .Get "font-size" }}"{{ end }}
        {{ if .Get "theme" }}theme="{{ .Get "theme" }}"{{ end }}
        {{ if .Get "title" }}title="{{ .Get "title" }}"{{ end }}
        {{ if .Get "author" }}author="{{ .Get "author" }}"{{ end }}
        {{ if .Get "author-url" }}author-url="{{ .Get "author-url" }}"{{ end }}
        {{ if .Get "author-img-url" }}author-img-url="{{ .Get "author-img-url" }}"{{ end }}
    ></asciinema-player>
</p>
```

细细口味了下这段代码，结合自己需求进行了修改： 
{{< admonition note "Talk is cheap, show me the code ~" >}}
```python {linenos=table,hl_lines=["4-5", 14],linenostart=1}
# themes/iLoveIt/layouts/shortcodes/asciinema.html
<p>
    <asciinema-player
        {{- with .Get "src" }} src="{{ . }}" {{ end -}}
        {{- with .Get "key" }} src="/casts/{{ . }}.cast"{{ end -}}
        cols="{{ if .Get "cols" }}{{ .Get "cols" }}{{ else }}640{{ end }}"
        rows="{{ if .Get "rows" }}{{ .Get "rows" }}{{ else }}10{{ end }}"
        {{- with .Get "autoplay" }}autoplay="{{ . }}"{{ end -}}
        {{- with .Get "preload" }}preload="{{ . }}"{{ end -}}
        {{- with .Get "loop" }}loop="{{ . }}"{{ end -}}
        start-at="{{ if .Get "start-at" }}{{ .Get "start-at" }}{{ else }}0{{ end }}"
        speed="{{ if .Get "speed" }}{{ .Get "speed" }}{{ else }}1{{ end }}"
        {{- with .Get "idle-time-limit" }}idle-time-limit="{{ . }}"{{ end -}}
        {{- with .Get "poster" }} poster="{{ . | safeURL }}"{{ end -}}
        {{- with .Get "font-size" }}font-size="{{ . }}"{{ end -}}
        {{- with .Get "theme" }}theme="{{ . }}"{{ end -}}
        {{- with .Get "title" }}title="{{ . }}"{{ end -}}
        {{- with .Get "author" }}author="{{ . }}"{{ end -}}
        {{- with .Get "author-url" }}author-url="{{ . }}"{{ end }}
        {{- with .Get "author-img-url" }}author-img-url="{{ . }}"{{ end -}}
        fit="{{ if .Get "fit" }}{{ .Get "fit" }}{{ else }}width{{ end }}"
    ></asciinema-player>
    {{- .Page.Scratch.SetInMap "this" "asciinema" true -}}
</p>
```
{{< /admonition >}}

注意看高亮部分，主要修改了以下几点：  
{{< admonition tip "修改点" >}}
1. `if .Get` 形式代码过于累赘，这里把不需要取默认值的语句统统改成了`with .Get`形式；
2. 只有固定的`key`方法从本站获取`.cast`录制文件，这里扩展了`src`以便从站外获取录制文件地址；
3. `poster`这里会得到一个奇怪的数据`#ZgotmplZ`，它是一个安全防护的默认数据，见[官方说明](https://github.com/golang/go/blob/19309779ac5e2f5a2fd3cbb34421dafb2855ac21/src/html/template/error.go#L41)，会导致设置指定时间封面无效，解决起来也简单，加上`| safeURL`管道方法就可解决；
{{< /admonition >}}

#### js、css  
参考方案里动态引入`js`和`css`，用到的该播放器的文章里需设置`asciinema`为`true`：
```python {linenos=table,hl_lines=[1],linenostart=1}
{{ if .Params.asciinema }}
    <script src="{{ .Site.BaseURL }}js/asciinema-player.js"></script>
{{ end }}
```

```yaml {linenos=table,hl_lines=[4],linenostart=1}
---
title: Kubernetes Backup - ARK
description: Kubernetes backup process using ark
asciinema: true
tags:
  - kubernetes
  - backup
---
```
可以看到上面是通过在文章里加`asciinema`参数实现的`js`、`css`资源动态加载，其实可以参考其它如`mermaid`的接入方式，直接在渲染时置标记就好：
```python {linenos=table,hl_lines=[3],linenostart=122}
# themes/iLoveIt/layouts/partials/assets.html
{{- /* asciinema */ -}}
{{- if (.Scratch.Get "this").asciinema | or $params.draft -}}
    {{- $source := "lib/asciinema/asciinema-player.min.css" -}}
    {{- dict "Source" $source "Fingerprint" $fingerprint | dict "Scratch" .Scratch "Data" | partial "scratch/style.html" -}}
    {{- $source := "lib/asciinema/asciinema-player.min.js" -}}
    {{- dict "Source" $source "Fingerprint" $fingerprint | dict "Scratch" .Scratch "Data" | partial "scratch/script.html" -}}
{{- end -}}
```
其中`$params.draft`是为了开发模式下也能设置草稿参数进行预览:
```yaml {linenos=table,hl_lines=[5],linenostart=53}
# themes/iLoveIt/assets/data/cdn/jsdelivr.yml
  gitalkJS: gitalk@1.7.2/dist/gitalk.min.js
  # valine@1.5.0 https://valine.js.org/
  valineJS: valine@1.5.0/dist/Valine.min.js
  asciinemaJS: asciinema-player@3.0.1/dist/index.min.js
  # cookieconsent@3.1.1 https://github.com/osano/cookieconsent
  cookieconsentCSS: cookieconsent@3.1.1/build/cookieconsent.min.css
  cookieconsentJS: cookieconsent@3.1.1/build/cookieconsent.min.js
```
调整下`css`样式，让播放器能够在超出显示区域时滚动过去：
```css {linenos=table,hl_lines=[16, "18-21", 35],linenostart=137}
/* themes/iLoveIt/assets/lib/asciinema/asciinema-player.min.css */
.asciinema-terminal {
  box-sizing: content-box;
  -moz-box-sizing: content-box;
  -webkit-box-sizing: content-box;
  padding: 0px;
  margin: 0px;
  display: block;
  white-space: pre;
  word-wrap: normal;
  word-break: normal;
  border-radius: 5px;
  border-style: solid;
  cursor: pointer;
  border-width: 0.3em;
  font-family: Consolas, Menlo, 'Bitstream Vera Sans Mono', monospace, 'Powerline Symbols', 'Terminal Glyphs';
  line-height: 1.3333333333em;
  width: auto;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}
.asciinema-terminal .line {
  letter-spacing: normal;
  overflow: hidden;
  height: 1.3333333333em;
}
.asciinema-terminal .line span {
  padding: 0;
  display: inline-block;
  height: 1.3333333333em;
}
.asciinema-terminal .line {
  display: block;
  width: 4000px;
}
```

#### font
可以注意到`font-family`额外加了`Terminal Glyphs`，这也可参考了 [Custom Fonts in Asciinema](https://www.tonylykke.com/posts/2018/06/18/custom-fonts-in-asciinema/)。
主要是为了不至于出现下文中乱码的问题。正常如下：
{{< asciinema src="https://d33wubrfki0l68.cloudfront.net/b336354cd000e05055825ec4ade7866f95032a7f/9ed74/casts/asciinema-missing-glyphs.cast" cols="400" rows="10" preload="1" poster="npt:3" >}} 

### 4.使用方法
#### asciinema-player
asciinema-player即播放器，在博客中使用只需简单在文章中加入以下代码：
```python
{{< asciinema src="https://helix-editor.com/430253.cast" cols="115" rows="35" preload="1" poster="npt:55">}}
```
其中，`cols`、`rows`分别为行列，`preload`则是要不要预加载，`poster`则是封面，有`data`模式也有`npt`模式，`npt`即按时间截取封面，上面的就是截取`55`秒时的终端作为封面。
另外还有`speed`：播放速度，`autoplay`：自动播放等参数，具体可参考[asciinema-player](https://github.com/asciinema/asciinema-player)设置

呈现效果如下（借用了[helix-editor](https://helix-editor.com/)的演示，文件大些可能加载慢些）：
{{< asciinema src="https://helix-editor.com/430253.cast" cols="120" rows="35" preload="1" poster="npt:55">}}

点击播放按钮播放，可拖动进度条或者使用方向键控制播放进度。

#### asciinema
上述终端播放所使用的`cast`文件，都是使用asciinema在终端录制的。

##### 安装
```bash
brew install asciinema
```
##### 使用
```yaml
➜  ~ asciinema --help
usage: asciinema [-h] [--version] {rec,play,cat,upload,auth} ...

Record and share your terminal sessions, the right way.

positional arguments:
  {rec,play,cat,upload,auth}
    rec                 Record terminal session
    play                Replay terminal session
    cat                 Print full output of terminal session
    upload              Upload locally saved terminal session to asciinema.org
    auth                Manage recordings on asciinema.org account

options:
  -h, --help            show this help message and exit
  --version             show program's version number and exit

example usage:
  Record terminal and upload it to asciinema.org:
    asciinema rec
  Record terminal to local file:
    asciinema rec demo.cast
  Record terminal and upload it to asciinema.org, specifying title:
    asciinema rec -t "My git tutorial"
  Record terminal to local file, limiting idle time to max 2.5 sec:
    asciinema rec -i 2.5 demo.cast
  Replay terminal recording from local file:
    asciinema play demo.cast
  Replay terminal recording hosted on asciinema.org:
    asciinema play https://asciinema.org/a/difqlgx86ym6emrmd8u62yqu8
  Print full output of recorded session:
    asciinema cat demo.cast

For help on a specific command run:
  asciinema <command> -h
```
另外如果想将其转化为gif动图，也可以使用[asciicast2gif](https://github.com/asciinema/asciicast2gif)。

### 5.总结
通过以上实践，虽然过程有些曲折，但最终还是顺利地将asciinema-player终端播放器引入到了hugo中使用，后续发布的博客也将经常见到其身影。
