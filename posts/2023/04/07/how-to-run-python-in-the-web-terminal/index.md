# 如何在页面上跑一个Python终端？


细心的朋友可能已经发现我在首页终端上加上了`Now you can use the Python directly in this console!`这句话，是的，现在python命令已经加入了首页终端中！目前已支持基本库，未来看实际写作需要是否增加其它库的支持，可能会用来做一些分析图形变换显示什么的。

### 背景
之前我在博客里分享过如何使用asciinema来录制终端操作过程并在页面上很轻量级地演示，但是有些例子光看演示还不够，可能还需要实机操作，那么就回到了今天的主题：如何在页面上跑一个python终端（或者任意语言的实操环境）？

### 方案
经过一段时间搜集和分析，发现有以下几种方式：
- [python.org](https://python.org)官网的用的方式是通过websocket向在线服务[pythonanywhere](https://www.pythonanywhere.com/)的远程服务器通讯得到结果的；  
- [菜鸟教程网站](https://www.runoob.com/python/python-tutorial.html)和[廖雪峰网站](https://www.liaoxuefeng.com/wiki/1016959663602400/1017063826246112)里的python教程也都是采用的类似方法，只不过有区别的是直接通过http请求将代码发送到服务器来实现的；  
- [katacoda](https://katacoda.com/)被薅closed了就不提了，其实也是远程服务。
- 另外，根据原来做过的项目来看，xterm.js也确实能[通过websocket连接到docker容器](https://xtermjs.org/docs/api/addons/attach/)；  
  

但我们注意到他们都有个通病，就是要依赖远程服务，这对于“静态”博客来讲可太不友好了，而且还要保证沙盒的安全。

{{< admonition question "那有没有不依赖远程服务的方式呢？">}}
答案是：有！
{{< /admonition >}}

比较容易想到的一种方案是在网页上调用起浏览者本机的python，这里就要用到微软开源的[node-pty](https://github.com/Microsoft/node-pty)了，具体可以参考它的例子来实现。但是这有个明显的缺点，就是要浏览者事先准备好环境。

{{< admonition question "那有没有不依赖浏览者环境的方式呢？">}}
答案依然是：有！
{{< /admonition >}}

盘点最近几的技术潮流，我们可以注意到一项技术，那就是webassembly(简称wasm)，完全可以用wasm在页面上跑python代码嘛，还记得之前大火的在web页面执行python代码的项目[pyscript](https://pyscript.net/)吗？它就是基于wasm的接口项目[pyodide](https://pyodide.org/en/stable/index.html)实现的.

使用也很简单，调用`pyodide.runPython`就行：
```html
<!doctype html>
<html>
  <head>
      <script src="https://cdn.jsdelivr.net/pyodide/v0.23.0/full/pyodide.js"></script>
  </head>
  <body>
    Pyodide test page <br>
    Open your browser console to see Pyodide output
    <script type="text/javascript">
      async function main(){
        let pyodide = await loadPyodide();
        console.log(pyodide.runPython(`
            import sys
            sys.version
        `));
        pyodide.runPython("print(1 + 2)");
      }
      main();
    </script>
  </body>
</html>
```
可以点击前面的链接跳转到它的官方文档看看有什么其它用法，总之挺强大的，支持加载包括numpy的各种库。

以下是我基于pyodide写的一个在页面上模拟python终端的demo代码：

```html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Pyodide in xterm.js</title>
    <link rel="stylesheet" href="https://unpkg.com/xterm/css/xterm.css" />
    <script src="https://unpkg.com/xterm/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/pyodide/v0.23.0/full/pyodide.js"></script>
    <style>
        #terminal {
            display: flex;
            justify-content: center;
            margin: 10px 0 20px;
        }
    </style>
</head>

<body>
    <div id="terminal"></div>
    <script>
        const ENTER = '\r';
        const DEL = '\u007F';
        var term = new Terminal();
        term.open(document.getElementById('terminal'));
        var pyodide = null;

        var stdout_codes = [];
        function rawstdout(code) {
            stdout_codes.push(code);
        }

        async function startPyodide() {
            term.write('Starting Python...');
            pyodide = await loadPyodide();

            pyodide.runPythonAsync(`
                    import sys
                    sys.version
                `).then(output => {
                term.write('\rPython ' + output + '\r\n');
                term.prompt();
            });

            pyodide.setStdout({ raw: rawstdout, isatty: true });
        }

        term.prompt = () => {
            term.write('\r\x1b[01;32m>>> ');
        };
        var cmd = '';

        term.onData(e => {
            const printable = !e.altKey && !e.ctrlKey && !e.metaKey;
            switch (e) {
                case ENTER:
                    term.writeln('\x1b[0m');
                    if (cmd.length > 0) {
                        stdout_codes = []
                        pyodide.runPythonAsync(cmd).then(output => {
                            let result = new TextDecoder().decode(new Uint8Array(stdout_codes));
                            if (result.length > 0) {
                                term.write(result.replaceAll("\n", "\r\n"));
                            } else if (output != undefined) {
                                term.write(output + '\n');
                            }
                            term.prompt();
                        }).catch(err => {
                            term.write('\x1b[01;31m' + err.message.replaceAll('\n', '\r\n') + '\x1b[0m');
                            term.prompt();
                        });

                    } else {
                        term.prompt();
                    }
                    cmd = '';
                    break;
                case DEL:
                    if (term._core.buffer.x > 4) {
                        term.write('\b \b');
                        if (cmd.length > 0) {
                            cmd = cmd.substr(0, cmd.length - 1);
                        }
                    }
                    break;
                default:
                    if (printable) {
                        if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
                            cmd += e;
                            term.write(e);
                        }
                    }
            }
        });

        startPyodide();
    </script>
</body>

</html>
```

获取标准输出的这一段官方文档是没有例子的，我是在他们的[测试用例](https://github.com/pyodide/pyodide/blob/a038ac17d53458097386fd9393ee5202ac4ce193/src/tests/test_pyodide.py#L1281)里找到的如何设置和处理`setStdOut`的。

### 效果
效果如下，试试在里面敲你熟悉的python代码吧~：
<iframe height="450px" width="100%" frameborder=0 type="text/html" src="/html/pyodide/"></iframe>

### 总结
目前看这个基于wasm技术的方案依赖比较少，但其它方案也不是一无是处，一些复杂环境用远程方案可能更有优势。下次我们再细说wasm和衍生出来的一些技术。


