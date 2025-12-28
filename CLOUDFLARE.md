# Cloudflare Workers 部署指南

HumanTouch API 支持部署到 Cloudflare Workers，享受更高的免费额度和更快的边缘响应。

## 优势对比

| 特性 | Vercel (Hobby) | Cloudflare Workers (Free) |
|------|----------------|---------------------------|
| 函数执行时间 | 10秒 | 30秒（CPU时间） |
| 函数调用 | 10万/月 | **10万/天** |
| 带宽 | 100GB/月 | **无限** |
| 冷启动 | 较慢 | 极快 |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 配置 Secrets

```bash
# 必需
npm run cf:secret MOONSHOT_API_KEY

# 生产环境必需
npm run cf:secret JWT_SECRET
npm run cf:secret ALLOWED_API_KEYS

# 可选（检测器 API）
npm run cf:secret ZEROGPT_API_KEY
npm run cf:secret GPTZERO_API_KEY
npm run cf:secret COPYLEAKS_API_KEY
```

### 4. 本地开发

```bash
# 复制环境变量模板
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars 填写实际值

# 启动本地开发服务器
npm run dev:cf
```

### 5. 部署

```bash
npm run deploy:cf
```

部署成功后会显示 Workers URL，如：`https://humantouch-api.<your-subdomain>.workers.dev`

## API 端点

Workers 版本支持以下端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 健康检查 |
| `/health` | GET | 健康检查 |
| `/api/v1/process` | POST | 文本人性化处理 |
| `/api/v1/validate` | POST | AI 检测验证 |

## 请求示例

```bash
# 健康检查
curl https://humantouch-api.xxx.workers.dev/

# 文本处理
curl -X POST https://humantouch-api.xxx.workers.dev/api/v1/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hk_your_api_key" \
  -d '{"text": "这是一段AI生成的文本..."}'

# AI 检测
curl -X POST https://humantouch-api.xxx.workers.dev/api/v1/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hk_your_api_key" \
  -d '{"text": "这是一段需要检测的文本..."}'
```

## 环境变量说明

| 变量 | 必需 | 说明 |
|------|------|------|
| `MOONSHOT_API_KEY` | ✅ | Moonshot API 密钥 |
| `JWT_SECRET` | 生产 | JWT 签名密钥 |
| `ALLOWED_API_KEYS` | 生产 | 允许的 API 密钥列表（逗号分隔） |
| `API_KEY_PREFIX` | ❌ | API 密钥前缀（默认 `hk_`） |
| `MAX_TEXT_LENGTH` | ❌ | 最大文本长度（默认 10000） |
| `DETECTOR_MODE` | ❌ | 检测模式：`mock`（默认）或 `strict` |
| `ZEROGPT_API_KEY` | ❌ | ZeroGPT API 密钥 |
| `GPTZERO_API_KEY` | ❌ | GPTZero API 密钥 |
| `COPYLEAKS_API_KEY` | ❌ | Copyleaks API 密钥 |

## 注意事项

1. **Workers 版本是独立的 API 服务**，不包含前端界面
2. 前端仍需部署在 Vercel 或其他平台，通过 `NEXT_PUBLIC_API_URL` 指向 Workers 地址
3. Workers 版本不支持异步任务队列（`/api/v1/async`），建议使用同步 `/api/v1/process` 接口
4. 如需完整功能，建议继续使用 Vercel 部署

## 架构选择

**方案 A：全 Vercel**（推荐简单场景）
- 前端 + API 都在 Vercel
- 统一部署，简单方便

**方案 B：混合部署**（推荐高流量场景）
- 前端部署在 Vercel
- API 部署在 Cloudflare Workers
- 更高的免费额度，更低的延迟
