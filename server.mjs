import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3088);
const HOST = process.env.HOSTNAME || "::";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
};

const LEADS_FILE = path.join(__dirname, "leads.json");

function saveLead(entry) {
  let list = [];
  try {
    if (fs.existsSync(LEADS_FILE)) {
      list = JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
      if (!Array.isArray(list)) list = [];
    }
  } catch {
    list = [];
  }
  list.unshift({ ...entry, createdAt: new Date().toISOString() });
  fs.writeFileSync(LEADS_FILE, JSON.stringify(list, null, 2), "utf8");
}

function serveFileWithRange(req, res, filePath) {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const range = req.headers.range;

  if (range && ext === ".mp4") {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": stat.size,
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // API lưu thông tin khách đăng ký dùng thử từ Landing Page
  if (pathname === "/api/contact" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 50_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const hotelName = String(data.hotelName || "").trim();
        const phone = String(data.phone || "").trim();
        const roomCount = String(data.roomCount || "").trim();
        const plan = String(data.plan || "").trim();
        if (!hotelName || !phone) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, message: "Vui lòng nhập tên khách sạn và SĐT." }));
          return;
        }
        saveLead({ hotelName, phone, roomCount, plan });
        console.log(`[OMOSHOP LEAD] ${hotelName} | ${phone} | ${roomCount} | ${plan}`);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: true, message: "Đã nhận yêu cầu tư vấn!" }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ success: false, message: "Dữ liệu không hợp lệ." }));
      }
    });
    return;
  }

  // Phục vụ file tĩnh (assets/* hoặc index.html)
  const relPath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const safePath = path.normalize(path.join(__dirname, relPath));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    serveFileWithRange(req, res, safePath);
    return;
  }

  // Fallback về index.html
  const indexFile = path.join(__dirname, "index.html");
  if (fs.existsSync(indexFile)) {
    serveFileWithRange(req, res, indexFile);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`[PMVN Landing - omoshop.live] Dang chay tai http://localhost:${PORT}`);
});
