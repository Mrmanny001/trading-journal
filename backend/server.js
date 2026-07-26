const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const store = require('./lib/store');
const { readJsonBody, sendJson } = require('./lib/http-utils');
const authRoutes = require('./routes/auth');
const journalRoutes = require('./routes/journal');
const dashboardRoutes = require('./routes/dashboard');

const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { user: null, token: null };

  const db = store.readDb();
  const entry = db.tokens[token];
  if (!entry || entry.expiresAt < Date.now()) return { user: null, token: null };

  const user = db.users.find((u) => u.id === entry.userId);
  if (!user) return { user: null, token: null };

  return { user, token };
}

// Route table: [method, regex, handler, { protected: bool }]
const routes = [
  ['POST', /^\/api\/auth\/signup\/?$/, authRoutes.handleSignup, false],
  ['POST', /^\/api\/auth\/login\/?$/, authRoutes.handleLogin, false],
  ['POST', /^\/api\/auth\/logout\/?$/, authRoutes.handleLogout, true],
  ['GET', /^\/api\/auth\/me\/?$/, authRoutes.handleMe, true],
  ['GET', /^\/api\/journal\/?$/, journalRoutes.listTrades, true],
  ['POST', /^\/api\/journal\/?$/, journalRoutes.createTrade, true],
  ['PUT', /^\/api\/journal\/([^/]+)\/?$/, journalRoutes.updateTrade, true],
  ['DELETE', /^\/api\/journal\/([^/]+)\/?$/, journalRoutes.deleteTrade, true],
  ['GET', /^\/api\/dashboard\/stats\/?$/, dashboardRoutes.getStats, true],
];

function serveStatic(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(FRONTEND_DIR, relativePath));

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA-ish fallback: unknown routes without an extension get index.html
      if (!path.extname(filePath)) {
        return fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404);
            return res.end('Not found');
          }
          res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
          res.end(fallback);
        });
      }
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function handleApi(req, res, pathname) {
  for (const [method, regex, handler, requiresAuth] of routes) {
    if (req.method !== method) continue;
    const match = pathname.match(regex);
    if (!match) continue;

    const { user, token } = getAuthUser(req);
    if (requiresAuth && !user) {
      return sendJson(res, 401, { error: 'Please sign in to continue.' });
    }

    let body = {};
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      try {
        body = await readJsonBody(req);
      } catch (err) {
        return sendJson(res, 400, { error: 'Malformed request body.' });
      }
    }

    const params = { id: match[1] };

    try {
      return await handler(req, res, { body, params, user, token });
    } catch (err) {
      console.error('Handler error:', err);
      return sendJson(res, 500, { error: 'Something went wrong on our end.' });
    }
  }
  return sendJson(res, 404, { error: 'Not found.' });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch((err) => {
      console.error(err);
      sendJson(res, 500, { error: 'Unexpected server error.' });
    });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Trading journal server running at http://localhost:${PORT}`);
});
