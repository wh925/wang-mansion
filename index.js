export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "1";
    const perPage = "40"; 

    if (!discogsToken) return new Response("Error: Token Missing", { status: 500 });

    try {
      const apiResponse = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.4',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases || [];
      const pagination = data.pagination;
      const allStyles = [...new Set(records.flatMap(r => r.basic_information.styles || []))].sort();

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #444; --line: #151515; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Georgia", serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
        
        /* 1. 隐藏的过滤面板 */
        #filter-panel { 
            position: fixed; top: -100%; left: 0; width: 100%; background: #0e0e0e; 
            z-index: 100; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); 
            padding: 80px 8vw; box-sizing: border-box; border-bottom: 1px solid var(--line); 
        }
        #filter-panel.open { top: 0; }
        #search-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #222; color: #fff; font-size: 1.8rem; outline: none; padding: 15px 0; letter-spacing: 1px; font-weight: 200; }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
        .tag { font-size: 0.7rem; color: #666; cursor: pointer; border: 1px solid #222; padding: 5px 15px; transition: 0.3s; letter-spacing: 1px; text-transform: uppercase; }
        .tag.active { color: #fff; border-color: #555; }
        #close-btn { color: var(--muted); cursor: pointer; margin-top: 40px; font-size: 0.7rem; letter-spacing: 3px; text-transform: uppercase; }

        /* 2. 主容器 */
        .container { max-width: 1000px; margin: 0 auto; padding: 12vh 8vw 20vh 8vw; }
        header { border-bottom: 1px solid var(--line); padding-bottom: 50px; margin-bottom: 100px; text-align: center; }
        h1 { font-weight: 200; letter-spacing: 0.5em; cursor: pointer; margin: 0; font-size: 1.4rem; text-transform: uppercase; }
        .nav-trigger { font-size: 0.6rem; letter-spacing: 4px; color: #333; margin-top: 20px; text-transform: uppercase; cursor: pointer; }

        /* 3. 双列布局网格 */
        .archive-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 140px 60px; }
        .record { text-decoration: none; color: inherit; display: block; }
        .record.hidden { display: none; }
        
        .img-box { aspect-ratio: 1/1; background: #0d0d0d; overflow: hidden; margin-bottom: 35px; border: 1px solid #111; }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.1); transition: 1s ease; }
        .record:hover img { filter: grayscale(0) contrast(1); transform: scale(1.02); }

        .info { text-align: center; padding: 0 5%; }
        .title { font-size: 0.95rem; margin-bottom: 10px; font-weight: 400; letter-spacing: 0.05em; line-height: 1.5; }
        .artist { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 3px; }

        /* 4. 底部翻页控制器 */
        .pagination-bar {
            position: fixed; bottom: 50px; left: 0; width: 100%;
            display: flex; justify-content: center; gap: 50px; align-items: center; z-index: 90;
        }
        .page-link { color: #333; text-decoration: none; font-size: 0.6rem; letter-spacing: 4px; transition: 0.3s; text-transform: uppercase; }
        .page-link:hover { color: #fff; }
        .page-current { color: #555; font-size: 0.6rem; letter-spacing: 2px; }
        .disabled { visibility: hidden; }

        @media (max-width: 768px) {
            .archive-grid { grid-template-columns: 1fr; gap: 80px 0; }
            .container { padding-top: 8vh; }
        }
    </style>
</head>
<body>
    <div id="filter-panel">
        <input type="text" id="search-input" placeholder="SEARCH COLLECTION..." autocomplete="off">
        <div class="tag-cloud">
            <div class="tag active" data-style="all">ALL STYLES</div>
            ${allStyles.map(s => `<div class="tag" data-style="${s}">${s}</div>`).join('')}
        </div>
        <div id="close-btn" onclick="toggle()">CLOSE</div>
    </div>

    <div class="container">
        <header>
            <h1 onclick="toggle()">WANG-MANSION</h1>
            <div class="nav-trigger" onclick="toggle()">FILTER / ${pagination.items} ITEMS</div>
        </header>

        <div class="archive-grid" id="main-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" 
                   class="record" 
                   target="_blank" 
                   data-title="${(r.basic_information.title || '').toLowerCase()}" 
                   data-artist="${(r.basic_information.artists[0].name || '').toLowerCase()}"
                   data-styles="${(r.basic_information.styles || []).join(',').toLowerCase()}">
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

    <script>
        function toggle() { document.getElementById('filter-panel').classList.toggle('open'); }
        const input = document.getElementById('search-input');
        const recs = document.querySelectorAll('.record');
        const tags = document.querySelectorAll('.tag');
        let activeStyle = 'all';

        function filter() {
            const val = input.value.toLowerCase();
            recs.forEach(r => {
                const mSearch = r.dataset.title.includes(val) || r.dataset.artist.includes(val);
                const mStyle = activeStyle === 'all' || r.dataset.styles.includes(activeStyle.toLowerCase());
                r.classList.toggle('hidden', !(mSearch && mStyle));
            });
        }
        input.oninput = filter;
        tags.forEach(t => { 
            t.onclick = () => { 
                tags.forEach(x => x.classList.remove('active')); 
                t.classList.add('active'); 
                activeStyle = t.dataset.style; 
                filter(); 
            }; 
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
