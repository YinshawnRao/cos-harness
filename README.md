# COS Harness

自托管、单用户的腾讯云 **COS（对象存储）** 与 **数据万象 Cloud Infinite（CI）** 智能控制台。你自备大模型 API Key 和腾讯云密钥，在浏览器里和助手对话，由服务端工具执行一小套高质量 COS/CI 操作。

这是 Phase 1 个人工具，不是多租户 SaaS：没有账号系统，密钥只存在你自己的机器上。

## 功能（Phase 1）

- 对话 + 设置，两页。
- BYOK：任意 OpenAI 兼容 `base URL` + `API Key` + 模型名（DeepSeek / Moonshot / OpenAI / 本地代理）。
- 腾讯云：SecretId、SecretKey、地域、默认桶（`BucketName-APPID`）。
- 流式回复；工具调用在界面可见（名称、参数摘要、结果摘要）。
- 删除对象、覆盖原图、覆盖已有目标键：必须在 UI 里点「确认执行」。
- COS：列桶、按前缀列对象、浏览器上传、从 URL 拉取上传、限时签名 URL、删除、复制/重命名、创建目录前缀。
- CI 同步图片处理：`imageInfo`、缩放/裁剪/转码/质量、文字水印。默认写到**新对象键**，不覆盖原图。

## 不在本阶段

异步媒体任务（转码、智能封面队列）、工作流、内容审核、MetaInsight、生命周期 / CORS / ACL 管理、CAM 策略编辑器、多用户、消费限额。

## 本地运行

需要 Node.js 22+。

```bash
pnpm install   # 或 npm install
pnpm dev       # http://127.0.0.1:47821
```

生产：

```bash
pnpm build
pnpm start
```

打开浏览器后先去 **设置**：

1. 填写 LLM Base URL（需包含 `/v1`，例如 `https://api.deepseek.com/v1`）、API Key、模型名，点「测试 LLM 连接」。
2. 填写腾讯云 SecretId / SecretKey、地域（如 `ap-guangzhou`）、默认存储桶 `examplebucket-1250000000`，点「测试 COS 连接」。
3. 回到「对话」。可以用回形针按钮把文件上传到默认桶，或让助手列对象、签名预览、处理图片。

密钥保存后**不会再回传到浏览器**（只显示掩码）。配置加密写在 `data/settings.enc`。

## Docker

```bash
docker compose up --build
```

数据卷挂载在容器 `/data`。建议在宿主机设置 64 位十六进制主密钥：

```bash
export SETTINGS_ENCRYPTION_KEY="$(openssl rand -hex 32)"
docker compose up --build
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `SETTINGS_ENCRYPTION_KEY` | 可选。AES-256 主密钥，64 位 hex。不设则首次启动写入 `data/.master.key`（权限 0600）。 |
| `DATA_DIR` | 可选。加密配置目录，默认 `./data`。Docker 中为 `/data`。 |
| `PORT` / `HOSTNAME` | 生产监听，默认 `47821` / `0.0.0.0`。 |

不要把 SecretKey 或 LLM Key 写进环境变量以外的日志、截图或 git。本仓库 `.gitignore` 已忽略 `data/` 与 `.env*`。

## 安全说明

- 单用户、本机信任模型：任何能访问该端口的人都能用你保存的密钥操作 COS。不要暴露到公网。
- 模型**看不到**原始 SecretKey / API Key。工具在服务端使用已认证的 COS 客户端。
- 删除 / 覆盖走 Vercel AI SDK 的 `toolApproval`：未在界面确认前不会调用 COS 删除或覆盖。
- 日志会脱敏 `SecretKey`、`apiKey`、`sessionToken` 等字段。
- COS 调用优先用 [STS 临时密钥](https://cloud.tencent.com/document/product/436/14048)（`qcloud-cos-sts`）。若 CAM 未授权 `GetFederationToken` 或策略过严，会**自动回退为服务端长期密钥**，仍不会下发到浏览器。设置页的 COS 测试会写明当前模式。

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
pnpm test    # 工具策略、脱敏、CI 规则、COS 封装（SDK mock）
pnpm lint
```

核心封装：`src/lib/cos/operations.ts`（可注入 mock SDK）。策略：`src/lib/agent/policy.ts`。

## License

自用工具。使用 COS / 数据万象 / 大模型接口时请遵守各厂商条款与计费说明。
