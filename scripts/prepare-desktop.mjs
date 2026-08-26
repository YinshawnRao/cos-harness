import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const publicSrc = path.join(root, "public");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("未找到 .next/standalone/server.js。请先运行 pnpm build。");
}

fs.cpSync(staticSrc, path.join(standalone, ".next", "static"), { recursive: true });
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(standalone, "public"), { recursive: true });
}

console.log("已把 .next/static 与 public 复制进 standalone，可供 Electron 打包。");
