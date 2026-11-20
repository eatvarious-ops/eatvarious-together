import http from "node:http";
import { readFile } from "node:fs/promises";
const port = Number(process.env.PORT || 4173);
http
  .createServer(async (req, res) => {
    const path = (req.url || "/").split("?")[0];
    const files = {
      "/": ["dist/index.html", "text/html; charset=utf-8"],
      "/index.html": ["dist/index.html", "text/html; charset=utf-8"],
      "/itda.html": ["dist/index.html", "text/html; charset=utf-8"],
    };
    const file = files[path];
    if (!file) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const data = await readFile(file[0]);
      res.writeHead(200, { "Content-Type": file[1] });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(port, "127.0.0.1", () => console.log("http://127.0.0.1:" + port));
