import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { handle } from './api/tracker.js';

const assets = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'],
  '/style.css': ['style.css', 'text/css'] };
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:' + port);
  try {
    if (url.pathname === '/api/tracker') {
      let body;
      if (req.method === 'POST') {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 8192) { res.writeHead(413).end(); return; }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const reply = await handle(new Request(url, { method: req.method, headers: req.headers, body }));
      res.writeHead(reply.status, Object.fromEntries(reply.headers)).end(Buffer.from(await reply.arrayBuffer()));
      return;
    }
    const asset = assets[url.pathname];
    if (!asset) { res.writeHead(404).end(); return; }
    const [file, mime] = asset;
    res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' }).end(await readFile(new URL('./public/' + file, import.meta.url)));
  } catch { res.writeHead(500).end(); }
}).listen(port, '127.0.0.1', () => console.log('Preview at http://127.0.0.1:' + port));
