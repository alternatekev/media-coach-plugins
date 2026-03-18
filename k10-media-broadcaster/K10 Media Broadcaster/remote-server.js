// ═══════════════════════════════════════════════════════════════
// K10 Media Broadcaster — Remote Dashboard Server
// LAN-accessible HTTP server that serves the dashboards and
// proxies SimHub telemetry so iPads/tablets only need one URL.
// ═══════════════════════════════════════════════════════════════

const http = require('http');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Constants ────────────────────────────────────────────────
const DEFAULT_PORT = 9090;
const SIMHUB_DEFAULT = 'http://localhost:8889';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.map': 'application/json',
};

const DASHBOARD_MAP = {
  build: 'dashboard-build.html',
};

// ── State ────────────────────────────────────────────────────
let _server      = null;
let _port        = DEFAULT_PORT;
let _appDir      = __dirname;
let _simhubBase  = SIMHUB_DEFAULT;
let _logFn       = console.log;

// ── LAN IP helper ────────────────────────────────────────────
function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) return info.address;
    }
  }
  return '0.0.0.0';
}

// ── Proxy a request to the SimHub plugin ─────────────────────
function proxyToSimhub(req, res) {
  // Forward everything after /k10mediabroadcaster/ to SimHub
  const target = `${_simhubBase}${req.url}`;

  const proxyReq = http.get(target, { timeout: 3000 }, (proxyRes) => {
    // Forward status + headers
    res.writeHead(proxyRes.statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'SimHub unreachable', detail: err.message }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'SimHub timeout' }));
  });
}

// ── Serve a static file ──────────────────────────────────────
function serveFile(filePath, res) {
  // Security: don't escape _appDir
  const resolved = path.resolve(filePath);
  const resolvedBase = path.resolve(_appDir);
  if (!resolved.startsWith(resolvedBase)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
}

// ── Landing page → redirect straight to dashboard ────────────
function serveLandingPage(req, res) {
  res.writeHead(302, { 'Location': '/build/' });
  res.end();
}

// ── Inject remote-mode overrides + iPad touch menu ───────────
// This makes the dashboard's fetch() calls hit this server's
// proxy instead of localhost:8889 (which isn't reachable from iPad),
// and injects a touch-friendly floating menu for key commands.
function injectSimhubOverride(html, req) {
  const host = req.headers.host || `${getLanAddress()}:${_port}`;
  const proxyUrl = `http://${host}/k10mediabroadcaster/`;

  const injection = `<script>
// ── K10 Remote Server Injection ──
window._simhubUrlOverride = '${proxyUrl}';
window._k10RemoteMode = true;
// Auto-detect iPad/iPhone for K10 Pro Driver mode
window._k10IsIOS = /iPad|iPhone/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
</script>
<link rel="stylesheet" href="/modules/styles/drive-mode.css">
<script src="/modules/js/drive-mode.js"></script>
<script>document.addEventListener('DOMContentLoaded', function() { if (window.initDriveMode) window.initDriveMode(); });</script>
<style>
/* ── iPad Touch Menu ── */
#k10-remote-menu-fab {
  position: fixed; bottom: 20px; right: 20px; z-index: 99999;
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(108,92,231,0.85); border: 2px solid rgba(255,255,255,0.2);
  color: #fff; font-size: 22px; line-height: 48px; text-align: center;
  cursor: pointer; user-select: none; -webkit-user-select: none;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  transition: transform 0.2s, background 0.2s;
  -webkit-tap-highlight-color: transparent;
}
#k10-remote-menu-fab:active { transform: scale(0.9); }
#k10-remote-menu-fab.open { background: rgba(108,92,231,1); transform: rotate(45deg); }

#k10-remote-menu-panel {
  position: fixed; bottom: 80px; right: 20px; z-index: 99998;
  background: rgba(16,16,30,0.95); border: 1px solid rgba(108,92,231,0.4);
  border-radius: 14px; padding: 8px; min-width: 200px;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  transform: translateY(10px) scale(0.95); opacity: 0;
  pointer-events: none; transition: all 0.2s ease;
}
#k10-remote-menu-panel.open {
  transform: translateY(0) scale(1); opacity: 1; pointer-events: auto;
}

.k10-rm-btn {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 12px 14px; margin: 0;
  background: transparent; border: none; border-radius: 10px;
  color: #e0e0e0; font-size: 14px; font-family: system-ui, sans-serif;
  cursor: pointer; text-align: left; -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.k10-rm-btn:active { background: rgba(108,92,231,0.3); }
.k10-rm-btn .k10-rm-icon { font-size: 18px; width: 24px; text-align: center; flex-shrink: 0; }
.k10-rm-btn .k10-rm-label { flex: 1; }
.k10-rm-sep { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 8px; }

/* Hide the FAB during fullscreen to avoid clutter, show on tap */
@media (display-mode: fullscreen) {
  #k10-remote-menu-fab { opacity: 0.3; }
  #k10-remote-menu-fab:hover, #k10-remote-menu-fab.open { opacity: 1; }
}

/* Prevent iOS rubber-banding & double-tap zoom on dashboard */
html, body { overscroll-behavior: none; touch-action: manipulation; }
</style>
<script>
document.addEventListener('DOMContentLoaded', () => {
  // Only show on touch devices (iPad, phone, etc.)
  if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

  // ── Build the menu DOM ──
  const fab = document.createElement('div');
  fab.id = 'k10-remote-menu-fab';
  fab.textContent = '+';

  const panel = document.createElement('div');
  panel.id = 'k10-remote-menu-panel';

  const actions = [
    { icon: '\u2699\uFE0F', label: 'Settings',        fn: () => { if (typeof toggleSettings === 'function') toggleSettings(); } },
    { icon: '\uD83D\uDD04', label: 'Cycle Rating/Pos', fn: () => { if (typeof cycleRatingPos === 'function') cycleRatingPos(); } },
    { icon: '\uD83D\uDE97', label: 'Cycle Car Logo',   fn: () => { if (typeof cycleCarLogo === 'function') cycleCarLogo(); } },
    { sep: true },
    { icon: '\uD83D\uDCFA', label: 'Fullscreen',       fn: () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    },
    { icon: '\uD83D\uDD17', label: 'Reconnect',        fn: () => {
        // Reset backoff to force immediate reconnect
        if (typeof _connFails !== 'undefined') { _connFails = 0; _backoffUntil = 0; }
      }
    },
  ];

  actions.forEach(a => {
    if (a.sep) {
      const sep = document.createElement('div');
      sep.className = 'k10-rm-sep';
      panel.appendChild(sep);
      return;
    }
    const btn = document.createElement('button');
    btn.className = 'k10-rm-btn';
    btn.innerHTML = '<span class="k10-rm-icon">' + a.icon + '</span><span class="k10-rm-label">' + a.label + '</span>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      a.fn();
      // Close menu after action (except fullscreen)
      if (a.label !== 'Fullscreen') {
        fab.classList.remove('open');
        panel.classList.remove('open');
      }
    });
    panel.appendChild(btn);
  });

  document.body.appendChild(panel);
  document.body.appendChild(fab);

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = fab.classList.toggle('open');
    panel.classList.toggle('open', isOpen);
  });

  // Close menu when tapping elsewhere
  document.addEventListener('click', () => {
    fab.classList.remove('open');
    panel.classList.remove('open');
  });
});
</script>`;

  // Insert right after <head>
  if (html.includes('<head>')) {
    return html.replace('<head>', '<head>' + injection);
  }
  return html.replace('<body', injection + '<body');
}

// ── Request handler ──────────────────────────────────────────
function handleRequest(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ── Telemetry proxy: /k10mediabroadcaster/*
  if (urlPath.startsWith('/k10mediabroadcaster')) {
    proxyToSimhub(req, res);
    return;
  }

  // ── Health/info endpoint
  if (urlPath === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      app: 'K10 Media Broadcaster',
      remoteServer: true,
      port: _port,
      lanAddress: getLanAddress(),
      dashboards: Object.keys(DASHBOARD_MAP).filter(k => fs.existsSync(path.join(_appDir, DASHBOARD_MAP[k]))),
    }));
    return;
  }

  // ── Landing page: /
  if (urlPath === '/' || urlPath === '') {
    serveLandingPage(req, res);
    return;
  }

  // ── Dashboard routes: /original/, /react/, /build/
  const dashMatch = urlPath.match(/^\/(original|react|build)(\/.*)?$/);
  if (dashMatch) {
    const variant = dashMatch[1];
    let subPath = dashMatch[2] || '/';

    const dashFile = DASHBOARD_MAP[variant];
    if (!dashFile) {
      res.writeHead(404); res.end('Unknown dashboard variant'); return;
    }

    // Root of variant → serve the dashboard HTML with injected proxy URL
    if (subPath === '/' || subPath === '') {
      const htmlPath = path.join(_appDir, dashFile);
      fs.readFile(htmlPath, 'utf8', (err, html) => {
        if (err) {
          res.writeHead(404); res.end(`${dashFile} not found`); return;
        }
        const patched = injectSimhubOverride(html, req);
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(patched);
      });
      return;
    }

    // Sub-assets: /original/modules/styles/base.css → modules/styles/base.css
    const assetPath = path.join(_appDir, subPath);
    serveFile(assetPath, res);
    return;
  }

  // ── Fallback: serve static files from app directory
  const filePath = path.join(_appDir, urlPath);
  serveFile(filePath, res);
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Start the remote dashboard server.
 * @param {Object} opts
 * @param {number} [opts.port=9090]       - Port to listen on
 * @param {string} [opts.appDir=__dirname] - Path to K10 app directory
 * @param {string} [opts.simhubUrl]       - Override SimHub base URL
 * @param {Function} [opts.log]           - Logging function
 * @returns {Promise<{port: number, lanAddress: string, url: string}>}
 */
function start(opts = {}) {
  return new Promise((resolve, reject) => {
    if (_server) {
      const info = getInfo();
      resolve(info);
      return;
    }

    _port      = opts.port     || DEFAULT_PORT;
    _appDir    = opts.appDir   || __dirname;
    _simhubBase = opts.simhubUrl || SIMHUB_DEFAULT;
    _logFn     = opts.log      || console.log;

    // Strip trailing slash from simhubBase
    _simhubBase = _simhubBase.replace(/\/+$/, '');

    _server = http.createServer(handleRequest);

    _server.listen(_port, '0.0.0.0', () => {
      const info = getInfo();
      _logFn(`[K10] Remote dashboard server started: ${info.url}`);
      resolve(info);
    });

    _server.on('error', (err) => {
      _logFn(`[K10] Remote server error: ${err.message}`);
      _server = null;
      reject(err);
    });
  });
}

/**
 * Stop the remote dashboard server.
 */
function stop() {
  return new Promise((resolve) => {
    if (!_server) { resolve(); return; }
    _server.close(() => {
      _logFn('[K10] Remote dashboard server stopped');
      _server = null;
      resolve();
    });
  });
}

/**
 * Check if the server is running.
 */
function isRunning() {
  return _server !== null;
}

/**
 * Get server info.
 */
function getInfo() {
  const lanAddress = getLanAddress();
  return {
    running: _server !== null,
    port: _port,
    lanAddress,
    url: `http://${lanAddress}:${_port}`,
  };
}

module.exports = { start, stop, isRunning, getInfo, getLanAddress, DEFAULT_PORT };
