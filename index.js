export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN; // 确保这里在 Cloudflare 后台配置好了
    const url = new URL(request.url);
    
    const page = url.searchParams.get("page") || "1";
    const q = url.searchParams.get("q") || "";
    const perPage = "15"; 

    if (!discogsToken) {
      return new Response("配置缺失：请在 Cloudflare 后台 Variables 添加 DISCOGS_TOKEN", { status: 500 });
    }

    try {
      let apiUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`;
      if (q) apiUrl += `&q=${encodeURIComponent(q)}`;

      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.7',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      // 如果连接失败，返回详细的诊断信息
      if (!apiResponse.ok) {
        const errorDetail = await apiResponse.text();
        return new Response(`Discogs API 连接失败 (状态码: ${apiResponse.status})。错误信息: ${errorDetail}`, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      const records = data.releases || [];
      const pagination = data.pagination || { items: 0, pages: 1 };

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION</title>
    <style>
        :root { 
            --bg: #141414; 
            --card-bg: #1d1d1d;
            --text: #f0f0f0; 
            --muted: #777; 
            --line: #282828; 
        }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", system-ui, sans-serif; margin: 0; padding: 0; }
        
        #search-panel { 
            position: fixed; top: -100%; left: 0; width: 100%; background: #1a1a1a; 
            z-index: 100; transition: 0.5s cubic-bezier(0.1, 0.9, 0.2, 1); 
            padding: 80px 8vw; box-sizing: border-box; border-bottom: 1px solid var(--line);
        }
        #search-panel.open { top: 0; }
        #q-input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; font-size: 2.2rem; outline: none; padding: 10px 0; font-weight: 200; }

        .container { max-width: 1000px; margin: 0 auto; padding: 12vh 6vw 18vh 6vw; }
        header { border-bottom: 1px solid var(--line); padding-bottom: 50px; margin-bottom: 100px; text-align: center; }
        h1 { font-weight: 200; letter-spacing: 0.6em; cursor: pointer; margin: 0; font-size: 1.5rem; text-transform: uppercase; color: #fff; }
        .sub-nav { font-size: 0.65rem; letter-spacing: 4px; color: var(--muted); margin-top: 20px; text-transform: uppercase; cursor: pointer; }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 120px 60px; }
        .record { text-decoration: none; color: inherit; display: block; }
        
        .img-box { aspect-ratio: 1/1; background: var(--card-bg); overflow: hidden; margin-bottom: 35px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.03); }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.5) contrast(1.1); transition: 1s cubic-bezier(0.2, 0, 0.2, 1); }
        .record:hover img { filter: grayscale(0) contrast(1); transform: scale(1.04); }
        
        .info { text-align: center; padding: 0 5%; }
        .title { font-size: 0.95rem; margin-bottom: 12px; font-weight: 400; line-height: 1.5; color: #fff; letter-spacing: 0.02em; }
        .artist { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 4px; font-weight: 300; }

        .pagi { position: fixed; bottom: 50px; left: 0; width: 100%; display: flex; justify-content: center; gap: 50px; z-index: 90; }
        .p-btn { color: #444; text-decoration: none; font-size: 0.65rem; letter-spacing: 4px; padding: 10px 20px; transition: 0.3s; text-transform: uppercase; }
        .p-btn:hover { color: #fff; }
        .p-cur { color: #666; font-size: 0.65rem; padding-top: 10px; font-family: monospace; }
        .hide { visibility: hidden; }

        @media (max-width: 768px) { 
            .grid { grid-template-columns: 1fr; gap: 80px 0; }
            h1 { font-size: 1.2rem; letter-spacing: 0.4em; }
        }
    </style>
</head>
<body>
    <div id="search-panel">
        <form method="GET" action="/">
            <input type="text" name="q" id="q-input" placeholder="GLOBAL SEARCH..." value="${q}" autocomplete="off">
            <div style="margin-top:50px; display:flex; gap:30px;">
                <button type="submit" style="background:#fff; border:none; padding:12px 40px; cursor:pointer; font-size:0.75rem; letter-spacing:2px; font-weight:bold;">SEARCH</button>
                <button type="button" onclick="window.location='/'" style="background:transparent; border:1px solid #444; color:#eee; padding:12px 40px; cursor:pointer; font-size:0.75rem; letter-spacing:2px;">RESET</button>
                <button type="button" onclick="toggle()" style="background:transparent; border:none; color:#555; cursor:pointer; font-size:0.75rem; letter-spacing:2px;">CLOSE</button>
            </div>
        </form>
    </div>

    <div class="container">
        <header>
            <h1 onclick="toggle()">WANG-MANSION</h1>
            <div class="sub-nav" onclick="toggle()">${q ? 'RESULTS FOR: ' + q : 'COLLECTION / ' + pagination.items + ' ITEMS'}</div>
        </header>
        <div class="grid">
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

    <div class="pagi">
        <a href="?page=${parseInt(page) - 1}${q ? '&q=' + q : ''}" class="p-btn ${page == 1 ? 'hide' : ''}">BACK</a>
        <span class="p-cur">${page} / ${pagination.pages}</span>
        <a href="?page=${parseInt(page) + 1}${q ? '&q=' + q : ''}" class="p-btn ${page == pagination.pages ? 'hide' : ''}">NEXT</a>
    </div>

    <script>
        function toggle() { document.getElementById('search-panel').classList.toggle('open'); }
        document.addEventListener('keydown', (e) => {
            if (e.key === '/') { e.preventDefault(); toggle(); document.getElementById('q-input').focus(); }
            if (e.key === 'Escape') { document.getElementById('search-panel').classList.remove('open'); }
        });
    </script>
</body>
</html>`;
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
    } catch (e) {
      return new Response("System Error: " + e.message, { status: 500 });
    }
  }
};
