export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "1";
    const perPage = "40"; // 双列布局建议每页 40 张，刚好 20 行

    try {
      const apiResponse = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.3',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases;
      const pagination = data.pagination;

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #444; --line: #151515; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Georgia", serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        
        /* 核心调整：收窄容器，让两列布局显得精致而不空洞 */
        .container { max-width: 1000px; margin: 0 auto; padding: 12vh 8vw 20vh 8vw; }

        header { border-bottom: 1px solid var(--line); padding-bottom: 50px; margin-bottom: 100px; text-align: center; }
        h1 { font-weight: 200; letter-spacing: 0.5em; cursor: pointer; margin: 0; font-size: 1.4rem; text-transform: uppercase; }
        .stats { font-size: 0.6rem; letter-spacing: 4px; color: #333; margin-top: 20px; text-transform: uppercase; }

        /* 强制双列布局 */
        .archive-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 120px 60px; /* 极大的上下间距，营造画册感 */
        }

        .record { text-decoration: none; color: inherit; display: block; }
        
        .img-box { 
            aspect-ratio: 1/1; 
            background: #0d0d0d; 
            overflow: hidden; 
            margin-bottom: 30px; 
            border: 1px solid #111;
        }
        
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.1); transition: filter 1s ease; }
        .record:hover img { filter: grayscale(0) contrast(1); }

        .info { text-align: center; padding: 0 10%; } /* 文字居中，符合双列审美 */
        .title { font-size: 0.9rem; margin-bottom: 8px; font-weight: 400; letter-spacing: 0.05em; line-height: 1.4; }
        .artist { color: var(--muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 3px; font-weight: 300; }

        /* 极简底部翻页 */
        .pagination-bar {
            position: fixed; bottom: 50px; left: 0; width: 100%;
            display: flex; justify-content: center; gap: 40px; align-items: center; z-index: 90;
        }
        .page-link { color: #333; text-decoration: none; font-size: 0.6rem; letter-spacing: 3px; transition: 0.3s; }
        .page-link:hover { color: #888; }
        .page-current { color: #555; font-size: 0.6rem; letter-spacing: 2px; }
        .disabled { visibility: hidden; }

        /* 移动端自动回归单列，防止图片太小 */
        @media (max-width: 768px) {
            .archive-grid { grid-template-columns: 1fr; gap: 80px 0; }
            h1 { font-size: 1.1rem; letter-spacing: 0.3em; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>WANG-MANSION</h1>
            <div class="stats">COLLECTION NO. ${pagination.items}</div>
        </header>

        <div class="archive-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" class="record" target="_blank">
                    <div class="img-box"><img src="${r.basic_information.cover_image}" loading="lazy"></div>
                    <div class="info">
                        <div class="title">${r.basic_information.title}</div>
                        <div class="artist">${r.basic_information.artists[0].name}</div>
                    </div>
                </a>
            `).join('')}
        </div>
    </div>

    <div class="pagination-bar">
        <a href="?page=${parseInt(page) - 1}" class="page-link ${page == 1 ? 'disabled' : ''}">BACK</a>
        <span class="page-current">${page} / ${pagination.pages}</span>
        <a href="?page=${parseInt(page) + 1}" class="page-link ${page == pagination.pages ? 'disabled' : ''}">NEXT</a>
    </div>
</body>
</html>`;
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
    } catch (e) {
      return new Response("Runtime Error: " + e.message, { status: 500 });
    }
  }
};
