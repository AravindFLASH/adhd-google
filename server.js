/**
 * FocusPulse - Zero-Dependency Local Dev Server
 * Serves the application locally on http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(payload));
}

async function buildPresageStatus() {
  const apiKey = process.env.PRESAGE_API_KEY || '';
  const hasApiKey = Boolean(apiKey.trim());
  let sdkInstalled = false;
  let sdkLoadError = null;

  try {
    await import('@smartspectra/node-sdk');
    sdkInstalled = true;
  } catch (err) {
    sdkLoadError = err?.code || err?.message || 'Unknown SDK load error';
  }

  return {
    ok: hasApiKey && sdkInstalled,
    mode: hasApiKey && sdkInstalled ? 'ready' : 'not_ready',
    hasApiKey,
    sdkInstalled,
    sdkLoadError,
    checkedAt: new Date().toISOString()
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/presage-status') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      writeJson(res, 405, { error: 'Method Not Allowed' });
      return;
    }

    try {
      const status = await buildPresageStatus();
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 500, {
        ok: false,
        mode: 'error',
        error: err?.message || 'Failed to check Presage status'
      });
    }
    return;
  }

  let safePath = path.normalize(decodeURIComponent(pathname));
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(BASE_DIR, safePath);

  // Security check: ensure path stays within BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${safePath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set CORS and permissive headers for media streaming
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startServer(port) {
  server.removeAllListeners('error');
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, HOST, () => {
    console.log(`=======================================================`);
    console.log(`FocusPulse (SmartSpectra ADHD Co-Pilot) is running!`);
    console.log(`Listening on http://${HOST}:${port}`);
    console.log(`=======================================================`);
  });
}

startServer(PORT);
