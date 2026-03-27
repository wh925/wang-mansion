export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);
    
    // 获取全局参数：页码、搜索关键词、风格筛选
    const page = url.searchParams.get("page") || "1";
    const searchQuery = url.searchParams.get("q") || "";
    const styleFilter = url.searchParams.get("style") || "";
    const perPage = "40"; 

    try {
      // 构建全局搜索 URL
      let apiUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`;
      if (searchQuery) apiUrl += `&q=${encodeURIComponent(searchQuery)}`;
      // 注：Discogs API 的 collection 接口对 style 的原生过滤较弱，我们主要通过 q 参数或前端逻辑增强
      
      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.5',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases || [];
      const pagination = data.pagination;

      // 提取本页风格供快速选择（全局风格建议通过搜索框输入）
      const pageStyles = [...new Set(records.flatMap(r => r.basic_information.styles || []))].sort();

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WANG-MANSION | ${searchQuery || 'ARCHIVE'}</title>
    <style>
        :root { 
            --bg: #121212; /* 提升亮度，从纯黑变为深石墨色 */
            --card-bg: #1a1a1a;
            --text: #eeeeee; /* 增强文字对比度 */
            --muted: #888888; /* 辅助文字亮色处理 */
            --line: #222222; 
            --accent: #ffffff;
        }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Segoe UI", serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        
        /* 顶部面板：全局搜索 */
        #filter-panel { 
            position: fixed; top: -100%; left: 0; width: 100%; background: #181818; 
            z-index: 100; transition: 0.5s cubic-bezier(0.16, 1, 0.3, 1); 
            padding: 60px 8vw; box-sizing: border-box; border-bottom: 1px solid var(--line); 
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        #filter-panel.open { top: 0; }
        #search-form { display: flex; flex-direction: column; gap: 20px; }
        #search-input { 
            width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; 
            color: #fff; font-size: 2rem; outline: none; padding: 10px 0; font-weight: 200; 
        }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .tag { font-size: 0.7rem; color: var(--muted); cursor: pointer; border: 1px solid #333; padding: 6px 16px; transition: 0.3s; text-transform: uppercase; }
        .tag:hover { color: #fff; border-color: #666; }

        /* 主容器 */
        .container { max-width: 1100px; margin: 0 auto; padding: 10vh 8vw 15vh 8vw; }
        header { border-bottom: 1px solid var(--line); padding-bottom: 40px; margin-bottom: 80px; text-align: center; }
        h1 { font-weight: 200; letter-spacing: 0.6em; cursor: pointer; margin: 0; font-size: 1.5rem; text-transform: uppercase; color: var(--accent); }
        .nav-trigger { font-size: 0.65rem; letter-spacing: 4px; color: var(--muted); margin-top: 15px; text-transform: uppercase; cursor: pointer; }

        /* 2列画册布局 */
        .archive-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 100px 60px; }
        .record { text-decoration: none; color: inherit; display: block; }
        
        .img-box { 
            aspect-ratio: 1/1; background: var(--card-bg); overflow: hidden; margin-bottom: 30px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); /* 增加投影感 */
            border: 1px solid rgba(255,255,255,0.05);
        }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.8) contrast(1.1); transition: 0.8s ease; }
        .record:hover img { filter: grayscale(0) contrast(1); transform: scale(1.03); }

        .info { text-align: center; }
        .title { font-size: 1rem; margin-bottom: 8px; font-weight: 400; letter-spacing: 0.03em; color: #fff; }
        .artist { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 3px; }

        /* 翻页控制 */
        .pagination-bar {
            position: fixed; bottom: 40px; left: 0; width: 100%;
            display: flex; justify-content: center; gap: 40px; align-items: center; z-index: 90;
        }
        .page-link { 
            color: #666; text-decoration: none; font-size: 0.65rem; letter-spacing: 4px; 
            padding: 8px 20px; border: 1px solid transparent; transition: 0.3s; 
        }
        .page-link:hover { color: #fff; border-color: #333; background: rgba(255,255,255,0.05); }
        .page-current { color: #888; font-size: 0.7rem; font-family: monospace; }
        .disabled { visibility: hidden; }

        @media (max-width: 768px) {
            .archive-grid { grid-template-columns: 1fr; gap: 60px 0; }
        }
    </style>
</head>
<body>
    <div id="filter-panel">
        <form id="search-form" method="GET" action="/">
            <input type="text" name="q" id="search-input" placeholder="GLOBAL SEARCH..." value="${searchQuery}" autocomplete="off">
            <div class="tag-cloud">
                ${pageStyles.map(s => `<div class="tag" onclick="quickStyle('${s}')">${s}</div>`).join('')}
            </div>
            <div style="display:flex; gap: 20px; margin-top:20px;">
                <button type="submit" style="background:#fff; border:none; padding:10px 30px; cursor:pointer; font-size:0.7rem; letter-spacing:2px;">SEARCH</button>
                <button type="button" onclick="window.location='/'" style="background:transparent; border:1px solid #444; color:#fff; padding:10px 30px; cursor:pointer; font-size:0.7rem; letter-spacing:2px;">CLEAR</button>
                <button type="button" onclick="toggle()" style="background:transparent; border:none; color:#444; cursor:pointer; font-size:0.7rem; letter-spacing:2px;">CLOSE</button>
            </div>
        </form>
    </div>

    <div class="container">
        <header>
            <h1 onclick="toggle()">WANG-MANSION</h1>
            <div class="nav-trigger" onclick="toggle()">
                ${searchQuery ? \`RESULTS FOR: "\${searchQuery}"\` : \`ARCHIVE / \${pagination.items} ITEMS\`}
            </div>
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
        <a href="?page=${parseInt(page) - 1}${searchQuery ? '&q=' + searchQuery : ''}" class="page-link ${page == 1 ? 'disabled' : ''}">BACK</a>
        <span class="page-current">${page} / ${pagination.pages}</span>
        <a href="?page=${parseInt(page) + 1}${searchQuery ? '&q=' + searchQuery : ''}" class="page-link ${page == pagination.pages ? 'disabled' : ''}">NEXT</a>
    </div>

    <script>
        function toggle() { document.getElementById('filter-panel').classList.toggle('open'); }
        function quickStyle(s) {
            document.getElementById('search-input').value = s;
            document.getElementById('search-form').submit();
        }
        // 快捷键支持：按下 / 键直接打开搜索
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !document.getElementById('filter-panel').classList.contains('open')) {
                e.preventDefault();
                toggle();
                document.getElementById('search-input').focus();
            }
        });
    </script>
</body>
</html>`;
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
    } catch (e) {
      return new Response("Runtime Error: " + e.message, { status: 500 });
    }
  }
};
