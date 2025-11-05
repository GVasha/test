import http from 'node:http';

const port = Number.parseInt(process.env.PORT || '8080', 10);

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

function onRequest(req, res) {
  appHandler(req, res);
}

function listenOn(host, extra = {}) {
  const server = http.createServer(onRequest);
  server.on('error', (err) => {
    console.error(`[collecta] listen ${host} failed`, err.code || err.message);
  });
  server.listen({ port, host, ...extra }, () => {
    console.log('[collecta] listening', server.address());
  });
  return server;
}

// Railway's proxy may connect over IPv4 or IPv6. Bind both.
listenOn('0.0.0.0');
listenOn('::', { ipv6Only: true });

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
