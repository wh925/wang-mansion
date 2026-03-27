export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;

    try {
      const apiResponse = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.1',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      if (!data.releases) throw new Error("API返回数据格式错误");
      
      const records = data.releases;
      const allStyles = [...new Set(records.flatMap(r => r.basic_information.styles || []))].sort();

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WANG-MANSION</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #444; --line: #1a1a1a; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", serif; margin: 0; padding: 0; }
        #filter-panel { position: fixed; top: -100%; left: 0; width: 100%; background: #0e0e0e; z-index: 100; transition: 0.6s; padding: 80px 5vw; box-sizing: border-box; border-bottom: 1px solid var(--line); }
        #filter-panel.open { top: 0; }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .tag { font-size: 0.7rem; color: #666; cursor: pointer; border: 1px solid #222; padding: 4px 12px; }
        .tag.active { color: #fff; border-color: #555; }
        #search-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #222; color: #fff; font-size: 1.5rem; outline: none; padding: 10px 0; }
        .container { max-width: 1400px; margin: 0 auto; padding: 8vh 5vw; }
        header { display: flex; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 30px; margin-bottom: 60px; }
        h1 { font-weight: 200; letter-spacing: 0.3em; cursor: pointer; margin: 0; font-size: 1.8rem; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 50px 30px; }
        .record { text-decoration: none; color: inherit; }
        .record.hidden { display: none; }
        .img-box { aspect-ratio: 1/1; background: #111; overflow: hidden; margin-bottom: 15px; }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); transition: 0.5s; }
        .record:hover img { filter: grayscale(0); }
        .title { font-size: 0.9rem; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .artist { color: var(--muted); font-size: 0.7rem; text-transform: uppercase; }
    </style>
</head>
<body>
    <div id="filter-panel">
        <input type="text" id="search-input" placeholder="SEARCH...">
        <div class="tag-cloud">
            <div class="tag active" data-style="all">ALL</div>
            ${allStyles.map(s => `<div class="tag" data-style="${s}">${s}</div>`).join('')}
        </div>
        <p onclick="toggle()" style="color:#444; cursor:pointer; margin-top:30px;">CLOSE</p>
    </div>
    <div class="container">
        <header><h1 onclick="toggle()">WANG-MANSION</h1><div onclick="toggle()" style="cursor:pointer; color:#444;">FILTER</div></header>
        <div class="archive-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" class="record" target="_blank" data-title="${r.basic_information.title.toLowerCase()}" data-artist="${r.basic_information.artists[0].name.toLowerCase()}" data-styles="${(r.basic_information.styles || []).join(',').toLowerCase()}">
                    <div class="img-box"><img src="${r.basic_information.cover_image}" loading="lazy"></div>
                    <div class="info"><div class="title">${r.basic_information.title}</div><div class="artist">${r.basic_information.artists[0].name}</div></div>
                </a>
            `).join('')}
        </div>
    </div>
    <script>
        function toggle() { document.getElementById('filter-panel').classList.toggle('open'); }
        const input = document.getElementById('search-input');
        const recs = document.querySelectorAll('.record');
        const tags = document.querySelectorAll('.tag');
        let activeStyle = 'all';
        function doFilter() {
            const val = input.value.toLowerCase();
            recs.forEach(r => {
                const mSearch = r.dataset.title.includes(val) || r.dataset.artist.includes(val);
                const mStyle = activeStyle === 'all' || r.dataset.styles.includes(activeStyle.toLowerCase());
                r.classList.toggle('hidden', !(mSearch && mStyle));
            });
        }
        input.oninput = doFilter;
        tags.forEach(t => { t.onclick = () => { tags.forEach(x => x.classList.remove('active')); t.classList.add('active'); activeStyle = t.dataset.style; doFilter(); }; });
    </script>
</body>
</html>`;
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500 });
    }
  }
};
