export default {
  async fetch(request, env) {
    // 1. 设置变量
    const discogsUser = "wh925"; // 请在此处替换为你的真实 Discogs 用户名
    const discogsToken = env.DISCOGS_TOKEN; // 自动读取你的 GitHub Secret

    // 2. 如果缺少 Token，显示提示
    if (!discogsToken) {
      return new Response("Missing DISCOGS_TOKEN in Environment Variables.", { status: 500 });
    }

    // 3. 从 API 获取数据 (按添加时间倒序)
    let records = [];
    try {
      const response = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=50`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        records = data.releases;
      }
    } catch (e) {
      // 错误处理
    }

    // 4. 生成 HTML 结构
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | Record Archive</title>
    <style>
        :root {
            --bg: #111; /* 极致的深黑背景 */
            --text-main: #f0f0f0; /* 柔和的白色文字 */
            --text-muted: #888; /* 灰色元数据 */
            --accent: #eee; /* 用于线条和强调 */
        }
        body {
            background-color: var(--bg);
            color: var(--text-main);
            font-family: "Georgia", "PingFang SC", "Microsoft YaHei", serif; /* 引入衬线体增强专业感 */
            margin: 0;
            padding: 80px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .wrapper {
            max-width: 1400px;
            width: 100%;
        }
        header {
            margin-bottom: 100px;
            text-align: left;
            border-bottom: 1px solid #333;
            padding-bottom: 30px;
        }
        h1 {
            font-size: 2.2rem;
            font-weight: 300;
            letter-spacing: 12px;
            text-transform: uppercase;
            margin: 0;
            color: var(--text-main);
        }
        .subtitle {
            color: var(--text-muted);
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 5px;
            margin-top: 15px;
        }

        /* 核心网格布局 */
        .archive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 50px 30px; /* 大行距，小列距，增强呼吸感 */
        }
        .record-card {
            text-decoration: none;
            color: inherit;
            transition: opacity 0.4s ease;
            position: relative;
        }
        .record-card:hover {
            opacity: 0.7; /* 优雅的悬停淡出效果 */
        }
        
        .cover-wrapper {
            aspect-ratio: 1 / 1; /* 强制正方形 */
            background-color: #222;
            overflow: hidden;
            margin-bottom: 25px;
            border: 1px solid #222; /* 淡淡的边框 */
        }
        .record-cover {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: grayscale(1); /* 默认黑白 */
            transition: filter 0.5s ease;
        }
        .record-card:hover .record-cover {
            filter: grayscale(0); /* 悬停恢复彩色 */
        }

        /* 极简排版 */
        .record-meta {
            padding-left: 5px;
        }
        .title {
            font-weight: 300;
            font-size: 1.15rem;
            margin-bottom: 8px;
            letter-spacing: 1px;
            color: var(--text-main);
        }
        .artist {
            color: var(--text-muted);
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 15px;
        }
        .cat-info {
            float: right;
            font-family: monospace;
            font-size: 0.7rem;
            color: var(--text-muted);
        }

        footer {
            margin-top: 120px;
            font-size: 0.75rem;
            color: #444;
            text-align: center;
            border-top: 1px solid #222;
            padding-top: 30px;
            letter-spacing: 2px;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <header>
            <h1>WANG-MANSION</h1>
            <div class="subtitle">DIGITAL RECORD ARCHIVE</div>
        </header>
        
        <div class="archive-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" class="record-card" target="_blank">
                    <div class="cover-wrapper">
                        <img src="${r.basic_information.cover_image}" class="record-cover" alt="${r.basic_information.title}">
                    </div>
                    <div class="record-meta">
                        <div class="title">${r.basic_information.title}</div>
                        <div class="artist">${r.basic_information.artists[0].name}</div>
           
