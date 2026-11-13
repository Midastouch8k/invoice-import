import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import apiRouter from "./routes";
import { getNodeEnv, getOptionalEnv } from "./utils/env";

export function createApp(): express.Express {
  const app = express();

  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    getOptionalEnv("CLIENT_URL"),
  ].filter((o): o is string => Boolean(o));

  // API hardening: security headers (CORP relaxed so the CORS-enabled
  // client can consume responses cross-origin; CSP disabled for server explorer).
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    }),
  );

  if (getNodeEnv() !== "test") {
    app.use(requestLogger);
  }

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice Import — API Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
      min-height: 100vh;
    }
    .container { max-width: 760px; width: 100%; }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      margin-bottom: 1.5rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    h1 { font-size: 1.5rem; color: #f1f5f9; display: flex; align-items: center; gap: 0.5rem; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      background: #064e3b;
      color: #34d399;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-weight: 600;
      border: 1px solid #059669;
    }
    .badge-dot { width: 8px; height: 8px; background: #34d399; border-radius: 50%; }
    p.lead { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      background: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .btn:hover { border-color: #38bdf8; background: #1e293b; color: #38bdf8; }
    .btn-primary { background: #0284c7; border-color: #0284c7; color: #fff; }
    .btn-primary:hover { background: #0369a1; border-color: #0369a1; color: #fff; }
    .btn small { color: #94a3b8; font-size: 0.75rem; }
    
    .section-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .auth-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .auth-status { font-size: 0.85rem; color: #94a3b8; }
    .auth-status.signed-in { color: #34d399; font-weight: 500; }
    .login-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .login-btn:hover { background: #2563eb; }

    .endpoint-list { display: grid; gap: 0.5rem; margin-bottom: 1.5rem; }
    button.ep-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 0.65rem 0.85rem;
      cursor: pointer;
      font: inherit;
      color: inherit;
      text-align: left;
      transition: all 0.15s ease;
      outline: none;
    }
    button.ep-item:hover {
      border-color: #38bdf8;
      background: #172554;
      transform: translateY(-1px);
    }
    button.ep-item:active {
      transform: scale(0.99);
    }
    .ep-left { display: flex; align-items: center; gap: 0.75rem; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.85rem; }
    .method {
      display: inline-block;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      width: 48px;
      text-align: center;
    }
    .get { background: #0c4a6e; color: #38bdf8; border: 1px solid #0369a1; }
    .post { background: #064e3b; color: #34d399; border: 1px solid #059669; }
    .path { color: #f1f5f9; font-weight: 500; }
    .desc { font-size: 0.75rem; color: #94a3b8; font-family: sans-serif; }
    .ep-right { display: flex; align-items: center; gap: 0.5rem; }
    .click-tag {
      font-size: 0.7rem;
      font-weight: 600;
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #334155;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }
    .raw-link {
      color: #64748b;
      text-decoration: none;
      font-size: 0.85rem;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
    }
    .raw-link:hover { color: #38bdf8; background: #1e293b; }

    .response-card {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 8px;
      overflow: hidden;
    }
    .response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 1rem;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      font-size: 0.8rem;
    }
    .status-tag {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .status-tag.idle { background: #334155; color: #cbd5e1; }
    .status-tag.loading { background: #854d0e; color: #fef08a; }
    .status-tag.success { background: #064e3b; color: #34d399; }
    .status-tag.error { background: #7f1d1d; color: #fca5a5; }
    pre {
      padding: 1rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 0.8rem;
      color: #cbd5e1;
      overflow-x: auto;
      max-height: 380px;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Invoice Import API Server</h1>
        <span class="badge"><span class="badge-dot"></span> Online (Port 8080)</span>
      </div>
      <p class="lead">Express & Bun backend connected to Neon PostgreSQL via Prisma ORM.</p>
      
      <div class="links">
        <a href="http://localhost:5173" class="btn btn-primary">
          <span>🖥️ Open Frontend Web App</span>
          <small>localhost:5173 &rarr;</small>
        </a>
        <a href="http://localhost:5555" class="btn" target="_blank">
          <span>🗄️ Open Prisma Database Studio</span>
          <small>localhost:5555 &rarr;</small>
        </a>
      </div>

      <div class="section-title">
        <span>Interactive API Explorer (Click Any Endpoint to Test)</span>
      </div>

      <div class="auth-banner">
        <div>
          <span class="auth-status" id="auth-status">Not signed in (protected routes return 401)</span>
        </div>
        <button type="button" class="login-btn" id="quick-login-btn">⚡ 1-Click Admin Sign-In</button>
      </div>

      <div class="endpoint-list">
        <button type="button" class="ep-item" data-method="GET" data-path="/api/health" data-auth="false">
          <div class="ep-left">
            <span class="method get">GET</span>
            <span class="path">/api/health</span>
            <span class="desc">Database & server health check</span>
          </div>
          <div class="ep-right">
            <span class="click-tag">Run &rarr;</span>
            <a class="raw-link" href="/api/health" target="_blank" title="Open raw in browser">↗</a>
          </div>
        </button>

        <button type="button" class="ep-item" data-method="POST" data-path="/api/auth/login" data-body='{"email":"michael.tucker@meridianfg.com","password":"Password123!"}' data-auth="false">
          <div class="ep-left">
            <span class="method post">POST</span>
            <span class="path">/api/auth/login</span>
            <span class="desc">Sign in with demo credentials</span>
          </div>
          <div class="ep-right">
            <span class="click-tag">Run &rarr;</span>
          </div>
        </button>

        <button type="button" class="ep-item" data-method="GET" data-path="/api/auth/me" data-auth="true">
          <div class="ep-left">
            <span class="method get">GET</span>
            <span class="path">/api/auth/me</span>
            <span class="desc">Current user profile & locations</span>
          </div>
          <div class="ep-right">
            <span class="click-tag">Run &rarr;</span>
          </div>
        </button>

        <button type="button" class="ep-item" data-method="GET" data-path="/api/invoices?pageSize=5" data-auth="true">
          <div class="ep-left">
            <span class="method get">GET</span>
            <span class="path">/api/invoices?pageSize=5</span>
            <span class="desc">Approved invoice ledger records</span>
          </div>
          <div class="ep-right">
            <span class="click-tag">Run &rarr;</span>
          </div>
        </button>

        <button type="button" class="ep-item" data-method="GET" data-path="/api/upload/staging?status=ALL&pageSize=5" data-auth="true">
          <div class="ep-left">
            <span class="method get">GET</span>
            <span class="path">/api/upload/staging?status=ALL&pageSize=5</span>
            <span class="desc">Staged invoice batch rows</span>
          </div>
          <div class="ep-right">
            <span class="click-tag">Run &rarr;</span>
          </div>
        </button>

        <button type="button" class="ep-item" data-method="GET" data-path="/api/upload/batches?pageSize=5" data-auth="true">
          <div class="ep-left">
            <span class="method get">GET</span>
            <span class="path">/api/upload/batches?pageSize=5</span>
            <span class="desc">Recent file upload batches</span>
          </div>
          <div class="ep-right">
            <span class="click-tag">Run &rarr;</span>
          </div>
        </button>
      </div>

      <div class="response-card">
        <div class="response-header">
          <span style="font-weight: 600; color: #94a3b8;" id="response-target">Live Response Window</span>
          <span class="status-tag idle" id="status-tag">Ready</span>
        </div>
        <pre id="output">// Click any endpoint above to send a real API request and see live results here...</pre>
      </div>
    </div>
  </div>

  <script>
    let token = '';

    async function testEndpoint(method, path, body = null, needsAuth = false) {
      const outputEl = document.getElementById('output');
      const statusEl = document.getElementById('status-tag');
      const targetEl = document.getElementById('response-target');

      targetEl.textContent = method + ' ' + path;
      outputEl.textContent = 'Sending ' + method + ' ' + path + '...';
      statusEl.textContent = 'Loading...';
      statusEl.className = 'status-tag loading';

      try {
        const headers = { 'Accept': 'application/json' };
        if (body) headers['Content-Type'] = 'application/json';
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(path, {
          method: method,
          headers: headers,
          body: body ? JSON.stringify(body) : undefined
        });

        const data = await res.json().catch(() => ({}));
        statusEl.textContent = res.status + ' ' + res.statusText;
        statusEl.className = 'status-tag ' + (res.ok ? 'success' : 'error');
        outputEl.textContent = JSON.stringify(data, null, 2);

        if (path === '/api/auth/login' && data.token) {
          token = data.token;
          const authStatus = document.getElementById('auth-status');
          authStatus.textContent = 'Signed in as Michael Tucker (HQ_ADMIN) - JWT Active';
          authStatus.className = 'auth-status signed-in';
        }
      } catch (err) {
        statusEl.textContent = 'Network Error';
        statusEl.className = 'status-tag error';
        outputEl.textContent = String(err);
      }
    }

    async function quickLogin() {
      await testEndpoint('POST', '/api/auth/login', {
        email: 'michael.tucker@meridianfg.com',
        password: 'Password123!'
      });
    }

    document.querySelectorAll('button.ep-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const method = btn.getAttribute('data-method');
        const path = btn.getAttribute('data-path');
        const auth = btn.getAttribute('data-auth') === 'true';
        let body = null;
        const bodyAttr = btn.getAttribute('data-body');
        if (bodyAttr) {
          try { body = JSON.parse(bodyAttr); } catch (_) {}
        }
        testEndpoint(method, path, body, auth);
      });
    });

    document.getElementById('quick-login-btn').addEventListener('click', quickLogin);

    // Run health check on initial load to show live data immediately
    testEndpoint('GET', '/api/health');
  </script>
</body>
</html>`);
  });

  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
