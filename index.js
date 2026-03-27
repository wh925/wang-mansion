export default {
  async fetch(request) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>我的清爽记录库</title>
        <style>
          body { background: #fdfdfd; color: #333; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          h1 { font-weight: 300; letter-spacing: 2px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <h1>DISC.WANGHAN.ME | 自动更新测试成功</h1>
      </body>
      </html>
    `;
    return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
  },
};
