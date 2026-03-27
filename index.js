export default {
  async fetch(request, env) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);
    const page = url.searchParams.get("page") || "1";
    
    // 每页请求 50 条文字数据（这是安全阈值，不会触碰红线）
    const perPage = "50"; 

    try {
      const apiUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`;

      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/4.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      const data = await apiResponse.json();
      const records = data.releases || [];
      const pagination = data.pagination;

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #111; --text: #eee; --muted: #444; --accent: #ff3e00; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", serif; margin: 0; }
        
        /* 极简搜索条 */
        #search-panel { 
            position: fixed; top: 0; left: 0; width: 100%; background: rgba(17,17,17,0.95); 
            backdrop-filter: blur(10px); z-index: 100; transform: translateY(-100%);
            transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 30px 10vw; 
            border-bottom: 1px solid #222; box-sizing: border-box;
        }
        #search-panel.open { transform: translateY(0); }
        #local-q { width: 100%; background: transparent; border: none; color: #fff; font-size: 1.8rem; outline: none; font-weight: 200; }

        .container { max-width: 650px; margin: 0 auto; padding: 15vh 10vw; }
        header { text-align: center; margin-bottom: 80px; }
        h1 { font-weight: 200; letter-spacing: 0.8em; font-size: 1.2rem; cursor: pointer; color: #fff; }
        
        .grid { display: flex; flex-direction: column; gap: 120px; } 
        .record { text-decoration: none; color: inherit; display: block; }
        .record.hidden { display: none !important; }
        
        /* 图片占位符：防止布局跳动 */
        .img-box { 
            aspect-ratio: 1/1; background: #1a1a1a; margin-bottom: 30px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.4); overflow: hidden;
        }
        img { 
            width: 100%; height: 100%; object-fit: cover; opacity: 0; 
            transition: opacity 1s ease; filter: grayscale(0.3);
        }
        img.loaded { opacity: 1; }
        
        .info { text-align: center; }
        .title { font-size: 1rem; margin-bottom: 8px; color: #fff; line-height: 1.4; }
        .artist { color: var(--muted); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 4px; }

        .pagi { padding: 80px 0; display: flex; justify-content: center; gap: 40px; }
        .p-btn { color: var(--muted); text-decoration: none; font-size: 0.6rem; letter-spacing: 3px; }
        .p-btn:hover { color: var(--accent); }
    </style>
</head>
<body>
    <div id="search-panel">
        <input type="text" id="local-q" placeholder="SEARCH MY ARCHIVE..." autocomplete="off">
        <div id="status" style="margin-top:15px; color:var(--accent); font-size:0.6rem; letter-spacing:2px; text-transform:uppercase;">
            Ready to check ${records.length} items
        </div>
    </div>

    <div class="container">
        <header onclick="toggleSearch()">
            <h1>WANG-MANSION</h1>
            <p style="font-size:0.5rem; color:#333; letter-spacing:4px; margin-top:20px;">TAP TO SEARCH / PAGE ${page}</p>
        </header>
        
        <div class="grid" id="main-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" 
                   class="record" 
                   target="_blank"
                   data-search="${(r.basic_information.title + ' ' + r.basic_information.artists[0].name).toLowerCase()}">
                    <div class="img-box">
                        <img data-src="${r.basic_information.cover_image}" class="lazy-img">
                    </div>
                    <div class="info">
                        <div class="title">${r.basic_information.title}</div>
                        <div class="artist">${r.basic_information.artists[0].name}</div>
                    </div>
                </a>
            `).join('')}
        </div>

        <div class="pagi">
            <a href="?page=${parseInt(page) - 1}" class="p-btn ${page == 1 ? 'hidden' : ''}">PREV BATCH</a>
            <a href="?page=${parseInt(page) + 1}" class="p-btn ${page == pagination.pages ? 'hidden' : ''}">NEXT BATCH</a>
        </div>
    </div>

    <script>
        function toggleSearch() { 
            const p = document.getElementById('search-panel');
            p.classList.toggle('open');
            if(p.classList.contains('open')) document.getElementById('local-q').focus();
        }
        
        // 核心 1：懒加载图片逻辑（Intersection Observer）
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.onload = () => img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '200px' }); // 提前 200px 开始加载

        document.querySelectorAll('.lazy-img').forEach(img => observer.observe(img));

        // 核心 2：本地极速查重
        const searchInput = document.getElementById('local-q');
        const statusText = document.getElementById('status');
        const records = document.querySelectorAll('.record');

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            let count = 0;
            records.forEach(r => {
                const match = r.getAttribute('data-search').includes(val);
                r.classList.toggle('hidden', !match);
                if(match && val !== "") count++;
            });
            statusText.innerText = val === "" ? "Ready to check" : "Found " + count + " Matches in this batch";
        });

        document.addEventListener('keydown', e => { 
            if(e.key === '/') { e.preventDefault(); toggleSearch(); }
            if(e.key === 'Escape') document.getElementById('search-panel').classList.remove('open');
        });
    </script>
</body>
</html>`;
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
    } catch (e) {
      return new Response("System Overload: " + e.message, { status: 500 });
    }
  }
};
