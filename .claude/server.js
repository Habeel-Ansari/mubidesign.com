const http = require('http');
const fs = require('fs');
const path = require('path');
const root = '/Users/mubeensmacbook/Documents/GG/mubidesign.com';
const mime = {
  '.html':'text/html;charset=utf-8', '.css':'text/css', '.js':'application/javascript',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json',
  '.webm':'video/webm', '.mp4':'video/mp4', '.woff2':'font/woff2'
};
const PORT = process.env.PORT || 4300;
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'text/plain', 'Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('ready on ' + PORT));
