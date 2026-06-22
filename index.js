export default {
  async fetch(request, env, ctx) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);

    // ==========================================
    // 1. 图片代理（依然保持强力边缘缓存，不折腾 Discogs）
    // ==========================================
    if (url.pathname.startsWith('/proxy-img/')) {
      const targetUrl = decodeURIComponent(url.pathname.replace('/proxy-img/', ''));
      if (!targetUrl.startsWith('http')) return new Response("Invalid URL", { status: 400 });
      
      try {
        const imgRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'WangMansionArchive/Proxy' },
          cf: { cacheEverything: true, cacheTtl: 604800 } // 图片缓存 7 天
        });
        const newHeaders = new Headers(imgRes.headers);
        newHeaders.set('cache-control', 'public, max-age=604800');
        return new Response(imgRes.body, { status: imgRes.status, headers: newHeaders });
      } catch (e) {
        return new Response("Img Error", { status: 500 });
      }
    }

    // ==========================================
    // 2. 核心：全自动智能时间窗缓存（告别手动尾巴）
    // ==========================================
    const cache = caches.default;
    
    // 尝试在 Cloudflare 缓存里捞现成的网页
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // 捞到了直接给用户看，秒开，0% 概率触发 429
      return cachedResponse;
    }

    // ==========================================
    // 3. 缓存过期了，或者第一次访问，全自动去 Discogs 同步
    // ==========================================
    const page = url.searchParams.get("page") || "1";
    const perPage = "15"; 

    if (!discogsToken) return new Response("TOKEN MISSING", { status: 500 });

    try {
      const apiUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=${perPage}&page=${page}`;

      const apiResponse = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/7.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      // 如果刚好撞上 Discogs 抽风或封锁，安全降级，防止页面死掉
      if (!apiResponse.ok) {
        return new Response(`Discogs 接口正忙，请一分钟后刷新全自动同步。`, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      const records = data.releases || [];
      const pagination = data.pagination;

      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION</title>
    <style>
        :root { --bg: #141414; --text: #f0f0f0; --muted: #444; --accent: #ff3e00; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", serif; margin: 0; }
        #search-panel { position: fixed; top: 0; left: 0; width: 100%; background: rgba(20,20,20,0.98); backdrop-filter: blur(10px); z-index: 100; transform: translateY(-100%); transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); padding: 40px 10vw; border-bottom: 1px solid #222; box-sizing: border-box; }
        #search-panel.open { transform: translateY(0); }
        #local-q { width: 100%; background: transparent; border: none; color: #fff; font-size: 2rem; outline: none; font-weight: 200; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .container { max-width: 680px; margin: 0 auto; padding: 12vh 8vw 20vh 8vw; }
        header { text-align: center; margin-bottom: 80px; }
        h1 { font-weight: 200; letter-spacing: 0.8em; font-size: 1.4rem; cursor: pointer; color: #fff; margin: 0; }
        .grid { display: flex; flex-direction: column; gap: 130px; } 
        .record { text-decoration: none; color: inherit; display: block; }
        .record.hidden { display: none !important; }
        .img-box { aspect-ratio: 1/1; background: #1a1a1a; margin-bottom: 35px; box-shadow: 0 25px 50px rgba(0,0,0,0.5); overflow: hidden; border: 1px solid rgba(255,255,255,0.01); }
        img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.8s ease; filter: grayscale(0.2); }
        img.loaded { opacity: 1; }
        .info { text-align: center; }
        .title { font-size: 1.05rem; margin-bottom: 10px; color: #fff; line-height: 1.5; }
        .artist { color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 4px; }
        .pagi { padding: 60px 0 0 0; display: flex; justify-content: center; gap: 40px; }
        .p-btn { color: #333; text-decoration: none; font-size: 0.65rem; letter-spacing: 3px; }
        .p-btn:hover { color: #fff; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div id="search-panel">
        <input type="text" id="local-q" placeholder="输入艺人或碟名查重..." autocomplete="off">
        <div id="status" style="margin-top:15px; color:var(--accent); font-size:0.65rem; letter-spacing:2px;">READY TO CHECK ${records.length} ITEMS</div>
    </div>

    <div class="container">
        <header onclick="toggleSearch()">
            <h1>WANG-MANSION</h1>
            <p style="font-size:0.55rem; color:#444; letter-spacing:4px; margin-top:20px; cursor:pointer;">
                🤖 AUTOMATICALLY SYNCED / PAGE ${page}
            </p>
        </header>
        
        <div class="grid" id="main-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" class="record" target="_blank" data-search="${(r.basic_information.title + ' ' + r.basic_information.artists[0].name).toLowerCase()}">
                    <div class="img-box"><img data-src="/proxy-img/${encodeURIComponent(r.basic_information.cover_image)}" class="lazy-img"></div>
                    <div class="info">
                        <div class="title">${r.basic_information.title}</div>
                        <div class="artist">${r.basic_information.artists[0].name}</div>
                    </div>
                </a>
            `).join('')}
        </div>

        <div class="pagi">
            <a href="?page=${parseInt(page) - 1}" class="p-btn ${page == 1 ? 'hidden' : ''}">BACK</a>
            <span style="color:#222; font-size:0.65rem;">${page} / ${pagination.pages}</span>
            <a href="?page=${parseInt(page) + 1}" class="p-btn ${page == pagination.pages ? 'hidden' : ''}">NEXT</a>
        </div>
    </div>

    <script>
        function toggleSearch() { const p = document.getElementById('search-panel'); p.classList.toggle('open'); if(p.classList.contains('open')) document.getElementById('local-q').focus(); }
        const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { const img = entry.target; img.src = img.dataset.src; img.onload = () => img.classList.add('loaded'); observer.unobserve(img); } }); }, { rootMargin: '300px' });
        document.querySelectorAll('.lazy-img').forEach(img => observer.observe(img));
        
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
            statusText.innerText = val === "" ? "Ready to check" : "Found " + count + " In This Batch";
        });
        document.addEventListener('keydown', e => { if(e.key === '/') { e.preventDefault(); toggleSearch(); } });
    </script>
</body>
</html>`;

      // 【核心修改】设置这个网页在 Cloudflare 里的生存时间为 1800 秒（30分钟）
      const response = new Response(html, {
        headers: { 
          "content-type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=1800" 
        }
      });

      // 自动存入缓存
      ctx.waitUntil(cache.put(request, response.clone()));
      return response;

    } catch (e) {
      return new Response("System Error: " + e.message, { status: 500 });
    }
  }
};
