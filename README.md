# 个人生活记录站（零依赖纯静态）

写 Markdown → `git push` → 自动部署到 GitHub Pages。免费、安全、自带 RSS。

## 目录结构

```
personal-site/
├── content/            # 你的文章（.md 文件）
├── assets/style.css    # 站点样式
├── build.js            # 零依赖构建脚本
├── .github/workflows/  # GitHub Pages 自动部署
└── dist/               # 构建产物（自动生成，不用手动改）
```

## 本地预览

```bash
node build.js
# 然后用浏览器打开 dist/index.html
```

## 写一篇新文章

在 `content/` 新建 `YYYY-MM-DD-标题.md`：

```md
---
title: 文章标题
date: 2026-07-06
tags: [随想]
description: 一句话摘要
---

正文用 Markdown 写。
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（如 `yourname.github.io`，或任意名）。
2. 把本目录推上去，`main` 分支。
3. 仓库 **Settings → Pages → Build and deployment → Source 选 "GitHub Actions"**。
4. 推送后自动构建并发布。地址见 Actions 运行完成后的环境链接。

> 若仓库名不是 `yourname.github.io`（例如 `my-site`），请打开 `build.js`，
> 把 `SITE.basePath` 改成 `/my-site`，`SITE.baseUrl` 改成完整地址。

## 以后怎么接入内容平台

- **RSS 订阅**：`/feed.xml` 已生成，阅读器和部分平台可直接订阅。
- **一键多平台**：装浏览器插件 [wechatsync](https://github.com/wechatsync/wechatsync)，可把文章同步到公众号 / 知乎 / 小红书等。
- **自动化转发**：将来可加脚本调用各平台开放 API，实现发布即同步。

## 自定义

改 `build.js` 顶部的 `SITE` 对象（站点名、作者、描述、地址）即可。
