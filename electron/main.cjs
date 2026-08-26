"use strict";

const { app, BrowserWindow, Menu, shell, nativeTheme } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const runtime = require("./runtime.cjs");

const {
  LISTEN_HOST,
  PREFERRED_PORT,
  desktopDataDir,
  findNextCli,
  findStandaloneServer,
  isAppOrigin,
  pickListenPort,
  resolveNodeExecutable,
  spawnServerEnv,
  waitForHttp,
} = runtime;

nativeTheme.themeSource = "dark";
app.setName("COS Harness");

const PROJECT_ROOT = path.join(__dirname, "..");
const ICON_PATH = path.join(PROJECT_ROOT, "assets", "icon.png");
const wantProd = process.argv.includes("--prod") || process.env.COS_HARNESS_PROD === "1";

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null;
let serverPort = PREFERRED_PORT;
let quitting = false;

if (process.env.COS_HARNESS_NO_SANDBOX === "1" || process.env.CI === "true") {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-setuid-sandbox");
  app.commandLine.appendSwitch("no-zygote");
}

// Chromium needs exec on /dev/shm; some VMs/containers mount it noexec.
app.commandLine.appendSwitch("disable-dev-shm-usage");

function isPackaged() {
  return app.isPackaged;
}

function dataDir() {
  return desktopDataDir(app.getPath("userData"));
}

function appUrl(pathname = "/") {
  return `http://${LISTEN_HOST}:${serverPort}${pathname}`;
}

function showSplash() {
  if (!mainWindow) return;
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <title>COS Harness</title>
  <style>
    html, body { height: 100%; margin: 0; background: #121820; color: #d7e6ea; font-family: system-ui, sans-serif; }
    main { height: 100%; display: grid; place-items: center; text-align: center; }
    h1 { font-size: 18px; letter-spacing: 0.04em; margin: 0 0 8px; color: #7ee7d6; }
    p { margin: 0; font-size: 13px; opacity: 0.72; }
  </style>
</head>
<body>
  <main>
    <div>
      <h1>COS Harness</h1>
      <p>正在启动本地服务…</p>
    </div>
  </main>
</body>
</html>`;
  void mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: "COS Harness",
    backgroundColor: "#121820",
    autoHideMenuBar: false,
    show: false,
    icon: fs.existsSync(ICON_PATH) ? ICON_PATH : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppOrigin(url, LISTEN_HOST, serverPort)) {
      return { action: "allow" };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!isAppOrigin(url, LISTEN_HOST, serverPort) && !url.startsWith("data:")) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  showSplash();
}

function loadPath(pathname) {
  if (!mainWindow) return;
  void mainWindow.loadURL(appUrl(pathname));
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  /** @type {Electron.MenuItemConstructorOptions[]} */
  const template = [
    ...(isMac
      ? [
          {
            label: "COS Harness",
            submenu: [
              { role: "about", label: "关于 COS Harness" },
              { type: "separator" },
              { role: "hide", label: "隐藏" },
              { role: "hideOthers", label: "隐藏其他" },
              { role: "unhide", label: "显示全部" },
              { type: "separator" },
              { role: "quit", label: "退出" },
            ],
          },
        ]
      : []),
    {
      label: "窗口",
      submenu: [
        {
          label: "对话",
          accelerator: "CmdOrCtrl+1",
          click: () => loadPath("/"),
        },
        {
          label: "设置",
          accelerator: "CmdOrCtrl+2",
          click: () => loadPath("/settings"),
        },
        { type: "separator" },
        { role: "reload", label: "重新加载" },
        { role: "togglefullscreen", label: "全屏" },
        ...(!isPackaged()
          ? [{ role: "toggleDevTools", label: "开发者工具" }]
          : []),
        ...(!isMac ? [{ type: "separator" }, { role: "quit", label: "退出" }] : []),
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function pipeServerLogs(child) {
  const write = (stream, label) => {
    child[stream]?.on("data", (chunk) => {
      const text = String(chunk).trimEnd();
      if (text) console.log(`[${label}] ${text}`);
    });
  };
  write("stdout", "next");
  write("stderr", "next");
}

function startDevServer(nodeExec, port) {
  const nextCli = findNextCli(PROJECT_ROOT);
  return spawn(
    nodeExec,
    [nextCli, "dev", "--hostname", LISTEN_HOST, "--port", String(port)],
    {
      cwd: PROJECT_ROOT,
      env: spawnServerEnv({
        packaged: false,
        dataDir: dataDir(),
        host: LISTEN_HOST,
        port,
      }),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function startPreviewServer(nodeExec, port) {
  const nextCli = findNextCli(PROJECT_ROOT);
  return spawn(
    nodeExec,
    [nextCli, "start", "--hostname", LISTEN_HOST, "--port", String(port)],
    {
      cwd: PROJECT_ROOT,
      env: spawnServerEnv({
        packaged: false,
        dataDir: dataDir(),
        host: LISTEN_HOST,
        port,
        extra: { NODE_ENV: "production" },
      }),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function startPackagedServer(port) {
  const serverJs = findStandaloneServer(process.resourcesPath);
  const standaloneDir = path.dirname(serverJs);
  const nodeExec = resolveNodeExecutable({
    packaged: true,
    electronExecPath: process.execPath,
  });
  return spawn(nodeExec, [serverJs], {
    cwd: standaloneDir,
    env: spawnServerEnv({
      packaged: true,
      dataDir: dataDir(),
      host: LISTEN_HOST,
      port,
    }),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function killServer() {
  if (!serverProcess || serverProcess.killed) return;
  const child = serverProcess;
  serverProcess = null;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"]);
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

async function boot() {
  fs.mkdirSync(dataDir(), { recursive: true, mode: 0o700 });
  serverPort = await pickListenPort(PREFERRED_PORT, LISTEN_HOST);
  const packaged = isPackaged();
  const nodeExec = resolveNodeExecutable({
    packaged,
    electronExecPath: process.execPath,
  });

  if (packaged) {
    serverProcess = startPackagedServer(serverPort);
  } else if (wantProd) {
    serverProcess = startPreviewServer(nodeExec, serverPort);
  } else {
    serverProcess = startDevServer(nodeExec, serverPort);
  }

  serverProcess.on("exit", (code, signal) => {
    if (!quitting && code && code !== 0) {
      console.error(`[cos-harness] 本地服务退出 code=${code} signal=${signal || ""}`);
    }
  });
  pipeServerLogs(serverProcess);

  await waitForHttp(appUrl("/"));
  loadPath("/");
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    buildMenu();
    createWindow();
    try {
      await boot();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[cos-harness] 启动失败", message);
      if (mainWindow) {
        void mainWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(
            `<!doctype html><meta charset="utf-8"><body style="background:#121820;color:#fca5a5;font-family:system-ui;padding:48px"><h1>COS Harness 启动失败</h1><p>${message}</p></body>`,
          )}`,
        );
        mainWindow.show();
      }
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      loadPath("/");
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  quitting = true;
  killServer();
});
