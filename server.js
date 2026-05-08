import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT) || 4173;
const clientRoot = path.join(__dirname, "dist", "client");
const serverEntryUrl = new URL("./dist/server/server.js", import.meta.url);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".eot": "application/vnd.ms-fontobject",
  ".ttf": "font/ttf",
};

const getMimeType = (filename) => mimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream";

const toNodeHeaders = (headers) => {
  const result = {};
  for (const [key, value] of headers) {
    if (result[key]) {
      result[key] = Array.isArray(result[key]) ? [...result[key], value] : [result[key], value];
    } else {
      result[key] = value;
    }
  }
  return result;
};

const sendStaticFile = (res, filePath) => {
  const mimeType = getMimeType(filePath);
  res.writeHead(200, { "Content-Type": mimeType, "Cache-Control": "public, max-age=31536000, immutable" });
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
};

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const isStaticAsset = (filePath) => {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
};

const createRequest = async (req) => {
  const protocol = "http";
  const host = req.headers.host ?? `localhost:${port}`;
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else {
      headers.append(name, value);
    }
  }

  const init = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await streamToBuffer(req);
    if (body.length) init.body = body;
  }

  return new Request(url.toString(), init);
};

const handleServerRequest = async (req, res) => {
  const rawUrl = req.url || "/";
  const cleanedUrl = decodeURIComponent(rawUrl.split("?")[0]);
  const safePath = path.normalize(path.join(clientRoot, cleanedUrl));

  if (safePath.startsWith(clientRoot) && isStaticAsset(safePath)) {
    sendStaticFile(res, safePath);
    return;
  }

  const indexFile = path.join(clientRoot, "index.html");
  if (cleanedUrl === "/" && isStaticAsset(indexFile)) {
    sendStaticFile(res, indexFile);
    return;
  }

  try {
    const serverModule = await import(serverEntryUrl.href);
    const serverEntry = serverModule.default ?? serverModule;
    const request = await createRequest(req);
    const response = await serverEntry.fetch(request);

    res.writeHead(response.status, toNodeHeaders(response.headers));

    if (response.body) {
      if (response.body instanceof Readable) {
        response.body.pipe(res);
      } else {
        const nodeStream = Readable.fromWeb(response.body);
        nodeStream.pipe(res);
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
};

const server = http.createServer((req, res) => {
  handleServerRequest(req, res).catch((error) => {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server started on http://0.0.0.0:${port}`);
});
