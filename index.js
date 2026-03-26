export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { DB } = env;

    // 1. 处理录入逻辑 (POST)
    if (request.method === "POST" && url.pathname === "/add") {
      const formData = await request.formData();
      const discogsId = formData.get("discogsId");
      
      // 调用 Discogs API 抓取数据 (这里用了您的 Token)
      const resp = await fetch(`https://api.discogs.com/releases/${discogsId}`, {
        headers: { 'User-Agent': 'WangMansion/1.0', 'Authorization': `Discogs token=${env.DISCOGS_TOKEN}` }
      });
      const data = await resp.json();

      await DB.prepare(
        "INSERT INTO records (title, artist, cover_url, year) VALUES (?, ?, ?, ?)"
      ).bind(data.title, data.artists[0].name, data.images[0].uri, data.year).run();

      return Response.redirect(url.origin, 303);
    }

    // 2. 查询现有唱片
    const { results } = await DB.prepare("SELECT * FROM records ORDER BY id DESC").all();

    // 3. 渲染“清爽版”界面 (HTML)
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>王府唱片私藏馆</title>
      <style>
        body { font-family: -apple-system, system-ui; background: #f8f9fa; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { font-weight: 300; color: #2c3e50; text-align

