console.log('[collecta] starting', {
  node: process.version,
  port: process.env.PORT,
  cwd: process.cwd(),
});

process.on('uncaughtException', (err) => {
  console.error('[collecta] uncaughtException', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[collecta] unhandledRejection', err);
  process.exit(1);
});

try {
  await import('./index.js');
} catch (err) {
  console.error('[collecta] failed to start', err);
  process.exit(1);
}
