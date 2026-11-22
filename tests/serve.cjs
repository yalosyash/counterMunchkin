const { readFile } = require("node:fs/promises");
const { createServer } = require("node:http");
const { extname, resolve } = require("node:path");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function createTestServer() {
  return createServer(serve);
}

async function serve(request, response) {
  const { pathname } = new URL(request.url, "http://127.0.0.1");
  // Only serve the page and its static assets.
  const file = pathname === "/" ? "/index.html" : pathname;
  const type = types[extname(file)];
  const isPublic = /^\/(?:index\.html$|(?:js|css|assets)\/[\w/.-]+$)/.test(
    file,
  );
  if (!type || !isPublic) {
    response.writeHead(404).end();
    return;
  }

  try {
    const body = await readFile(resolve(__dirname, "..", "." + file));
    response.writeHead(200, { "Content-Type": type }).end(body);
  } catch {
    response.writeHead(404).end();
  }
}

module.exports = { createTestServer };
