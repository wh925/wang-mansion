export default {
  // 必须确保第二个参数是 env，这是 Cloudflare 注入 Secret 的地方
  async fetch(request, env, ctx) {
    const discogsUser = "tangrou"; // 已更新为你的正确用户名
    const discogsToken = env.DISCOGS_TOKEN;

    // 调试逻辑：如果还是找不到 Token，我们显示更多有用信息
    if (!discogsToken) {
      const keys = Object.keys(env || {}).join(", ");
      return new Response(
        `<html><body style="background:#0a0a0a;color:#666;padding:50px;font-family:sans-serif;">
        <h2 style="color:#eee;">未检测到 DISCOGS_TOKEN</h2>
        <p>当前 Worker 识别到的变量名有: <span style="color:orange;">\${keys || "无"}</span></p>
        <p>请确保 GitHub Secret 名称完全一致为: <b style="color:#eee;">DISCOGS_TOKEN</b></p>
        </body></html>`, 
        { headers: { "content-type": "text/html;charset=UTF-8" } }
      );
    }

    // 主逻辑开始
    try {
      const response = await fetch(`https://api.discogs.com/users/\${discogsUser}/collection/folders/0/releases?sort=added&sort_order=desc&per_page=50`, {
        headers: {
          'User-Agent': 'WangMansionArchive/1.0',
          'Authorization': `Discogs token=\${discogsToken}`
        }
      });
      
      if (!response.ok) {
        return new Response(\`Discogs API 报错: \${response.status}\`, { status: response.status });
      }

      const data = await response.json();
      const records = data.releases;

      // 下面是之前那个“专而不俗”的 HTML 代码
      const html = \`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | Archives</title>
    <style>
        :root { --bg: #0a0a0a; --text: #e0e0e0; --muted: #666; --line: #222; }
        body { background-color: var(--bg); color: var(--text); font-family: "Inter", "Georgia", serif; margin: 0; padding: 10vh 5vw; }
        .container { max-width: 1200px; margin: 0 auto; }
        header { border-bottom: 1px solid var(--line); padding-bottom: 40px; margin-bottom: 80px; }
        h1 { font-weight: 200; font-size: 2.5rem; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
        .archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 60px 40px; }
        .record { text-decoration: none; color: inherit; display: block; }
        .img-box { aspect-ratio: 1/1; background: #111; overflow: hidden; margin-bottom: 20px; transition: transform 0.6s ease; }
        .record:hover .img-box { transform: scale(1.02); }
        img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.1); transition: filter 0.8s ease; }
        .record:hover img { filter: grayscale(0) contrast(1); }
        .title { font-size: 1rem; font-weight: 400; margin-bottom: 5px; }
        .artist { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; }
        footer { margin-top: 150px; padding-top: 40px; border-top: 1px solid var(--line); text-align: center; font-size: 0.65rem; color: #333; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>WANG-MANSION</h1>
            <div style="color:var(--muted); font-size:0.75rem; letter-spacing:0.4em; text-transform:uppercase; margin-top:15px;">Archives / \${discogsUser}</div>
        </header>
        <div class="archive-grid">
            \${records.map(r => \`
                <a href="https://www.discogs.com/release/\${r.id}" class="record" target="_blank">
                    <div class="img-box">
                        <img src="\${r.basic_information.cover_image}" loading="lazy">
                    </div>
                    <div class="info">
                        <div class="title">\${r.basic_information.title}</div>
                        <div class="artist">\${r.basic_information.artists[0].name}</div>
                    </div>
                </a>
            \`).join('')}
        </div>
        <footer>COLLECTION BY TANGROU | BEIJING | CLOUDFLARE</footer>
    </div>
</body>
</html>\`;
      return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });

    } catch (e) {
      return new Response("程序运行出错: " + e.message);
    }
  },
};
