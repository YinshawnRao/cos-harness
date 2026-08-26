"use strict";

/**
 * Pure Node helpers for the desktop shell. No Electron import so vitest can load this file.
 * The packaged app always listens on loopback; 0.0.0.0 is only allowed when COS_HARNESS_BIND_ALL=1
 * (Docker / explicit server deploy).
 */

const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const LISTEN_HOST = "127.0.0.1";
const PREFERRED_PORT = 47821;

function envFlag(env, name) {
  const value = env[name];
  return value === "1" || value === "true";
}

/**
 * @param {string | undefined} hostname
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
function resolveListenHost(hostname, env = process.env) {
  const bindAll = envFlag(env, "COS_HARNESS_BIND_ALL");
  if (!hostname || hostname === "localhost") return LISTEN_HOST;
  if (hostname === "0.0.0.0" || hostname === "::" || hostname === "[::]") {
    return bindAll ? hostname : LISTEN_HOST;
  }
  return hostname;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {string} [cwd]
 */
function resolveDataDir(env = process.env, cwd = process.cwd()) {
  const fromEnv = env.DATA_DIR;
  if (fromEnv && fromEnv.trim() !== "") return fromEnv;
  return path.join(cwd, "data");
}

/**
 * Electron userData already names the app; keep settings in a `data/` subfolder
 * so Chromium profile files stay separate from settings.enc / .master.key.
 * @param {string} userDataPath
 */
function desktopDataDir(userDataPath) {
  return path.join(userDataPath, "data");
}

function isAppOrigin(urlString, host, port) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.hostname !== host && url.hostname !== "localhost") return false;
    const urlPort = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
    return urlPort === Number(port);
  } catch {
    return false;
  }
}

function findNextCli(projectRoot) {
  const candidates = [
    path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("找不到 Next.js CLI。请先在项目根目录运行 pnpm install。");
}

function findStandaloneServer(resourcesPath) {
  const serverJs = path.join(resourcesPath, "next", "server.js");
  if (!fs.existsSync(serverJs)) {
    throw new Error(`找不到打包后的 Next 服务: ${serverJs}`);
  }
  return serverJs;
}

/**
 * @param {{ packaged: boolean, electronExecPath: string }} opts
 */
function resolveNodeExecutable({ packaged, electronExecPath }) {
  if (packaged) return electronExecPath;
  const candidates = [
    process.env.npm_node_execpath,
    process.env.NODE_BINARY,
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      fs.existsSync(candidate) &&
      !candidate.toLowerCase().includes("electron")
    ) {
      return candidate;
    }
  }
  return "node";
}

function spawnServerEnv({ packaged, dataDir, host, port, extra = {} }) {
  const hostname = resolveListenHost(host, { HOSTNAME: host });
  return {
    ...process.env,
    ...extra,
    DATA_DIR: dataDir,
    HOSTNAME: hostname,
    PORT: String(port),
    ...(packaged
      ? { ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production" }
      : {}),
  };
}

function portAvailable(port, host = LISTEN_HOST) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

function randomPort(host = LISTEN_HOST) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

async function pickListenPort(preferred = PREFERRED_PORT, host = LISTEN_HOST) {
  if (await portAvailable(preferred, host)) return preferred;
  return randomPort(host);
}

function waitForHttp(url, { timeoutMs = 120000, intervalMs = 250 } = {}) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve(undefined);
          return;
        }
        retryOrTimeout();
      });
      req.setTimeout(2000, () => {
        req.destroy();
        retryOrTimeout();
      });
      req.on("error", () => retryOrTimeout());
    };

    const retryOrTimeout = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`等待本地服务超时: ${url}`));
      } else {
        setTimeout(attempt, intervalMs);
      }
    };

    attempt();
  });
}

module.exports = {
  LISTEN_HOST,
  PREFERRED_PORT,
  desktopDataDir,
  findNextCli,
  findStandaloneServer,
  isAppOrigin,
  pickListenPort,
  portAvailable,
  resolveDataDir,
  resolveListenHost,
  resolveNodeExecutable,
  spawnServerEnv,
  waitForHttp,
};
