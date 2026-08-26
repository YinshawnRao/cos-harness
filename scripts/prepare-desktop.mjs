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

const required = [
  path.join(standalone, "server.js"),
  path.join(standalone, "node_modules", "next"),
  path.join(standalone, "node_modules", "cos-nodejs-sdk-v5"),
];
for (const file of required) {
  if (!fs.existsSync(file)) {
    throw new Error(`standalone 缺少 ${file}，打包后的桌面应用无法启动。`);
  }
}

console.log("已把 .next/static 与 public 复制进 standalone，可供 Electron 打包。");
