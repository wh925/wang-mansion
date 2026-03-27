export default {
  async fetch(request, env) {
    const discogsUser = "tangrou"; 
    
    // 优先读取 Cloudflare 环境变量，如果没有，尝试读取全局变量
    const discogsToken = env.DISCOGS_TOKEN || typeof DISCOGS_TOKEN !== 'undefined' ? DISCOGS_TOKEN : null;

    if (!discogsToken) {
      return new Response("TOKEN MISSING: 请在 Cloudflare 后台 Variables 重新添加 DISCOGS_TOKEN 并点击 Save and Deploy", { status: 500 });
    }

    try {
      const apiResponse = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases;
      const allStyles = [...new Set(records.flatMap(r => r.basic_information.styles || []))].sort();

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #444; --line: #1a1a1a; --accent: #fff; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Georgia", serif; margin: 0; padding: 0; line-height: 1.6; -webkit-font-smoothing: antialiased; }
        
        #filter-panel {
            position: fixed; top: -100%; left: 0; width: 100%; background: #0e0e0e; 
            border-bottom: 1px solid var(--line); z-index: 100; transition: top 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            padding: 80px 5vw; box-sizing: border-box;
        }
        #filter-panel.open { top: 0; }
        
        .filter-label { color: var(--muted); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 20px; }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 12px; }
        .tag { font-size: 0.75rem; color: #666; cursor: pointer; border: 1px solid #222; padding: 5px 15px; transition: 0.3s; letter-spacing: 1px; }
        .tag:hover, .tag.active { color: var(--accent); border-color: #555; }
        
        #search-input {
            width: 100%; background: transparent; border: none; border-bottom: 1px solid #222;
            color: var(--text); font-size: 2rem; font-weight: 200; outline: none; padding: 15px 0;
            margin-bottom: 50px; letter-spacing: 2px;
        }

        .container { max-width: 1400px; margin: 0 auto; padding: 12vh 5vw; }
        header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--line); padding-bottom: 50px; margin-bottom: 100px; }
        h1 { font-weight: 200; font-size: 2.2rem; letter-spacing: 0.3em; text-transform: uppercase; margin: 0; cursor: pointer; }
        .nav-trigger { font-size: 0.65rem; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); cursor: pointer; border: 1px solid #222; padding: 6px 20px; transition: 0.3s; }
        .nav-trigger:hover { color: #eee; border-color: #444; }

        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 80px 40px; }
        .record { text-decoration: none; color: inherit; display: block; }
        .record.hidden { display: none; }
        
        .img-box { aspect-ratio: 1/1; background: #111; overflow: hidden; margin-bottom: 25px; border: 1px solid #151515; }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.1); transition: filter 1s ease, transform 1s ease; }
        .record:hover img { filter: grayscale(0) contrast(1); transform: scale(1.03); }
        
        .title { font-size: 1rem; font-weight: 400; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.5px; }
        .artist { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; }
        
        #close-panel { position: absolute; top: 40px; right: 5vw; cursor: pointer; color: var(--muted); font-size: 1.2rem; letter-spacing: 2px; text-transform: uppercase; }
        footer { margin-top: 200px; padding: 60px 0; border-top: 1px solid var(--line); text-align: center; font-size: 0.6rem; color: #222; letter-spacing: 5px; }
    </style>
</head>
<body>
    <div id="filter-panel">
        <div id="close-panel" onclick="togglePanel()">Close</div>
        <input type="text" id="search-input" placeholder="SEARCH COLLECTION..." autocomplete="off">
        <div class="filter-section">
            <div class="filter-label">Filter by Style</div>
            <div class="tag-cloud">
                <div class="tag active" data-style="all">Show All</div>
                ${allStyles.map(s => `<div class="tag" data-style="${s}">${s}</div>`).join('')}
            </div>
        </div>
    </div>

    <div class="container">
        <header>
            <h1 onclick="togglePanel()">WANG-MANSION</h1>
            <div class="nav-trigger" onclick="togglePanel()">Filter</div>
        </header>
        <div class="archive-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" 
                   class="record" 
                   target="_blank" 
                   data-title="${r.basic_information.title.toLowerCase()}" 
                   data-artist="${r.basic_information.artists[0].name.toLowerCase()}"
                   data-styles="${(r.basic_information.styles || []).join(',').toLowerCase()}">
                    <div class="img-box">
                        <img src="${r.basic_information.cover_image}" loading="lazy">
                    </div>
                    <div class="info">
                        <div class="title">${r.basic_information.title}</div>
                        <div class="artist">${r.basic_information.artists[0].name}</div>
                    </div>
                </a>
            `).join('')}
        </div>
        <footer>TANGROU ARCHIVE / BEIJING PINGGU / 2026</footer>
    </div>

    <script>
        function togglePanel() { document.getElementById('filter-panel').classList.toggle('open'); }
        const searchInput = document.getElementById('search-input');
        const records = document.querySelectorAll('.record');
        const tags = document.querySelectorAll('.tag');
        let activeStyle = 'all';

        function filter() {
            const term = searchInput.value.toLowerCase();
            records.forEach(r => {
                const matchesSearch = r.dataset.title.includes(term) || r.dataset.artist.includes(term);
                const matchesStyle = activeStyle === 'all' || r.dataset.styles.includes(activeStyle.toLowerCase());
                r.classList.toggle('hidden', !(matchesSearch && matchesStyle));
            });
        }
        searchInput.oninput = filter;
        tags.forEach(tag => {
            tag.onclick = () => {
                tags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                activeStyle = tag.dataset.style;
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
