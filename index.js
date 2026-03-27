export default {
  async fetch(request) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WANG-MANSION | Record Library</title>
    <style>
        :root {
            --bg: #f8f7f2;
            --text: #2c2c2c;
            --accent: #8b8b8b;
            --card-bg: #ffffff;
        }
        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        header {
            margin-bottom: 50px;
            text-align: center;
        }
        h1 {
            font-weight: 300;
            letter-spacing: 4px;
            text-transform: uppercase;
            font-size: 1.5rem;
            border-bottom: 1px solid var(--accent);
            padding-bottom: 15px;
        }
        .container {
            max-width: 900px;
            width: 100%;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 25px;
        }
        .record-card {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 2px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            transition: transform 0.3s ease;
            border: 1px solid #eee;
        }
        .record-card:hover {
            transform: translateY(-5px);
        }
        .title { font-weight: 600; font-size: 1.1rem; margin-bottom: 8px; }
        .artist { color: var(--accent); font-size: 0.9rem; margin-bottom: 15px; }
        .tag { 
            display: inline-block; 
            font-size: 0.7rem; 
            padding: 2px 8px; 
            background: #f0f0f0; 
            color: #666; 
            border-radius: 10px;
        }
        footer { margin-top: 60px; font-size: 0.8rem; color: var(--accent); }
    </style>
</head>
<body>
    <header>
        <h1>WANG-MANSION</h1>
        <p style="color:#aaa; font-size:0.8rem; letter-spacing:1px;">DIGITAL RECORD ARCHIVE</p>
    </header>
    
    <div class="container">
        <div class="record-card">
            <div class="title">Cold Fact</div>
            <div class="artist">Sixto Rodriguez</div>
            <span class="tag">Folk Rock</span>
        </div>
        <div class="record-card">
            <div class="title">The Köln Concert</div>
            <div class="artist">Keith Jarrett</div>
            <span class="tag">Jazz / Piano</span>
        </div>
        <div class="record-card">
            <div class="title">Shakuhachi Meditation</div>
            <div class="artist">Myoan School</div>
            <span class="tag">Suizen</span>
        </div>
    </div>

    <footer>
        &copy; 2026 WANG-MANSION | Pinggu, Beijing
    </footer>
</body>
</html>
    `;
    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" },
    });
  },
};
