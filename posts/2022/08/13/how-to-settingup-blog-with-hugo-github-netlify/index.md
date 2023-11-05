# 如何使用Hugo+Github+Netlify搭建博客


### 背景
原来的博客网站是用wordpress搭建在云服务器上，甚至曾经用过朋友的服务器，几经迁移，极易丢失数据，现在流行用github托管博客，这样博客数据就更有保障了，同时也可以利用Git Action更为方便地构建网站内容了。

### 方案
{{< mermaid >}}
flowchart LR
Write[New Post] -->|Git Push| GitHub(Github Action)
GitHub -->|Build| Files[Static Files]
Files -->|Update| Pages[Github Pages]
Netlify <-->|Watch| Pages
Netlify -->|Deploy| Public
{{< /mermaid >}}

通过配置 Github Action 来编译构建我们的网站文件并发布到 Github Pages 。  
与此同时，通过 Netlify 监听 Github 仓库的变化，同步更新部署到 Netlify App 网站。  
当然其中每个步骤都可以替换或同时有其它方式，如流水线也可以用circleci之类的，网站托管也可以用nginx服务器、SCF云函数、OSS对象存储等方式。

#### 构建流水线（Github Action）
Github Action 的 [workflows](https://github.com/whitefirer/mysite/blob/main/.github/workflows/build-and-sync-website.yml) 配置文件如下：
```yaml
# mysite/.github/workflows/build-and-sync-website.yml
name: build

on:  # 触发时机
  workflow_dispatch: # 手动触发
  push: # 代码提交触发
    branches: # 在哪个分支
      - main	# 在main分支
  pull_request: # PR提交时触发

jobs: # 工作流
  build: # 工作名称
    runs-on: ubuntu-latest
    steps:
        - name: Checkout
          uses: actions/checkout@v2
          with:
              submodules: true
              fetch-depth: 0

        - name: Setup Hugo
          uses: peaceiris/actions-hugo@v2
          with:
              hugo-version: "latest"
              extended: true

        - name: Build Web
          run: hugo -v --gc

        - name: Deploy Web to Github Pages
          uses: peaceiris/actions-gh-pages@v3
          with:
              PERSONAL_TOKEN: ${{ secrets.BLOG_TOKEN }}
              EXTERNAL_REPOSITORY: whitefirer/whitefirer.github.io
              PUBLISH_BRANCH: main
              PUBLISH_DIR: ./public
              commit_message: ${{ github.event.head_commit.message }}

        # - uses: manyuanrong/setup-ossutil@v2.0
        #   with:
        #     # endpoint 可以去oss控制台上查看
        #     endpoint: "oss-cn-hongkong.aliyuncs.com"
        #     # 使用我们之前配置在secrets里面的accesskeys来配置ossutil
        #     access-key-id: ${{ secrets.ACCESS_KEY_ID }}
        #     access-key-secret: ${{ secrets.ACCESS_KEY_SECRET }}
        # - name: Deply Web To OSS
        #   run: ossutil cp public oss://blog-whitefirer/ -rf
```

#### 徽章（Badge）
```markdown
[![Netlify Status](https://api.netlify.com/api/v1/badges/8aeed089-7b2c-4ebe-84e9-8df704f39948/deploy-status)](https://app.netlify.com/sites/whitefirer/deploys)
[![GitHub](https://github.com/whitefirer/mysite/actions/workflows/build-and-sync-website.yml/badge.svg)](https://github.com/whitefirer/mysite/actions/workflows/build-and-sync-website.yml)
```
效果如下：  
[![Netlify Status](https://api.netlify.com/api/v1/badges/8aeed089-7b2c-4ebe-84e9-8df704f39948/deploy-status)](https://app.netlify.com/sites/whitefirer/deploys)
[![GitHub](https://github.com/whitefirer/mysite/actions/workflows/build-and-sync-website.yml/badge.svg)](https://github.com/whitefirer/mysite/actions/workflows/build-and-sync-website.yml)

可以通过观测显示的样式来确认网站更新状态，也可以点击徽章后查看构建和发布的日志详情。

#### HTTPS域名证书（Let's Encrypt CA）
域名证书这里用的免费证书，当然也可以购买证书。

### 总结
整个方案较简单，维护起来也容易，每次变更通过Git提交即可自动触发构建部署。  
后面有时间了我再分享下网站功能和主题的开发扩展。

