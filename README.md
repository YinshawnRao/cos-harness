# COS Harness

自托管、单用户的腾讯云 **COS（对象存储）** 与 **数据万象 Cloud Infinite（CI）** 桌面工作室。左侧资源库浏览桶与对象（图片尽量走 CI 缩略图），中间工作台做预览和一键处理，右侧助手当 copilot。你自备大模型 API Key 和腾讯云密钥；密钥只存在本机用户数据目录。

这是 Phase 1 个人工具，不是网页、也不是多租户 SaaS：没有账号系统，密钥只存在你自己电脑的用户数据目录里。

## 功能（Phase 1）

- 原生窗口：自定义标题栏；三区工作台——**资源**（桶/前缀/对象与缩略图）、**工作台**（目录画廊或图片处理台）、**助手**（可开关的 copilot）。
- 图片台：缩略图、转 webp、水印、图片信息、签名链接；处理默认写新键，并展示原图 → 结果。
- 上传：拖到资源库或工作台即可，不必只靠聊天框。
- BYOK：任意 OpenAI 兼容 `base URL` + `API Key` + 模型名（DeepSeek / Moonshot / OpenAI / 本地代理）。
- 腾讯云：SecretId、SecretKey、地域、默认桶（`BucketName-APPID`）。
- 流式回复；工具调用在界面可见（名称、参数摘要、结果摘要）。
- 删除对象、覆盖原图、覆盖已有目标键：必须在 UI 里点「确认执行」。
- COS：列桶、按前缀列对象、应用内上传、从 URL 拉取上传、限时签名 URL、删除、复制/重命名、创建目录前缀。
- CI 同步图片处理：`imageInfo`、缩放/裁剪/转码/质量、文字水印。默认写到**新对象键**，不覆盖原图。

## 不在本阶段

异步媒体任务（转码、智能封面队列）、工作流、内容审核、MetaInsight、生命周期 / CORS / ACL 管理、CAM 策略编辑器、多用户、消费限额。

## 运行桌面应用

需要 Node.js 22+ 与 [pnpm](https://pnpm.io/)。

```bash
pnpm install
pnpm desktop
```

会打开 **COS Harness** 窗口（不是让你去 Chrome 里打开一个网址）。首次进入先到 **设置** 接入密钥，然后在工作台浏览桶、拖拽上传、处理图片；助手在右侧，删除仍需确认。

密钥保存后**不会再回传到界面**（只显示掩码）。本地 HTTP 只监听 `127.0.0.1`，不对外网开放。

开发时窗口标题为 `COS Harness`，默认大小约 1480×920，任务栏 / Dock 使用应用图标。

## 密钥存放位置

桌面应用把加密配置写在操作系统的用户数据目录下，而不是项目旁边的 `./data`：

| 系统 | 目录 |
| --- | --- |
| Linux | `~/.config/COS Harness/data/` |
| macOS | `~/Library/Application Support/COS Harness/data/` |
| Windows | `%APPDATA%\\COS Harness\\data\\` |

其中：

- `settings.enc`：加密后的 LLM / 腾讯云配置
- `.master.key`：首次启动生成的 AES-256 主密钥（权限 0600），可用环境变量 `SETTINGS_ENCRYPTION_KEY` 覆盖

设置页会显示当前实际路径。不要把 SecretKey、LLM Key 或 `.master.key` 提交到 git。

## 打包安装包

先构建 Next.js standalone，再交给 electron-builder。本机 Linux 可直接打 AppImage；macOS / Windows 安装包脚本已提供，但需要在对应系统上运行（Linux CI 无法完成 Apple 签名 / 也不保证能交叉打出所有 Windows 安装器）。

```bash
pnpm desktop:pack:linux   # AppImage + linux-unpacked 目录
pnpm desktop:pack:mac     # dmg + zip（建议在 macOS 上执行）
pnpm desktop:pack:win     # NSIS + portable（建议在 Windows 上执行）
pnpm desktop:pack         # 当前操作系统的默认目标
```

产物在 `dist-desktop/`。Linux 可运行：

```bash
./dist-desktop/linux-unpacked/cos-harness
# 或
./dist-desktop/cos-harness-0.1.0-linux-*.AppImage
```

GitHub Actions（`.github/workflows/desktop.yml`）会在 Linux 上跑测试并构建 AppImage。

预览打包后的生产服务（仍用 Electron 窗口，不经过安装包）：

```bash
pnpm desktop:preview
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `SETTINGS_ENCRYPTION_KEY` | 可选。AES-256 主密钥，64 位 hex。不设则首次启动写入用户数据目录的 `.master.key`。 |
| `DATA_DIR` | 可选。覆盖加密配置目录。桌面应用默认已设为用户数据目录下的 `data/`。 |
| `COS_HARNESS_NO_SANDBOX` | 可选。设为 `1` 时给 Electron 加 `--no-sandbox`（部分 Linux / CI 环境需要）。 |
| `PORT` / `HOSTNAME` | 仅内部 Next 服务使用。桌面应用会强制 `HOSTNAME=127.0.0.1`。 |
| `COS_HARNESS_BIND_ALL` | 仅 Docker / 明确要对外绑定的服务端部署：允许 `0.0.0.0`。桌面应用不会设置此项。 |

不要把 SecretKey 或 LLM Key 写进环境变量以外的日志、截图或 git。本仓库 `.gitignore` 已忽略 `data/`、`dist-desktop/` 与 `.env*`。

## 安全说明

- 单用户、本机信任模型：内部服务只绑 `127.0.0.1`。不要把端口转发到公网。
- 模型**看不到**原始 SecretKey / API Key。工具在本机 Node 进程里使用已认证的 COS 客户端。
- 删除 / 覆盖走 Vercel AI SDK 的 `toolApproval`：未在界面确认前不会调用 COS 删除或覆盖。
- 日志会脱敏 `SecretKey`、`apiKey`、`sessionToken` 等字段。
- COS 调用优先用 [STS 临时密钥](https://cloud.tencent.com/document/product/436/14048)（`qcloud-cos-sts`）。若 CAM 未授权 `GetFederationToken` 或策略过严，会**自动回退为服务端长期密钥**，仍不会下发到界面。设置页的 COS 测试会写明当前模式。

### STS 后续（Phase 1 已接最小闭环）

当前 STS 策略覆盖本工具用到的对象读写与列举。若测试页提示 STS 失败，请给子账号开通：

- `sts:GetFederationToken`
- 对应桶的 `cos:GetService` / `GetBucket` / `GetObject` / `PutObject` / `DeleteObject` 等

更细的按前缀、按操作拆分策略可以后续再收紧。CI 同步处理走 `POST ?image_process` + `Pic-Operations`，需要桶已绑定数据万象。

## CI 图片处理

实现依据官方文档，而不是自造参数名：

- 缩放 / 裁剪 / 格式 / 质量：[`imageMogr2`](https://cloud.tencent.com/document/product/460/36540)
- 文字水印：[`watermark/2`](https://cloud.tencent.com/document/product/460/6951)
- 云上处理：`cos.request({ Method: 'POST', Action: 'image_process', Headers: { 'Pic-Operations': ... } })`
- 图片信息：`Action: 'imageInfo'`

若报错提示未绑定数据万象，到 [COS 控制台](https://console.cloud.tencent.com/cos/bucket) 为该桶开通 CI。处理默认写新键；`writeMode=preview_only` 只返回带处理参数的签名 URL；`overwrite` 必须确认。

工具设计参考了 [Tencent/cos-mcp](https://github.com/Tencent/cos-mcp)，但本项目是带聊天 UI 的独立 harness，不是 MCP 服务。

## 开发

```bash
pnpm test    # 工具策略、脱敏、CI 规则、COS 封装、localhost / userData 路径
pnpm lint
pnpm desktop # 日常开发：一个命令打开桌面窗口（内嵌 Next.js）
```

核心封装：`src/lib/cos/operations.ts`（可注入 mock SDK）。策略：`src/lib/agent/policy.ts`。桌面壳：`electron/main.cjs`。

`pnpm dev` / `pnpm start` 仍可在本机起无窗口的 Next 服务（只监听 127.0.0.1），只作内部调试，不是产品用法。无 Electron 时配置会落到进程 cwd 下的 `data/`，与桌面应用的用户数据目录不是同一处。

## Docker（可选，服务端部署）

若你确实要在容器里跑这份 Next 服务（不是桌面应用）：

```bash
export SETTINGS_ENCRYPTION_KEY="$(openssl rand -hex 32)"
docker compose up --build
```

数据卷挂载在容器 `/data`。容器内需要绑定 `0.0.0.0` 才能从宿主机映射端口；这与桌面应用的 loopback 策略不同。

## License

自用工具。使用 COS / 数据万象 / 大模型接口时请遵守各厂商条款与计费说明。
