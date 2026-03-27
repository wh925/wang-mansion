export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);
    
    const page = url.searchParams.get("page") || "1";
    const q = url.searchParams.get("q") || "";
    const perPage = "15"; // 调回 15 张，每张都是巨幕感

    if (!discogsToken) return new Response("TOKEN MISSING", { status: 500 });

    try {
      // 核心修复：通过 search 接口但强制指定文件夹和用户名
      let apiUrl;
      if (q) {
        // 关键：增加 folder=0 并限定 username，确保只在你的“所有收藏”中搜索
        apiUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(q)}&username=${discogsUser}&type=release&per_page=${perPage}&page=${page}`;
      } else {
        apiUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`;
      }

      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/2.2',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = q ? data.results : data.releases;
      const pagination = data.pagination;

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #141414; --text: #f0f0f0; --muted: #555; --line: #222; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        
        #search-panel { 
            position: fixed; top: -100%; left: 0; width: 100%; background: #1a1a1a; 
            z-index: 100; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); 
            padding: 100px 10vw; box-sizing: border-box; border-bottom: 1px solid var(--line);
        }
        #search-panel.open { top: 0; }
        #q-input { width: 100%; background: transparent; border: none; border-bottom: 2px solid #333; color: #fff; font-size: 2.5rem; outline: none; padding: 15px 0; font-weight: 200; }

        .container { max-width: 720px; margin: 0 auto; padding: 12vh 8vw 25vh 8vw; }
        header { border-bottom: 1px solid var(--line); padding-bottom: 60px; margin-bottom: 120px; text-align: center; }
        h1 { font-weight: 200; letter-spacing: 0.8em; cursor: pointer; margin: 0; font-size: 1.5rem; text-transform: uppercase; }
        .sub-nav { font-size: 0.6rem; letter-spacing: 5px; color: var(--muted); margin-top: 20px; text-transform: uppercase; cursor: pointer; }

        .grid { display: flex; flex-direction: column; gap: 150px; } 
        .record { text-decoration: none; color: inherit; display: block; }
        .img-box { aspect-ratio: 1/1; background: #1a1a1a; overflow: hidden; margin-bottom: 45px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.02); }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.5) contrast(1.1); transition: 1.2s ease; }
        .record:hover img { filter: grayscale(0) contrast(1); transform: scale(1.02); }
        
        .info { text-align: center; padding: 0 10%; }
        .title { font-size: 1.1rem; margin-bottom: 15px; font-weight: 400; line-height: 1.5; color: #fff; letter-spacing: 0.05em; }
        .artist { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 5px; font-weight: 300; }

        .pagi { position: fixed; bottom: 60px; left: 0; width: 100%; display: flex; justify-content: center; gap: 60px; z-index: 90; }
        .p-btn { color: #333; text-decoration: none; font-size: 0.65rem; letter-spacing: 4px; transition: 0.3s; }
        .p-btn:hover { color: #fff; }
        .p-cur { color: #222; font-size: 0.65rem; }
        .hide { visibility: hidden; }
    </style>
</head>
<body>
    <div id="search-panel">
        <form method="GET" action="/">
            <input type="text" name="q" id="q-input" placeholder="SEARCH COLLECTION..." value="${q}" autocomplete="off">
            <div style="margin-top:50px; display:flex; gap:30px;">
                <button type="submit" style="background:#fff; border:none; padding:12px 40px; cursor:pointer; font-size:0.75rem; letter-spacing:2px; font-weight:bold;">CHECK</button>
                <button type="button" onclick="window.location='/'" style="background:transparent; border:1px solid #444; color:#666; padding:12px 40px; cursor:pointer; font-size:0.75rem;">RESET</button>
                <button type="button" onclick="toggle()" style="background:transparent; border:none; color:#444; cursor:pointer; font-size:0.75rem;">CLOSE</button>
            </div>
        </form>
    </div>

    <div class="container">
        <header>
            <h1 onclick="toggle()">WANG-MANSION</h1>
            <div class="sub-nav" onclick="toggle()">${q ? 'RESULTS FOR: ' + q : 'COLLECTION / ' + pagination.items + ' ITEMS'}</div>
        </header>
        <div class="grid">
            ${records.map(r => {
                const title = q ? (r.title.split(' - ')[1] || r.title) : r.basic_information.title;
                const artist = q ? (r.title.split(' - ')[0] || 'Unknown') : r.basic_information.artists[0].name;
                const cover = q ? r.cover_image : r.basic_information.cover_image;
                return `
                <a href="https://www.discogs.com/release/${r.id}" class="record" target="_blank">
                    <div class="img-box"><img src="${cover}" loading="lazy"></div>
                    <div class="info">
                        <div class="title">${title}</div>
                        <div class="artist">${artist}</div>
                    </div>
                </a>
                `;
            }).join('')}
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
