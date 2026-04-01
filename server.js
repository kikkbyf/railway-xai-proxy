import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT || 3000);
const relayToken = (process.env.RELAY_TOKEN || '').trim();
const upstreamBaseUrl = (process.env.UPSTREAM_BASE_URL || 'https://api.x.ai').replace(/\/+$/, '');
const allowedMethods = new Set(['GET', 'POST', 'HEAD', 'OPTIONS']);
const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length'
]);

if (!relayToken) {
  console.error('缺少 RELAY_TOKEN，服务无法启动。');
  process.exit(1);
}

const tokenPrefix = `/${relayToken}`;

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(chunks.length ? Buffer.concat(chunks) : undefined);
    });

    req.on('error', reject);
  });
}

function buildForwardHeaders(req) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (!value || hopByHopHeaders.has(name.toLowerCase())) {
      continue;
    }

    if (Array.isArray(value)) {
      headers.set(name, value.join(', '));
      continue;
    }

    headers.set(name, value);
  }

  headers.set('x-forwarded-host', req.headers.host || '');
  headers.set('x-forwarded-proto', 'https');
  return headers;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/health') {
      sendJson(res, 200, { ok: true, upstreamBaseUrl });
      return;
    }

    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (!requestUrl.pathname.startsWith(tokenPrefix)) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    if (!allowedMethods.has(req.method || '')) {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const upstreamPath = requestUrl.pathname.slice(tokenPrefix.length) || '/';
    if (!upstreamPath.startsWith('/v1/')) {
      sendJson(res, 404, { error: 'Unsupported path' });
      return;
    }

    const upstreamUrl = `${upstreamBaseUrl}${upstreamPath}${requestUrl.search}`;
    const body = req.method === 'POST' ? await collectRequestBody(req) : undefined;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: buildForwardHeaders(req),
      body
    });

    const responseHeaders = {};
    upstreamResponse.headers.forEach((value, name) => {
      if (hopByHopHeaders.has(name.toLowerCase())) {
        return;
      }
      responseHeaders[name] = value;
    });
    responseHeaders['cache-control'] = 'no-store';

    res.writeHead(upstreamResponse.status, responseHeaders);

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(responseBuffer);
  } catch (error) {
    console.error('代理转发失败:', error);
    sendJson(res, 502, {
      error: 'Upstream request failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`xAI HTTPS relay listening on ${port}`);
  console.log(`upstream: ${upstreamBaseUrl}`);
});
