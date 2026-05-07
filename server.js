import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT) || 4173;
const root = path.join(__dirname, "dist", "client");

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

const sendFile = (res, filePath) => {
  const stream = fs.createReadStream(filePath);
  const mimeType = getMimeType(filePath);
  res.writeHead(200, { "Content-Type": mimeType, "Cache-Control": "public, max-age=31536000, immutable" });
  stream.pipe(res);
};

const server = http.createServer((req, res) => {
  const rawUrl = req.url || "/";
  const cleanedUrl = decodeURIComponent(rawUrl.split("?")[0]);
  const safePath = path.normalize(path.join(root, cleanedUrl));

  if (!safePath.startsWith(root)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  let filePath = safePath;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server started on http://0.0.0.0:${port}`);
});
