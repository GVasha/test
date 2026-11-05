import http from 'node:http';

const port = Number.parseInt(process.env.PORT || '8080', 10);
const host = '0.0.0.0';

console.log('[collecta] boot', {
  node: process.version,
  port,
  cwd: process.cwd(),
  argv: process.execArgv,
});

let appHandler = (req, res) => {
  const url = req.url || '/';
  if (url.startsWith('/api/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'booting', node: process.version }));
    return;
  }
  res.writeHead(503, { 'Content-Type': 'text/plain' });
  res.end('Collecta is still starting');
};

const server = http.createServer((req, res) => appHandler(req, res));

server.listen(port, host, () => {
  console.log(`[collecta] listening on http://${host}:${port}`);
});

process.on('uncaughtException', (err) => {
  console.error('[collecta] uncaughtException', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[collecta] unhandledRejection', err);
});

try {
  const imported = await import('./index.js');
  const app = imported.default;
  if (typeof app !== 'function') {
    throw new Error('Express app was not exported');
  }
  appHandler = (req, res) => app(req, res);
  console.log('[collecta] application ready');
} catch (err) {
  console.error('[collecta] failed to load application', err);
  const message = err?.stack || String(err);
  appHandler = (req, res) => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
  };
}
