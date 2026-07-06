#!/usr/bin/env node
/**
 * 个人站点零依赖构建脚本
 * - 读取 content/*.md（支持 frontmatter: title / date / tags / description）
 * - 渲染为静态 HTML，输出到 dist/
 * - 生成首页、RSS(feed.xml)、about 页
 * 运行：node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const OUT_DIR = path.join(ROOT, 'dist');
const ASSETS_DIR = path.join(ROOT, 'assets');

// 站点配置：改这里就行
const SITE = {
  title: '小虎的生活记录',
  author: '小虎',
  description: '一些生活、思考与碎碎念。',
  // 部署到项目页 tomatoren.github.io/xiaohu.github.io（用户名 xiaohu 已被占用，无法改为用户页）
  baseUrl: 'https://tomatoren.github.io/xiaohu.github.io',
  // 项目页需加子路径
  basePath: '/xiaohu.github.io',
};

// ---------- 工具 ----------
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ---------- Frontmatter 解析 ----------
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    meta[key] = val;
  }
  return { meta, body: raw.slice(m[0].length) };
}

// ---------- 轻量 Markdown 解析器（零依赖） ----------
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text) {
  // 保护行内代码
  const codes = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000CODE${codes.length - 1}\u0000`;
  });
  text = escapeHtml(text);
  // 图片 ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    return `<img src="${url}" alt="${alt}" loading="lazy">`;
  });
  // 链接 [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, url) => {
    const ext = /^https?:\/\//.test(url) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${url}"${ext}>${t}</a>`;
  });
  // 粗体 **x** / __x__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // 斜体 *x* / _x_
  text = text.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
  // 还原行内代码
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[+i])}</code>`);
  return text;
}

function md2html(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // 代码块
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      out.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // 分隔线
    if (/^(\s*([-*_])\s*){3,}$/.test(line) && !/^[-*]\s/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${md2html(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // 列表（支持嵌套，2 空格缩进）
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push(renderList(buf));
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 段落
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !/^(\s*([-*_])\s*){3,}$/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function renderList(lines) {
  const nodes = lines.map((l) => {
    const m = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    return {
      indent: m[1].replace(/\t/g, '  ').length,
      ordered: /\d+\./.test(m[2]),
      text: m[3],
    };
  });
  let i = 0;
  function build(minIndent) {
    const tag = nodes[i].ordered ? 'ol' : 'ul';
    let html = `<${tag}>`;
    while (i < nodes.length && nodes[i].indent === minIndent) {
      html += `<li>${inline(nodes[i].text)}`;
      i++;
      if (i < nodes.length && nodes[i].indent > minIndent) {
        html += build(nodes[i].indent);
      }
      html += '</li>';
    }
    html += `</${tag}>`;
    return html;
  }
  return build(nodes[0].indent);
}

// ---------- 模板 ----------
function layout({ title, content, description }) {
  const desc = description || SITE.description;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ${SITE.title}</title>
<meta name="description" content="${desc}">
<link rel="alternate" type="application/rss+xml" title="${SITE.title}" href="${SITE.basePath}/feed.xml">
<link rel="stylesheet" href="${SITE.basePath}/assets/style.css">
</head>
<body>
<header class="site-header">
  <a class="brand" href="${SITE.basePath}/">${SITE.title}</a>
  <nav>
    <a href="${SITE.basePath}/">首页</a>
    <a href="${SITE.basePath}/about.html">关于</a>
    <a href="${SITE.basePath}/feed.xml">RSS</a>
  </nav>
</header>
<main>
${content}
</main>
<footer class="site-footer">
  <p>© ${new Date().getFullYear()} ${SITE.author} · 由纯静态站点生成，内容以 <a href="${SITE.basePath}/feed.xml">RSS</a> 分发</p>
</footer>
</body>
</html>`;
}

function postPage(p) {
  const tags = Array.isArray(p.tags)
    ? p.tags.map((t) => `<span class="tag">#${t}</span>`).join(' ')
    : '';
  // 去掉正文里与标题重复的 H1（frontmatter 已作为标题展示）
  const body = p.html.replace(/^<h1>[^]*?<\/h1>\n?/, '');
  const content = `
<article class="post">
  <h1>${p.title}</h1>
  <div class="meta">${p.date || ''} ${tags}</div>
  ${body}
</article>
<p class="back"><a href="${SITE.basePath}/">← 返回首页</a></p>`;
  return layout({ title: p.title, content, description: p.description });
}

function indexPage(posts) {
  const list = posts
    .map(
      (p) => `<li>
  <a href="${SITE.basePath}/${p.slug}.html">${p.title}</a>
  <span class="date">${p.date || ''}</span>
</li>`
    )
    .join('\n');
  const content = `
<section class="intro">
  <h1>${SITE.title}</h1>
  <p>${SITE.description}</p>
</section>
<h2>最近记录</h2>
<ul class="post-list">${list}</ul>`;
  return layout({ title: '首页', content });
}

function aboutPage() {
  const content = `
<section class="about">
  <h1>关于</h1>
  <p>你好，我是 ${SITE.author}。</p>
  <p>这里记录我的生活、思考与碎碎念。内容也通过 RSS 同步，欢迎用任意阅读器订阅。</p>
  <p><a href="${SITE.basePath}/feed.xml">订阅 RSS</a> · <a href="${SITE.basePath}/">返回首页</a></p>
</section>`;
  return layout({ title: '关于', content });
}

function rss(posts) {
  const items = posts
    .map((p) => {
      const link = `${SITE.baseUrl}/${p.slug}.html`;
      return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(p.date || Date.now()).toUTCString()}</pubDate>
      <description>${escapeHtml(p.description || p.title)}</description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(SITE.title)}</title>
    <link>${SITE.baseUrl}/</link>
    <description>${escapeHtml(SITE.description)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

// ---------- 主流程 ----------
function main() {
  ensureDir(OUT_DIR);
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('缺少 content/ 目录');
    process.exit(1);
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const posts = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = f.replace(/\.md$/, '');
    posts.push({
      slug,
      title: meta.title || slug,
      date: meta.date || '',
      tags: meta.tags || [],
      description: meta.description || '',
      html: md2html(body),
    });
  }
  // 按日期倒序
  posts.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  for (const p of posts) {
    fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.html`), postPage(p));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexPage(posts));
  fs.writeFileSync(path.join(OUT_DIR, 'about.html'), aboutPage());
  fs.writeFileSync(path.join(OUT_DIR, 'feed.xml'), rss(posts));
  copyDir(ASSETS_DIR, path.join(OUT_DIR, 'assets'));

  console.log(`✅ 构建完成：${posts.length} 篇文章 -> dist/`);
}

main();
