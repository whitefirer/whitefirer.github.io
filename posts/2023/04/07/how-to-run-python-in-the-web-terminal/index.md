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

盘点最近几的技术潮流，我们可以注意到一项技术，那就是webassembly(简称wasm)，完全可以用wasm在页面上跑python代码嘛，还记得之前大火的在web页面执行python代码的项目[pyscript](https://pyscript.net/)吗？它就是基于wasm的接口项目[pyodide](https://pyodide.org/en/stable/index.html)实现的。

使用也很简单，调用`pyodide.runPython`就行：
```html
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Pyodide in xterm.js</title>
    <link rel="stylesheet" href="https://unpkg.com/xterm/css/xterm.css" />
    <script src="https://unpkg.com/xterm@5.1.0/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/pyodide/v0.23.0/full/pyodide.js"></script>
    <style>
        #terminal {
            display: flex;
        }
    </style>
</head>

<body>
    <div id="terminal"></div>
    <script>
        const ENTER = '\r';
        const DEL = '\u007F';
        const VK_UP = '\x1b[A';
        const VK_DOWN = '\x1b[B';
        const VK_RIGHT = '\x1b[C';
        const VK_LEFT = '\x1b[D';
        var pyodide = null;
        var pythonCodeX = 0;
        var pythonCodeY = 0;
        var historyCodeList = [];
        var lastPythonCodeLine = "";
        var renderingCode = false;
        var stdout_codes = [];
        function rawstdout(code) {
            stdout_codes.push(code);
        }

        var term = new Terminal();
        term.open(document.getElementById('terminal'));

        async function startPyodide() {
            term.write('Starting Python...');
            pyodide = await loadPyodide();
            await pyodide.loadPackage("pygments")

            pyodide.runPythonAsync(`
                    import sys
                    from pygments import highlight
                    from pygments.lexers import PythonLexer
                    from pygments.formatters import TerminalTrueColorFormatter
                    sys.version + ' (https://whitefirer.org)'
                `).then(output => {
                term.write('\rPython ' + output + '\r\n');
                term.prompt();
            });

            pyodide.setStdout({ raw: rawstdout, isatty: true });
        }

        term.prompt = () => {
            term.write('\r\x1b[01;32m>>> ');
        };
        var pythonCode = '';
        var blockFlag = "";
        var blockMap = {
            ":": "\r",
            "\\": "\r",
            "{": "}",
            "[": "]",
            "(": ")",
        }
        var historyIndex = 0;
        var historyCode = "";
        var lastCRIndex = 0;
        function setCursorPosition(x, y) {
            term.write(`\x1b[${y};${x}H`)
        }

        async function writeHightPythonCode(x, y, pythonCode) {
            // term.write(e);
            setCursorPosition(x, y);
            await pyodide.runPythonAsync(`
                _PY_code = """
                ${pythonCode.replaceAll("\\", "\\\\")}
                """
                _PY_highlighted_code = highlight(_PY_code, PythonLexer(), TerminalTrueColorFormatter(style='native'));
                _PY_highlighted_code[:-1]
            `).then(output => {
                term.write(output.replaceAll('\n', '\r\n... '));
            });
        }

        function earseCureentLinePythonCode() {
            if (pythonCodeY === (term.buffer._normal.cursorY + term.buffer._normal.baseY + 1)) {
                term.write('\r\x1b[2K\x1b[01;32m>>> ');
            } else if (term.buffer._normal.cursorX > 4) {
                term.write('\r\x1b[2K... ');
            } else {
                term.write('\r\x1b[2K');
            }
        }


        term.onData(e => {
            const printable = !e.altKey && !e.ctrlKey && !e.metaKey;
            switch (e) {
                case VK_LEFT:
                    if (term.buffer._normal.cursorX > 4) {
                        setCursorPosition(term.buffer._normal.cursorX, term.buffer._normal.cursorY + 1);
                    }
                    break;
                case VK_RIGHT:
                    lastCRIndex = pythonCode.lastIndexOf('\r');
                    lastPythonCodeLine = pythonCode.substring(lastCRIndex + 1, pythonCode.length + 1);
                    if (term.buffer._normal.cursorX < (lastPythonCodeLine.length % term.cols + 4)) {
                        setCursorPosition(term.buffer._normal.cursorX + 2, term.buffer._normal.cursorY + 1);
                    }
                    break;
                case VK_UP:
                    if (historyCodeList.length === 0) {
                        break;
                    }
                    if (pythonCode.length === 0) {
                        pythonCodeX = term.buffer._normal.cursorX + 1;
                        pythonCodeY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                    }
                    historyCode = "";
                    historyIndex += 1;
                    if (historyIndex > (historyCodeList.length + 1)) {
                        historyIndex = historyCodeList.length + 1;
                    } else if (historyIndex != (historyCodeList.length + 1)) {
                        historyCode = historyCodeList[historyCodeList.length - historyIndex]
                    }
                    earseCureentLinePythonCode();
                    lastCRIndex = pythonCode.lastIndexOf('\r');
                    pythonCode = pythonCode.substring(0, lastCRIndex + 1) + historyCode;
                    if (historyCode.length > 0) {
                        writeHightPythonCode(5, pythonCodeY - term.buffer._normal.baseY, pythonCode)
                    }
                    break;
                case VK_DOWN:
                    if (historyCodeList.length === 0) {
                        break;
                    }
                    if (pythonCode.length === 0) {
                        pythonCodeX = term.buffer._normal.cursorX + 1;
                        pythonCodeY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                    }
                    historyCode = "";
                    historyIndex -= 1;
                    if (historyIndex < 0) {
                        historyIndex = 0;
                    } else if (historyIndex === 0) {
                        historyCode = lastPythonCodeLine;
                    }
                    else {
                        historyCode = historyCodeList[historyCodeList.length - historyIndex]
                    }
                    earseCureentLinePythonCode();
                    lastCRIndex = pythonCode.lastIndexOf('\r');
                    pythonCode = pythonCode.substring(0, lastCRIndex + 1) + historyCode;
                    if (historyCode.length > 0) {
                        writeHightPythonCode(5, pythonCodeY - term.buffer._normal.baseY, pythonCode)
                    }
                    break;
                case ENTER:
                    if (pythonCode.length > 0) {
                        historyIndex = 0;
                        let pythonCodeList = pythonCode.split('\r');
                        let lastLine = pythonCodeList[pythonCodeList.length - 1];
                        if (lastLine.length > 0) {
                            historyCodeList = historyCodeList.concat(lastLine)
                        }
                        if (((pythonCode[pythonCode.length - 1] in blockMap)) && (blockFlag === "")) {
                            blockFlag = pythonCode[pythonCode.length - 1];
                            pythonCode += e;
                            term.writeln("\r");
                            term.write('... ');
                            break;
                        }
                        if (blockFlag != "") {
                            if (pythonCode[pythonCode.length - 1] === blockMap[blockFlag]) {
                                blockFlag = "";
                            } else {
                                pythonCode += e;
                                term.writeln("\r");
                                term.write('... ');
                                break;
                            }
                        }
                        term.writeln('\x1b[0m');

                        stdout_codes = []
                        pyodide.runPythonAsync(pythonCode).then(output => {
                            let result = new TextDecoder().decode(new Uint8Array(stdout_codes));
                            if (result.length > 0) {
                                term.write(result.replaceAll("\n", "\r\n"));
                            } else if (output != undefined) {
                                term.write(output + '\n');
                            }
                            term.prompt();
                        }).catch(err => {
                            // term.write('\x1b[01;31m' + err.message.replaceAll('\n', '\r\n') + '\x1b[0m');
                            pythonCode = ""
                            pyodide.runPythonAsync(`
                                _PY_code = """
                                ${err.message.replaceAll('\n', '\r')}
                                """
                                _PY_highlighted_code = highlight(_PY_code, PythonLexer(), TerminalTrueColorFormatter(style='one-dark'));
                                _PY_highlighted_code[:-1]
                            `).then(output => {
                                term.write(output.replaceAll('\n', '\r\n') + '\n')
                                term.prompt();
                            })
                        });

                    } else {
                        term.writeln('\x1b[0m');
                        term.prompt();
                    }
                    pythonCode = '';
                    break;
                case DEL:
                    lastCRIndex = pythonCode.lastIndexOf('\r');
                    lastPythonCodeLine = pythonCode.substring(lastCRIndex + 1, pythonCode.length + 1);
                    if (term._core.buffer.x > 4 || lastPythonCodeLine.length >= term.cols - 4) {
                        let currentCursorY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                        let lasetEditIndex = term.buffer._normal.cursorX - 4;
                        let editIndex = lasetEditIndex;
                        if (lastPythonCodeLine.length >= term.cols - 4) {
                            editIndex = lasetEditIndex + (currentCursorY - pythonCodeY) * term.cols
                        }
                        pythonCode = pythonCode.substring(0, lastCRIndex + 1) + lastPythonCodeLine.slice(0, editIndex - 1) + lastPythonCodeLine.slice(editIndex);
                        term.write('\x1b[?25l');
                        earseCureentLinePythonCode();
                        writeHightPythonCode(pythonCodeX, pythonCodeY - term.buffer._normal.baseY, pythonCode).then(() => {
                            if (lastPythonCodeLine.length === term.cols - 4) {
                                setCursorPosition(term.cols, currentCursorY - term.buffer._normal.baseY - 1);
                            } else {
                                setCursorPosition(lasetEditIndex + 4, currentCursorY - term.buffer._normal.baseY);
                            }
                            term.write('\x1b[?25h'); // Show cursor
                        });
                    }

                    break;
                default:
                    if (printable) {
                        if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
                            if (renderingCode === true) {
                                break;
                            }
                            renderingCode = true;
                            if (pythonCode.length === 0) {
                                pythonCodeX = term.buffer._normal.cursorX + 1;
                                pythonCodeY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                            }
                            let currentCursorY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                            lastCRIndex = pythonCode.lastIndexOf('\r');
                            let lasetEditIndex = term.buffer._normal.cursorX - 4;
                            let editIndex = lasetEditIndex;
                            lastPythonCodeLine = pythonCode.substring(lastCRIndex + 1, pythonCode.length + 1);
                            if (lastPythonCodeLine.length >= term.cols - 4) {
                                editIndex = lasetEditIndex + (currentCursorY - pythonCodeY) * term.cols;
                            }
                            lastPythonCodeLine = lastPythonCodeLine.slice(0, editIndex) + e + lastPythonCodeLine.slice(editIndex)
                            pythonCode = pythonCode.substring(0, lastCRIndex + 1) + lastPythonCodeLine;
                            term.write('\x1b[?25l');
                            writeHightPythonCode(pythonCodeX, pythonCodeY - term.buffer._normal.baseY, pythonCode).then(() => {
                                if ((lasetEditIndex + 6) > term.cols) {
                                    setCursorPosition(0, currentCursorY - term.buffer._normal.baseY + 1);
                                } else {
                                    setCursorPosition(lasetEditIndex + 6, currentCursorY - term.buffer._normal.baseY);
                                }
                                term.write('\x1b[?25h'); // Show cursor
                                renderingCode = false;
                            });
                        }
                    }
            }
        });

        startPyodide();
    </script>
</body>

</html>
```
#### 输出获取  
值得注意的是，Python终端的输出显示有两种，一种是打印输出，一种是变量结果显示。  
获取标准输出的这一段官方文档是没有例子的，我是在他们的[测试用例](https://github.com/pyodide/pyodide/blob/a038ac17d53458097386fd9393ee5202ac4ce193/src/tests/test_pyodide.py#L1281)里找到的如何设置和处理`setStdOut`的。  
初始化：  
```javascript
var stdout_codes = [];
function rawstdout(code) {
    stdout_codes.push(code);
}
pyodide.setStdout({ raw: rawstdout, isatty: true });
```
获取打印结果：
```javascript
let result = new TextDecoder().decode(new Uint8Array(stdout_codes));
if (result.length > 0) {
    term.write(result.replaceAll("\n", "\r\n")); // 打印时针对换行特殊处理下
}
```

执行结果可以直接通过返回的`output`获取，里面的其它变量也可以通过`globals`获取。

#### 多行代码  
```javascript
var blockFlag = "";
var blockMap = {
    ":": "\r",
    "\\": "\r",
    "{": "}",
    "[": "]",
    "(": ")",
}

term.onData(e => {
    const printable = !e.altKey && !e.ctrlKey && !e.metaKey;
    switch (e) {
        case ENTER:
            if (pythonCode.length > 0) {
                if (((pythonCode[pythonCode.length - 1] in blockMap)) && (blockFlag === "")) {
                    blockFlag = pythonCode[pythonCode.length - 1];
                    pythonCode += e;
                    term.writeln("\r");
                    term.write('... ');
                    break;
                }
                if (blockFlag != "") {
                    if (pythonCode[pythonCode.length - 1] === blockMap[blockFlag]) {
                        blockFlag = "";
                    } else {
                        pythonCode += e;
                        term.writeln("\r");
                        term.write('... ');
                        break;
                    }
                }
            ...
            }
        ...
    }
});
```
多行支持的关键点在于第一次换行时最后一个字符是否需要多行的支持，并且需要一个字符来标记结束，我们通过一个map来映射这样的关系。  

#### 插入编辑  
```javascript
 function setCursorPosition(x, y) {
    term.write(`\x1b[${y};${x}H`)
}

function earseCureentLinePythonCode() {
    if (pythonCodeY === (term.buffer._normal.cursorY + term.buffer._normal.baseY + 1)){
        term.write('\r\x1b[2K\x1b[01;32m>>> ');
    } else if (term.buffer._normal.cursorX > 4) {
        term.write('\r\x1b[2K... ');
    } else {
        term.write('\r\x1b[2K');
    }
}

term.onData(e => {
    const printable = !e.altKey && !e.ctrlKey && !e.metaKey;
    switch (e) {
        case VK_LEFT:
            if (term.buffer._normal.cursorX > 4) {
                setCursorPosition(term.buffer._normal.cursorX, term.buffer._normal.cursorY + 1);
            }
            break;
        case VK_RIGHT:
            lastCRIndex = pythonCode.lastIndexOf('\r');
            lastPythonCodeLine = pythonCode.substring(lastCRIndex + 1, pythonCode.length + 1);
            if (term.buffer._normal.cursorX < (lastPythonCodeLine.length%80 + 4)) {
                setCursorPosition(term.buffer._normal.cursorX + 2, term.buffer._normal.cursorY + 1);
            }
            break;
        ...
        case DEL:
            lastCRIndex = pythonCode.lastIndexOf('\r');
            lastPythonCodeLine = pythonCode.substring(lastCRIndex + 1, pythonCode.length + 1);
            if (term._core.buffer.x > 4 || lastPythonCodeLine.length >= term.cols - 4) {
                let currentCursorY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                let lasetEditIndex = term.buffer._normal.cursorX - 4;
                let editIndex = lasetEditIndex;
                if (lastPythonCodeLine.length >= term.cols - 4) {
                    editIndex = lasetEditIndex + (currentCursorY - pythonCodeY) * term.cols
                }
                pythonCode = pythonCode.substring(0, lastCRIndex + 1) + lastPythonCodeLine.slice(0, editIndex-1) + lastPythonCodeLine.slice(editIndex);
                term.write('\x1b[?25l');
                earseCureentLinePythonCode();
                writeHightPythonCode(pythonCodeX, pythonCodeY - term.buffer._normal.baseY, pythonCode).then(() => {
                    if (lastPythonCodeLine.length === term.cols - 4) {
                        setCursorPosition(term.cols, currentCursorY - term.buffer._normal.baseY - 1);
                    } else {
                        setCursorPosition(lasetEditIndex + 4, currentCursorY - term.buffer._normal.baseY);
                    }
                    term.write('\x1b[?25h'); // Show cursor
                });
            }
        
            break;
        default:
            if (printable) {
                if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
                    if (renderingCode === true) {
                        break;
                    }
                    renderingCode = true;
                    if (pythonCode.length === 0) {
                        pythonCodeX = term.buffer._normal.cursorX + 1;
                        pythonCodeY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                    }
                    let currentCursorY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                    lastCRIndex = pythonCode.lastIndexOf('\r');
                    let lasetEditIndex = term.buffer._normal.cursorX - 4;
                    let editIndex = lasetEditIndex;
                    lastPythonCodeLine = pythonCode.substring(lastCRIndex + 1, pythonCode.length + 1);
                    if (lastPythonCodeLine.length >= term.cols - 4) {
                        editIndex = lasetEditIndex + (currentCursorY - pythonCodeY) * term.cols;
                    }
                    lastPythonCodeLine = lastPythonCodeLine.slice(0, editIndex) + e + lastPythonCodeLine.slice(editIndex)
                    pythonCode = pythonCode.substring(0, lastCRIndex + 1) + lastPythonCodeLine;
                    term.write('\x1b[?25l');
                    writeHightPythonCode(pythonCodeX, pythonCodeY - term.buffer._normal.baseY, pythonCode).then(() => {
                        if ((lasetEditIndex + 6) > term.cols) {
                            setCursorPosition(0, currentCursorY - term.buffer._normal.baseY + 1);
                        } else {
                            setCursorPosition(lasetEditIndex + 6, currentCursorY - term.buffer._normal.baseY);
                        }
                        term.write('\x1b[?25h'); // Show cursor
                        renderingCode = false;
                    });
                }
            }
    }
});
```
这里用到的的技巧有利用终端控制符来移动光标位置、光标显隐和清除当前行，其它的主要就是记往编辑位置进行字符串处理。  

#### 历史翻页  
```javascript
term.onData(e => {
        const printable = !e.altKey && !e.ctrlKey && !e.metaKey;
        switch (e) {
            case VK_UP:
                if (historyCodeList.length === 0) {
                    break;
                }
                if (pythonCode.length === 0) {
                    pythonCodeX = term.buffer._normal.cursorX + 1;
                    pythonCodeY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                }
                historyCode = "";
                historyIndex += 1;
                if (historyIndex > (historyCodeList.length + 1)) {
                    historyIndex = historyCodeList.length + 1;
                } else if (historyIndex != (historyCodeList.length + 1)) {
                    historyCode = historyCodeList[historyCodeList.length - historyIndex]
                }
                earseCureentLinePythonCode();
                lastCRIndex = pythonCode.lastIndexOf('\r');
                pythonCode = pythonCode.substring(0, lastCRIndex + 1) + historyCode;
                if (historyCode.length > 0) {
                    writeHightPythonCode(5, pythonCodeY - term.buffer._normal.baseY, pythonCode)
                }
                break;
            case VK_DOWN:
                if (historyCodeList.length === 0) {
                    break;
                }
                if (pythonCode.length === 0) {
                    pythonCodeX = term.buffer._normal.cursorX + 1;
                    pythonCodeY = term.buffer._normal.cursorY + term.buffer._normal.baseY + 1;
                }
                historyCode = "";
                historyIndex -= 1;
                if (historyIndex < 0) {
                    historyIndex = 0;
                } else if (historyIndex === 0) {
                    historyCode = lastPythonCodeLine;
                } 
                else {
                    historyCode = historyCodeList[historyCodeList.length - historyIndex]
                }
                earseCureentLinePythonCode();
                lastCRIndex = pythonCode.lastIndexOf('\r');
                pythonCode = pythonCode.substring(0, lastCRIndex + 1) + historyCode;
                if (historyCode.length > 0) {
                    writeHightPythonCode(5, pythonCodeY - term.buffer._normal.baseY, pythonCode)
                }
                break;
            case ENTER:
                if (pythonCode.length > 0) {
                    historyIndex = 0;
                    let pythonCodeList = pythonCode.split('\r');
                    let lastLine = pythonCodeList[pythonCodeList.length - 1];
                    if (lastLine.length > 0) {
                        historyCodeList = historyCodeList.concat(lastLine)
                    }
                    ...
                }
                ...
                break;
            ...
        }
});
```
这里也用到了终端控制符，另外就是用了一个字符串数组来记录历史代码行，主要要注意以下几点：
1. 上下边界判断；
2. 复原正在编辑的代码；
3. 多行代码里行首不同；
4. 回车后记得清除索引；
5. 超出终端高度计算相对位置；

#### 代码着色  
另外相比官方的Python终端，我还借助`pygments`库给代码们加上了着色，代码如下：  
```javascript
pyodide.runPythonAsync(`
    import sys
    from pygments import highlight
    from pygments.lexers import PythonLexer
    from pygments.formatters import TerminalTrueColorFormatter
    _PY_code = """
    ${pythonCode.replaceAll("\\", "\\\\")}
    """
    _PY_highlighted_code = highlight(_PY_code, PythonLexer(), TerminalTrueColorFormatter(style='native'));
    _PY_highlighted_code[:-1]
`).then(output => {
    term.write(output.replaceAll('\n', '\r\n... '))
}) // 注意，示例代码中我把python代码中的库引入放到pyodide的初始化中去了
```
主要注意点就是这里的字符串转义和输出显示换行。
`pygments`还支持多种语言着色（包括python的错误异常信息着色），除了终端着色以外还支持以`html`、`svg`、`img`等多种输出格式，具体可前往其[pygments.org](https://pygments.org)官网查看。

### 效果
效果如下，试试在里面敲你熟悉的python代码吧~：
<iframe height="450px" width="100%" frameborder=0 type="text/html" src="/html/pyodide/"></iframe>

### 总结
目前看这个基于wasm技术的方案依赖比较少，但其它方案也不是一无是处，一些复杂环境用远程方案可能更有优势。下次我们再细说wasm和衍生出来的一些技术。


