const http = require('http');
const fs = require('fs');
const path = require('path');
const root = '/Users/mubeensmacbook/Documents/Portfolio';
const mime = {
  '.html':'text/html;charset=utf-8',
  '.css':'text/css',
  '.js':'application/javascript',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.json':'application/json'
};
const PORT = process.env.PORT || 4200;
http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  const ext = path.extname(file);
  res.writeHead(200, {'Content-Type': mime[ext] || 'text/plain'});
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log('ready on ' + PORT));
