// Minimal placeholder server for the web service, used only until the
// Next.js scaffold lands in Fase 2. Keeps the Fase 1 Docker Compose
// environment (healthcheck, nginx proxy, hot reload) fully verifiable
// before any application code exists.
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    '<!doctype html><html><body>' +
      '<h1>Pepi Visión 360 — entorno de desarrollo</h1>' +
      '<p>Fase 1: Docker Compose. El scaffold de Next.js se agrega en la Fase 2.</p>' +
      '</body></html>'
  );
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Placeholder server listening on port ${port}`);
});
