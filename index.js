export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);
    
    const page = url.searchParams.get("page") || "1";
    const q = url.searchParams.get("q") || "";
    const perPage = "25"; // 单列布局建议每页减少到 25 张，防止滚动过长

    if (!discogsToken) return new Response("TOKEN MISSING", { status: 500 });

    try {
      let apiUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`;
      if (q) apiUrl += `&q=${encodeURIComponent(q)}`;

      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.8',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases || [];
      const pagination = data.pagination || { items: 0, pages: 1 };

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | MONO</title>
    <style>
        :root { 
            --bg: #161616; 
            --text: #f5f5f5; 
            --muted: #555; 
            --line: #222; 
        }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        
        /* 隐藏搜索 */
        #search-panel { 
            position: fixed; top: -100%; left: 0; width: 100%; background: #1a1a1a; 
            z-index: 100; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); 
            padding: 100px 10vw; box-sizing: border-box; border-bottom: 1px solid var(--line);
        }
        #search-panel.open { top: 0; }
        #q-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; font-size: 2.5rem; outline: none; padding: 15px 0; font-weight: 200; letter-spacing: 2px; }

        /* 单列容器优化：锁定在 700px 黄金阅读宽度 */
        .container { max-width: 700px; margin: 0 auto; padding: 15vh 10vw 25vh 10vw; }
        
        header { border-bottom: 1px solid var(--line); padding-bottom: 60px; margin-bottom: 120px; text-align: center; }
        h1 { font-weight: 200; letter-spacing: 0.8em; cursor: pointer; margin: 0; font-size: 1.4rem; text-transform: uppercase; color: #fff; }
        .sub-nav { font-size: 0.6rem; letter-spacing: 5px; color: var(--muted); margin-top: 25px; text-transform: uppercase; cursor: pointer; }

        /* 极致单列 */
        .grid { display: flex; flex-direction: column; gap: 180px; } /* 极大的行间距 */
        .record { text-decoration: none; color: inherit; display: block; }
        
        .img-box { 
            aspect-ratio: 1/1; background: #1d1d1d; overflow: hidden; margin-bottom: 45px; 
            box-shadow: 0 30px 60px rgba(0,0,0,0.6); 
            border: 1px solid rgba(255,255,255,0.02);
        }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.4) contrast(1.1); transition: 1.2s cubic-bezier(0.2, 0, 0.2, 1); }
        .record:hover img { filter: grayscale(0) contrast(1); transform: scale(1.02); }
        
        .info { text-align: center; }
        .title { font-size: 1.1rem; margin-bottom: 15px; font-weight: 400; line-height: 1.6; color: #fff; letter-spacing: 0.03em; }
        .artist { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 5px; font-weight: 300; }

        /* 底部翻页：极简淡化 */
        .pagi { position: fixed; bottom: 60px; left: 0; width: 100%; display: flex; justify-content: center; gap: 60px; z-index: 90; }
        .p-btn { color: #333; text-decoration: none; font-size: 0.6rem; letter-spacing: 5px; transition: 0.4s; }
        .p-btn:hover { color: #888; }
        .p-cur { color: #222; font-size: 0.6rem; letter-spacing: 3px; padding-top: 2px; }
        .hide { visibility: hidden; }

        @media (max-width: 600px) {
            .container { padding: 10vh 8vw; }
            h1 { font-size: 1.1rem; letter-spacing: 0.4em; }
            .grid { gap: 100px; }
        }
    </style>
</head>
<body>
    <div id="search-panel">
        <form method="GET" action="/">
            <input type="text" name="q" id="q-input" placeholder="SEARCH ARCHIVE..." value="${q}" autocomplete="off">
            <div style="margin-top:60px; display:flex; gap:40px;">
                <button type="submit" style="background:#fff; border:none; padding:15px 50px; cursor:pointer; font-size:0.7rem; letter-spacing:3px; font-weight:bold;">ENTER</button>
                <button type="button" onclick="window.location='/'" style="background:transparent; border:1px solid #333; color:#666; padding:15px 50px; cursor:pointer; font-size:0.7rem; letter-spacing:3px;">RESET</button>
                <button type="button" onclick="toggle()" style="background:transparent; border:none; color:#333; cursor:pointer; font-size:0.7rem; letter-spacing:3px;">CLOSE</button>
            </div>
        </form>
    </div>

    <div class="container">
        <header>
            <h1 onclick="toggle()">WANG-MANSION</h1>
            <div class="sub-nav" onclick="toggle()">${q ? 'FILTERED: ' + q : 'ARCHIVE / INDEX'}</div>
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
        <a href="?page=${parseInt(page) - 1}${q ? '&q=' + q : ''}" class="p-btn ${page == 1 ? 'hide' : ''}">PREV</a>
        <span class="p-cur">${page} / ${pagination.pages}</span>
        <a href="?page=${parseInt(page) + 1}${q ? '&q=' + q : ''}" class="p-btn ${page == pagination.pages ? 'hide' : ''}">NEXT</a>
    </div>

    <script>
        function toggle() { document.getElementById('search-panel').classList.toggle('open'); }
        document.addEventListener('keydown', (e) => {
            if (e.key === '/') { e.preventDefault(); toggle(); document.getElementById('q-input').focus(); }
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
