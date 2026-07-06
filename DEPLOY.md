# 部署到 GitHub Pages（逐步操作）

本站点已经配好自动部署：只要把文件推到 GitHub，网站就会自动构建并上线，**完全免费**。

下面分两种方式：方式 A 用命令行（快），方式 B 用网页拖拽（不用装 Git）。

---

## 第 0 步：准备

1. 注册一个 GitHub 账号：https://github.com （如果已有，跳过）。
2. 确认电脑上这份 `personal-site/` 文件夹完整（含 `build.js`、`content/`、`assets/`、`.github/` 等）。

> 站点名/作者已经是「小虎的生活记录 / 小虎」，想改的话打开 `build.js` 顶部的 `SITE` 对象改即可。

---

## 第 1 步：在 GitHub 新建仓库

1. 右上角 **+ → New repository**。
2. 仓库名有两种取法（决定以后网址）：

   - **方案 1（推荐，网址最干净）**：仓库名填 `你的用户名.github.io`
     例如用户名是 `xiaohu`，就填 `xiaohu.github.io`。
     以后网址：`https://xiaohu.github.io`
     → 这种不需要改 `basePath`。

   - **方案 2（普通项目仓库）**：随便起名，比如 `my-site`。
     以后网址：`https://你的用户名.github.io/my-site`
     → 这种要把 `build.js` 里的 `SITE.basePath` 改成 `/my-site`，`SITE.baseUrl` 改成 `https://你的用户名.github.io/my-site`，然后重新跑一次 `node build.js`。

3. **Visibility 选 Public**（Pages 免费版需要公开仓库）。
4. 不要勾选 "Add a README"（我们已经有了），直接 **Create repository**。

---

## 第 2 步：上传文件

### 方式 A：命令行（已装 Git）

在 `personal-site/` 目录里依次执行（把 `你的用户名` 换成真实用户名，`仓库名` 换成上面起的名）：

```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

第一次会让你登录 GitHub，按提示授权即可。

### 方式 B：网页拖拽（不用装 Git）

1. 进入刚建好的仓库，点 **Add file → Upload files**。
2. 把 `personal-site/` 里的**所有内容**（注意是内容，不是文件夹本身）拖进去：
   - `build.js`、`package.json`、`README.md`、`DEPLOY.md`、`.gitignore`
   - `content/` 文件夹
   - `assets/` 文件夹
   - `.github/` 文件夹（含 workflow）
3. 页面底部填提交说明 `first commit`，点 **Commit changes**。

> 注意：`.github` 是隐藏文件夹。网页上传时直接把本地 `.github` 文件夹拖进窗口即可，GitHub 会自动带上。

---

## 第 3 步：开启 Pages（自动部署）

1. 仓库里点 **Settings → Pages**（左侧菜单）。
2. **Build and deployment → Source** 选择 **GitHub Actions**。
3. 回到仓库 **Actions** 标签，你会看到一条 workflow 正在运行（首次可能稍等几秒出现）。
4. 等它变绿 ✅（约 30 秒~1 分钟），部署完成。

> 网址见 Actions 里绿色对勾旁的环境链接，或 Settings → Pages 顶部的 "Your site is live at"。

---

## 第 4 步：以后发文章（日常流程）

1. 在 `content/` 新建 `YYYY-MM-DD-标题.md`，写 frontmatter + 正文。
2. 推上去（方式 A：`git add . && git commit -m "新文章" && git push`；方式 B：网页重新上传该文件并 commit）。
3. 几十秒后自动上线，RSS（`/feed.xml`）也同步更新。

---

## 常见问题

- **打不开网页？** 等 1~2 分钟再刷新；确认 Settings → Pages 的 Source 是 "GitHub Actions"，不是 "Deploy from a branch"。
- **样式/图片 404？** 多半是 `basePath` 没配对。项目仓库名不是 `用户名.github.io` 时，必须按第 1 步方案 2 改 `basePath` 并重新 `node build.js`。
- **想用自己域名？** 在 Settings → Pages → Custom domain 填域名，并按提示加一条 CNAME 解析即可（免费）。
- **本地预览没部署？** 直接 `node build.js`，浏览器打开 `dist/index.html`。
