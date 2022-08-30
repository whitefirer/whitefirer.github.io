# 高效终端命令行工具


{{< admonition tip "导语" >}}
**工欲善其事，必先利其器。**
{{< /admonition>}}

作为一个技术人员，一个高效果的工作环境尤为重要。下面分享下我的终端命令行下的环境和工具配置。

#### zsh&oh-my-zsh
##### 安装    
参考：https://ohmyz.sh/

##### 插件
###### 语法高亮（zsh-syntax-highlighting） 
```bash
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

###### 自动补全（zsh-autosuggestions） 
```bash
git clone git://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions
```

###### 集群环境显示（zsh-kubectl-prompt)  
可参考https://github.com/whitefirer/workspace/blob/main/.zshrc进行配置：
```bash
# .zshrc
function right_prompt() {
  local color="blue"

  if [[ "$ZSH_KUBECTL_NAMESPACE" =~ "system" ]]; then
    color="yellow"
  fi

  if [[ "$ZSH_KUBECTL_CONTEXT" =~ "desktop" || "$ZSH_KUBECTL_CONTEXT" =~ "dev" ]]; then
    color="green"
  fi

  if [[ "$ZSH_KUBECTL_CONTEXT" =~ "prod" ]]; then
    color="red"
  fi

  echo "%{$terminfo[bold]$fg[$color]%}\u2638($ZSH_KUBECTL_PROMPT)%{$reset_color%}"
}
RPROMPT='$(right_prompt)'
```
成功后会显示如下：
{{< asciinema key="zsh-kubectl-prompt" cols="115" rows="35" preload="1" poster="npt:47" title="zsh-kubectl-prompt" >}} 
其中`cni-test`为自己在`kubeconfig`中给`context`取的名字，可自行修改。
里面的`ctx`和`ns`均为`krew`插件。

#### kubectl备忘录
##### kubectl安装&操作
其它可参考：https://kubernetes.io/docs/tasks/tools/#install-kubectl

更多相关备忘：https://kubernetes.io/zh/docs/reference/kubectl/cheatsheet/

##### kubectl插件（krew）
参考：https://krew.sigs.k8s.io/

##### kubectl高亮（kubecolor）
可以参考https://github.com/hidetatz/kubecolor readme里的做法，alias成k或者kubectl。

#### 其它
##### 终端复用（tmux）
GitHub：https://github.com/tmux/tmux

参考：https://www.ruanyifeng.com/blog/2019/10/tmux.html


##### 高级cat（bat)
参考：https://github.com/sharkdp/bat/blob/master/doc/README-zh.md

##### 高级模糊查找（fzf）
参考：https://github.com/junegunn/fzf#preview-window

右侧的预览是结合了前面的bat命令。

##### 高级ls（exa）
###### 安装
参考：https://github.com/ogham/exa

##### 高级top（htop）
###### 安装
```
brew install htop
```

##### json高亮（jq）
```
brew install jq
```

##### json高亮及折叠（fx）
###### 安装
```
brew install fx
```

###### 官网
https://github.com/antonmedv/fx

##### yaml高亮（yh）
当然有使用kubecolor的话，kubectl也用不上yh，但是其它命令场景还是可以用的。

###### 安装
```
brew install yh
```

