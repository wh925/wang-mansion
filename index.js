export default {
  async fetch(request, env) {
    const discogsUser = "tangrou"; 
    const discogsToken = env.DISCOGS_TOKEN;

    if (!discogsToken) {
      return new Response("Error: DISCOGS_TOKEN is missing.", { status: 500 });
    }

    try {
      // 增加获取数量到 100 张，以便更好地展示搜索和分类功能
      const apiResponse = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases;

      // 提取所有的风格(Styles)用于导航
      const allStyles = [...new Set(records.flatMap(r => r.basic_information.styles || []))].sort();

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #555; --line: #1a1a1a; --accent: #fff; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Georgia", serif; margin: 0; padding: 0; line-height: 1.6; }
        
        /* 导航面板 - 默认隐藏 */
        #filter-panel {
            position: fixed; top: -100%; left: 0; width: 100%; background: #0e0e0e; 
            border-bottom: 1px solid var(--line); z-index: 100; transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            padding: 60px 5vw; box-sizing: border-box;
        }
        #filter-panel.open { top: 0; }
        
        .filter-section { margin-bottom: 30px; }
        .filter-label { color: var(--muted); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 15px; }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; }
        .tag { 
            font-size: 0.8rem; color: #888; cursor: pointer; border: 1px solid #222; 
            padding: 4px 12px; transition: all 0.3s; 
        }
        .tag:hover, .tag.active { color: var(--accent); border-color: var(--accent); }
        
        #search-input {
            width: 100%; background: transparent; border: none; border-bottom: 1px solid #333;
            color: var(--text); font-size: 1.5rem; font-weight: 200; outline: none; padding: 10px 0;
            margin-bottom: 40px;
        }

        .container { max-width: 1400px; margin: 0 auto; padding: 10vh 5vw; }
        header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--line); padding-bottom: 40px; margin-bottom: 80px; }
        h1 { font-weight: 200; font-size: 2rem; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; cursor: pointer; }
        .nav-trigger { font-size: 0.7rem; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); cursor: pointer; border: 1px solid #333; padding: 5px 15px; }

        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 60px 30px; }
        .record { text-decoration: none; color: inherit; display: block; transition: transform 0.4s; }
        .record.hidden { display: none; }
        
        .img-box { aspect-ratio: 1/1; background: #111; overflow: hidden; margin-bottom: 20px; }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); transition: filter 0.8s; }
        .record:hover img { filter: grayscale(0); }
        
        .title { font-size: 0.95rem; font-weight: 400; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .artist { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
        
        #close-panel { position: absolute; top: 30px; right: 5vw; cursor: pointer; color: var(--muted); font-size: 1.5rem; }
    </style>
</head>
<body>

    <div id="filter-panel">
        <div id="close-panel">×</div>
        <input type="text" id="search-input" placeholder="SEARCH ARCHIVE..." autocomplete="off">
        
        <div class="filter-section">
            <div class="filter-label">Styles</div>
            <div class="tag-cloud">
                <div class="tag active" data-style="all">All Genres</div>
                ${allStyles.map(s => `<div class="tag" data-style="${s}">${s}</div>`).join('')}
            </div>
        </div>
    </div>

    <div class="container">
        <header>
            <h1 onclick="togglePanel()">WANG-MANSION</h1>
            <div class="nav-trigger" onclick="togglePanel()">Menu / Filter</div>
        </header>

        <div class="archive-grid" id="main-grid">
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
    </div>

    <script>
        function togglePanel() {
            document.getElementById('filter-panel').classList.toggle('open');
        }
        
        document.getElementById('close-panel').onclick = togglePanel;

        const searchInput = document.getElementById('search-input');
        const records = document.querySelectorAll('.record');
        const tags = document.querySelectorAll('.tag');
        let activeStyle = 'all';

        function filter() {
            const term = searchInput.value.toLowerCase();
            records.forEach(r => {
                const title = r.dataset.title;
                const artist = r.dataset.artist;
                const styles = r.dataset.styles;
                
                const matchesSearch = title.includes(term) || artist.includes(term);
                const matchesStyle = activeStyle === 'all' || styles.includes(activeStyle.toLowerCase());
                
                if (matchesSearch && matchesStyle) {
                    r.classList.remove('hidden');
                } else {
                    r.classList.add('hidden');
                }
            });
        }

        searchInput.addEventListener('input', filter);

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
