export default {
  async fetch(request, env) {
    const discogsUser = "wh925"; 
    const discogsToken = env.DISCOGS_TOKEN;

    if (!discogsToken) {
      return new Response("未检测到 DISCOGS_TOKEN，请检查 GitHub Secret 配置。", { status: 500 });
    }

    // 从 Discogs API 获取数据 (按添加时间倒序)
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
      console.error(e);
    }

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | Archives</title>
    <style>
        :root {
            --bg: #0a0a0a; 
            --text: #e0e0e0;
            --muted: #666;
            --line: #222;
        }
        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: "Inter", "Georgia", "PingFang SC", serif;
            margin: 0;
            padding: 10vh 5vw;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        
        header {
            border-bottom: 1px solid var(--line);
            padding-bottom: 40px;
            margin-bottom: 80px;
        }
        h1 {
            font-weight: 200;
            font-size: 2.5rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            margin: 0;
        }
        .desc {
            color: var(--muted);
            font-size: 0.75rem;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            margin-top: 15px;
        }

        /* 档案网格：非对称呼吸感 */
        .archive-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 60px 40px;
        }

        .record {
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
        .img-box {
            aspect-ratio: 1/1;
            background: #111;
            overflow: hidden;
            margin-bottom: 20px;
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .record:hover .img-box {
            transform: scale(1.02);
        }
        
        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: grayscale(1) contrast(1.1);
            transition: filter 0.8s ease;
        }
        .record:hover img {
            filter: grayscale(0) contrast(1);
        }

        .info { padding: 0 5px; }
        .title {
            font-size: 1rem;
            font-weight: 400;
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .artist {
            color: var(--muted);
            font-size: 0.8rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .year {
            font-family: monospace;
            font-size: 0.7rem;
            color: #333;
            margin-top: 10px;
            border-top: 1px solid var(--line);
            padding-top: 5px;
            display: inline-block;
        }

        footer {
            margin-top: 150px;
            padding-top: 40px;
            border-top: 1px solid var(--line);
            text-align: center;
            font-size: 0.65rem;
            letter-spacing: 0.3em;
            color: #333;
        }

        @media (max-width: 600px) {
            h1 { font-size: 1.5rem; }
            .archive-grid { gap: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>WANG-MANSION</h1>
            <div class="desc">Analog & Digital Archive / Beijing</div>
        </header>
        
        <div class="archive-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" class="record" target="_blank">
                    <div class="img-box">
                        <img src="${r.basic_information.cover_image}" loading="lazy">
                    </div>
                    <div class="info">
                        <div class="title">${r.basic_information.title}</div>
                        <div class="artist">${r.basic_information.artists[0].name}</div>
                        <div class="year">REF NO. ${r.id} / ${r.basic_information.year || '----'}</div>
                    </div>
                </a>
            `).join('')}
        </div>

        <footer>
            COLLECTION OF WH925 | SINCE 2009 | POWERED BY CLOUDFLARE
        </footer>
    </div>
</body>
</html>
    `;
    return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
  },
};
