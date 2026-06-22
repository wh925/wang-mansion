export default {
  async fetch(request, env, ctx) {
    const discogsUser = "tangrou";
    const discogsToken = env.DISCOGS_TOKEN;
    const url = new URL(request.url);

    // ==========================================
    // 1. 图片代理（带边缘缓存，确保国内稳定出大图）
    // ==========================================
    if (url.pathname.startsWith('/proxy-img/')) {
      const targetUrl = decodeURIComponent(url.pathname.replace('/proxy-img/', ''));
      if (!targetUrl.startsWith('http')) return new Response("Invalid URL", { status: 400 });
      
      try {
        const imgRes = await fetch(targetUrl, {
          headers: { 'User-Agent': 'WangMansionArchive/Proxy' },
          cf: { cacheEverything: true, cacheTtl: 604800 } 
        });
        const newHeaders = new Headers(imgRes.headers);
        newHeaders.set('cache-control', 'public, max-age=604800');
        return new Response(imgRes.body, { status: imgRes.status, headers: newHeaders });
      } catch (e) {
        return new Response("Img Error", { status: 500 });
      }
    }

    // ==========================================
    // 2. 缓存守护（30分钟自动更新，死死护住接口）
    // ==========================================
    const cache = caches.default;
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (!discogsToken) return new Response("TOKEN MISSING", { status: 500 });

    try {
      // ==========================================
      // 3. 核心升级：顺序迭代扫盘（拒绝并发，杜绝 429 漏网）
      // ==========================================
      const firstPageUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100&page=1`;
      
      const firstResponse = await fetch(firstPageUrl, {
        headers: {
          'User-Agent': 'WangMansionArchive/12.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      if (!firstResponse.ok) {
        if (firstResponse.status === 429) {
          return new Response(`Discogs 官方判定短时间内刷新太快（429），请等一分钟再试。`, { status: 429 });
        }
        return new Response(`Discogs 官方接口正忙，请稍后刷新重试。`, { status: firstResponse.status });
      }

      const firstData = await firstResponse.json();
      let records = firstData.releases || [];
      const totalPages = firstData.pagination?.pages || 1;

      // 改用 sequential for 循环，一页页老实往下拉，规避并发激发的频率锁
      if (totalPages > 1) {
        const maxPages = Math.min(totalPages, 20); // 最大支持 2000 张珍藏
        for (let p = 2; p <= maxPages; p++) {
          const pUrl = `https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=100&page=${p}`;
          const res = await fetch(pUrl, {
            headers: {
              'User-Agent': 'WangMansionArchive/12.0',
              'Authorization': `Discogs token=${discogsToken}`
            }
          });
          
          if (res.ok) {
            const d = await res.json();
            if (d.releases && d.releases.length > 0) {
              records = records.concat(d.releases);
            }
          } else if (res.status === 429) {
            // 如果中途被拦截，直接硬核报错，绝不含糊地只吐出 100 张糊弄人
            return new Response(`同步全量时，在第 ${p} 页触发了官方频率锁(429)，请一分钟后重试。`, { status: 429 });
          }
        }
      }

      const firstCover = records[0]?.basic_information?.cover_image || '';
      const shareImageUrl = firstCover ? `https://${url.hostname}/proxy-img/${encodeURIComponent(firstCover)}` : '';

      // ==========================================
      // 4. 前端高冷切片渲染
      // ==========================================
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION</title>
    
    <meta property="og:type" content="website">
    <meta property="og:title" content="WANG-MANSION">
    <meta property="og:description" content="PRIVATE MUSIC ARCHIVE">
    <meta property="og:image" content="${shareImageUrl}">
    
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
        
        .pagi { padding: 60px 0 0 0; display: flex; justify-content: center; gap: 40px; align-items: center; }
        .p-btn { color: #333; text-decoration: none; font-size: 0.65rem; letter-spacing: 3px; cursor: pointer; user-select: none; }
        .p-btn:hover { color: #fff; }
    </style>
</head>
<body>
    <div style="display:none;"><img src="${shareImageUrl}" alt="Cover"></div>

    <div id="search-panel">
        <input type="text" id="local-q" placeholder="输入艺人或碟名查重..." autocomplete="off">
        <div id="status" style="margin-top:15px; color:var(--accent); font-size:0.65rem; letter-spacing:2px;">READY TO CHECK ALL ${records.length} ITEMS</div>
    </div>

    <div class="container">
        <header onclick="toggleSearch()">
            <h1>WANG-MANSION</h1>
            <p style="font-size:0.55rem; color:#444; letter-spacing:4px; margin-top:20px; cursor:pointer;">
                🤖 TOTAL ARCHIVED: ${records.length} DISCS / CLICK TO SEARCH
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

        <div class="pagi" id="pagi-nav">
            <span id="back-btn" class="p-btn">BACK</span>
            <span id="sub-page-text" style="color:#222; font-size:0.65rem; letter-spacing: 2px;">1 / 1</span>
            <span id="next-btn" class="p-btn">NEXT</span>
        </div>
    </div>

    <script>
        function toggleSearch() { const p = document.getElementById('search-panel'); p.classList.toggle('open'); if(p.classList.contains('open')) document.getElementById('local-q').focus(); }
        
        const observer = new IntersectionObserver((entries) => { entries.forEach(entry => { if (entry.isIntersecting) { const img = entry.target; img.src = img.dataset.src; img.onload = () => img.classList.add('loaded'); observer.unobserve(img); } }); }, { rootMargin: '600px' });
        
        const itemsPerPage = 15; 
        let currentSubPage = 1;
        const records = Array.from(document.querySelectorAll('.record'));
        const totalItems = records.length;
        const totalSubPages = Math.ceil(totalItems / itemsPerPage);

        function updateGalleryView() {
            const query = searchInput.value.toLowerCase().trim();
            const pagiNav = document.getElementById('pagi-nav');
            const subPageText = document.getElementById('sub-page-text');
            const backBtn = document.getElementById('back-btn');
            const nextBtn = document.getElementById('next-btn');

            if (query === "") {
                pagiNav.style.display = "flex";
                const start = (currentSubPage - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                
                records.forEach((r, index) => {
                    if (index >= start && index < end) {
                        r.classList.remove('hidden');
                        const img = r.querySelector('.lazy-img');
                        if (img && !img.classList.contains('loaded')) observer.observe(img);
                    } else {
                        r.classList.add('hidden');
                    }
                });
                
                subPageText.innerText = currentSubPage + " / " + totalSubPages;
                backBtn.style.color = currentSubPage === 1 ? "#222" : "#333";
                backBtn.style.pointerEvents = currentSubPage === 1 ? "none" : "auto";
                nextBtn.style.color = currentSubPage === totalSubPages ? "#222" : "#333";
                nextBtn.style.pointerEvents = currentSubPage === totalSubPages ? "none" : "auto";
            } else {
                pagiNav.style.display = "none"; 
                let count = 0;
                records.forEach(r => {
                    const match = r.getAttribute('data-search').includes(query);
                    r.classList.toggle('hidden', !match);
                    if (match) {
                        count++;
                        const img = r.querySelector('.lazy-img');
                        if (img && !img.classList.contains('loaded')) observer.observe(img);
                    }
                });
                statusText.innerText = "FOUND " + count + " IN ALL " + totalItems + " COLLECTION ITEMS";
            }
        }

        const searchInput = document.getElementById('local-q');
        const statusText = document.getElementById('status');
        searchInput.addEventListener('input', updateGalleryView);

        document.getElementById('back-btn').addEventListener('click', () => { if (currentSubPage > 1) { currentSubPage--; updateGalleryView(); window.scrollTo(0,0); } });
        document.getElementById('next-btn').addEventListener('click', () => { if (currentSubPage < totalSubPages) { currentSubPage++; updateGalleryView(); window.scrollTo(0,0); } });

        document.addEventListener('keydown', e => { if(e.key === '/') { e.preventDefault(); toggleSearch(); } });
        
        updateGalleryView();
    </script>
</body>
</html>`;

      const response = new Response(html, {
        headers: { 
          "content-type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=1800" // 严守 30 分钟强力同步
        }
      });

      ctx.waitUntil(cache.put(request, response.clone()));
      return response;

    } catch (e) {
      return new Response("System Error: " + e.message, { status: 500 });
    }
  }
};
