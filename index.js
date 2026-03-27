export default {
  async fetch(request, env) {
    const discogsUser = "tangrou"; 
    const discogsToken = env.DISCOGS_TOKEN;

    // 如果连 Token 都拿不到，直接返回明文提示
    if (!discogsToken) {
      return new Response("Error: DISCOGS_TOKEN is missing in Environment Variables.", { status: 500 });
    }

    try {
      // 请求 Discogs 数据
      const apiResponse = await fetch(`https://api.discogs.com/users/${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=50`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.0',
          'Authorization': `Discogs token=${discogsToken}`
        }
      });
      
      if (!apiResponse.ok) {
        return new Response(`Discogs API Error: ${apiResponse.status}`, { status: apiResponse.status });
      }

      const data = await apiResponse.json();
      const records = data.releases;

      // 生成精美的 HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | ARCHIVE</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #666; --line: #222; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Georgia", serif; margin: 0; padding: 10vh 5vw; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; }
        header { border-bottom: 1px solid var(--line); padding-bottom: 40px; margin-bottom: 80px; }
        h1 { font-weight: 200; font-size: 2.5rem; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 60px 40px; }
        .record { text-decoration: none; color: inherit; display: block; }
        .img-box { aspect-ratio: 1/1; background: #111; overflow: hidden; margin-bottom: 20px; transition: transform 0.6s ease; }
        .record:hover .img-box { transform: scale(1.02); }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); transition: filter 0.8s ease; }
        .record:hover img { filter: grayscale(0); }
        .title { font-size: 1rem; font-weight: 400; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .artist { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
        footer { margin-top: 150px; padding-top: 40px; border-top: 1px solid var(--line); text-align: center; font-size: 0.65rem; color: #333; letter-spacing: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>WANG-MANSION</h1>
            <div style="color:var(--muted); font-size:0.7rem; letter-spacing:0.4em; text-transform:uppercase; margin-top:15px;">Collection / Tangrou</div>
        </header>
        <div class="archive-grid">
            ${records.map(r => `
                <a href="https://www.discogs.com/release/${r.id}" class="record" target="_blank">
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
        <footer>EST. 2009 | BEIJING | POWERED BY CLOUDFLARE</footer>
    </div>
</body>
</html>`;

      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });

    } catch (e) {
      return new Response("Runtime Error: " + e.message, { status: 500 });
    }
  }
};
