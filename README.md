# HumanTouch - AI 内容人性化处理系统

将 AI 生成的文本转换为更自然的人类写作风格，有效降低 AI 检测概率。

## 功能特性

- **文本人性化处理** - 多轮迭代优化，逐步降低 AI 检测分数
- **多检测器验证** - 支持 ZeroGPT、GPTZero、Copyleaks 三大检测平台
- **批量处理** - 单次最多处理 10 个文本
- **异步任务** - 支持 Webhook 回调通知
- **任务监控** - 实时查看处理进度和历史记录

## 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript + Tailwind CSS 4
- **后端**: Next.js API Routes / Cloudflare Workers
- **AI 模型**: Moonshot (Kimi)
- **部署**: Vercel / Cloudflare Workers

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填写必要的 API 密钥：

```env
# 必需 - Moonshot API
MOONSHOT_API_KEY=sk-your-moonshot-key

# 必需 - 认证配置
JWT_SECRET=your-jwt-secret-key-min-32-chars
ALLOWED_API_KEYS=hk_your_api_key_1,hk_your_api_key_2

# 可选 - AI 检测器 API（不配置则使用模拟分数）
ZEROGPT_API_KEY=your-zerogpt-key
GPTZERO_API_KEY=your-gptzero-key
COPYLEAKS_API_KEY=your-copyleaks-key
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 部署指南

### 方案一：Vercel 部署（推荐）

Vercel 是 Next.js 官方推荐的部署平台，支持完整功能。

#### 优势
- 零配置部署
- 自动 HTTPS
- 全球 CDN
- Serverless Functions

#### 限制（免费版）
- 函数执行时间：10 秒
- 每月调用次数：100,000 次
- 带宽：100 GB/月

#### 部署步骤

1. **推送代码到 GitHub**

2. **在 Vercel 导入项目**
   - 访问 [vercel.com/new](https://vercel.com/new)
   - 选择你的 GitHub 仓库
   - 点击 Import

3. **配置环境变量**

   在 Vercel 项目设置 → Environment Variables 中添加：

   | 变量名 | 必需 | 说明 |
   |--------|------|------|
   | `MOONSHOT_API_KEY` | ✅ | Moonshot API 密钥 |
   | `JWT_SECRET` | ✅ | JWT 签名密钥（至少 32 字符） |
   | `ALLOWED_API_KEYS` | ✅ | 允许的 API 密钥（逗号分隔） |
   | `ZEROGPT_API_KEY` | ❌ | ZeroGPT 检测 API |
   | `GPTZERO_API_KEY` | ❌ | GPTZero 检测 API |
   | `COPYLEAKS_API_KEY` | ❌ | Copyleaks 检测 API |
   | `DETECTOR_MODE` | ❌ | `mock`（默认）或 `strict` |
   | `MAX_TEXT_LENGTH` | ❌ | 最大文本长度（默认 10000） |
   | `RATE_LIMIT_REQUESTS_PER_MINUTE` | ❌ | 每分钟请求限制（默认 100） |

4. **部署**
   ```bash
   npm run deploy
   ```

   或在 Vercel 控制台点击 Deploy

---

### 方案二：Cloudflare Workers 部署

适合需要更高免费额度和更低延迟的场景。

#### 优势
- 免费额度更大（10 万次/天 vs 10 万次/月）
- 无限带宽
- 全球边缘部署，冷启动极快
- 函数执行时间更长（30 秒 CPU 时间）

#### 限制
- 仅支持 API 接口，不包含前端界面
- 不支持异步任务队列（建议使用同步接口）

#### 部署步骤

1. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```

2. **配置 Secrets**
   ```bash
   # 必需
   npm run cf:secret MOONSHOT_API_KEY
   # 输入你的 Moonshot API Key

   # 生产环境必需
   npm run cf:secret JWT_SECRET
   npm run cf:secret ALLOWED_API_KEYS

   # 可选 - 检测器 API
   npm run cf:secret ZEROGPT_API_KEY
   npm run cf:secret GPTZERO_API_KEY
   npm run cf:secret COPYLEAKS_API_KEY
   ```

3. **本地测试**
   ```bash
   # 创建本地环境变量
   cp .dev.vars.example .dev.vars
   # 编辑 .dev.vars 填写 API 密钥

   # 启动本地 Workers 开发服务器
   npm run dev:cf
   ```

4. **部署到 Cloudflare**
   ```bash
   npm run deploy:cf
   ```

   部署成功后会显示 Workers URL：
   ```
   https://humantouch-api.<your-subdomain>.workers.dev
   ```

#### Workers API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 健康检查 |
| `/health` | GET | 健康检查 |
| `/api/v1/process` | POST | 文本人性化处理 |
| `/api/v1/validate` | POST | AI 检测验证 |

---

### 方案三：混合部署（推荐高流量场景）

前端部署在 Vercel，API 部署在 Cloudflare Workers。

1. **部署 Workers API**（参考方案二）

2. **配置 Vercel 前端**

   在 Vercel 环境变量中添加：
   ```env
   NEXT_PUBLIC_API_URL=https://humantouch-api.xxx.workers.dev/api/v1
   ```

3. **部署 Vercel 前端**
   ```bash
   npm run deploy
   ```

---

## API 文档

### 认证

所有 API 请求需要在 Header 中携带 API Key：

```
Authorization: Bearer hk_your_api_key
```

### 接口列表

#### POST /api/v1/process

同步处理文本，实时返回结果。

**请求体：**
```json
{
  "text": "需要处理的文本内容",
  "options": {
    "rounds": 3,
    "style": "casual",
    "target_score": 0.1
  }
}
```

**参数说明：**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `text` | string | ✅ | 待处理文本（最大 10000 字符） |
| `options.rounds` | number | ❌ | 处理轮数（1-5，默认 3） |
| `options.style` | string | ❌ | 写作风格：`casual`/`academic`/`professional`/`creative` |
| `options.target_score` | number | ❌ | 目标检测分数（0-1，默认 0.1） |

**响应示例：**
```json
{
  "success": true,
  "data": {
    "processed_text": "处理后的文本...",
    "original_length": 500,
    "processed_length": 520,
    "detection_scores": {
      "zerogpt": 0.12,
      "gptzero": 0.08,
      "copyleaks": 0.15
    },
    "processing_time": 5.23,
    "rounds_used": 3
  },
  "meta": {
    "request_id": "abc123",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "api_version": "v1"
  }
}
```

#### POST /api/v1/validate

仅检测文本的 AI 生成概率，不做处理。

**请求体：**
```json
{
  "text": "需要检测的文本",
  "detectors": ["zerogpt", "gptzero", "copyleaks"]
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "detection_scores": {
      "zerogpt": 0.85,
      "gptzero": 0.78,
      "copyleaks": 0.82
    },
    "summary": {
      "overall_score": 0.82,
      "human_likelihood": 0.18
    }
  }
}
```

#### POST /api/v1/batch

批量处理多个文本。

**请求体：**
```json
{
  "texts": ["文本1", "文本2", "文本3"],
  "options": {
    "rounds": 2,
    "style": "academic"
  }
}
```

**限制：** 单次最多 10 个文本

#### POST /api/v1/async

创建异步处理任务（适合长文本）。

**请求体：**
```json
{
  "text": "长文本内容...",
  "options": {
    "rounds": 3,
    "style": "casual",
    "notify_url": "https://your-webhook.com/callback"
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "task_id": "task_xxx",
    "status": "pending",
    "estimated_time": 30
  }
}
```

#### GET /api/v1/status/{taskId}

查询异步任务状态。

#### GET /api/v1/tasks

获取任务列表。

**查询参数：**
- `status`: 过滤状态（pending/processing/completed/failed）
- `limit`: 每页数量（默认 50）
- `offset`: 偏移量

---

## 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `MOONSHOT_API_KEY` | ✅ | - | Moonshot API 密钥 |
| `MOONSHOT_MODEL` | ❌ | `kimi-k2-0711-preview` | Moonshot 模型 |
| `JWT_SECRET` | 生产必需 | - | JWT 签名密钥 |
| `ALLOWED_API_KEYS` | 生产必需 | - | 允许的 API 密钥列表 |
| `API_KEY_PREFIX` | ❌ | `hk_` | API 密钥前缀 |
| `MAX_TEXT_LENGTH` | ❌ | `10000` | 最大文本长度 |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | ❌ | `100` | 每分钟请求限制 |
| `DETECTOR_MODE` | ❌ | `mock` | 检测模式：`mock`/`strict` |
| `ZEROGPT_API_KEY` | ❌ | - | ZeroGPT API 密钥 |
| `GPTZERO_API_KEY` | ❌ | - | GPTZero API 密钥 |
| `COPYLEAKS_API_KEY` | ❌ | - | Copyleaks API 密钥 |
| `WEBHOOK_SECRET` | ❌ | - | Webhook 签名密钥 |

---

## 项目结构

```
HumanTouch/
├── src/
│   ├── app/
│   │   ├── api/v1/          # API 路由
│   │   │   ├── process/     # 同步处理
│   │   │   ├── validate/    # AI 检测
│   │   │   ├── batch/       # 批量处理
│   │   │   ├── async/       # 异步任务
│   │   │   ├── status/      # 任务状态
│   │   │   └── tasks/       # 任务列表
│   │   ├── page.tsx         # 首页
│   │   └── layout.tsx       # 布局
│   ├── components/          # React 组件
│   │   ├── Dashboard.tsx    # 主控制台
│   │   ├── TextProcessor.tsx
│   │   ├── BatchProcessor.tsx
│   │   ├── TaskMonitor.tsx
│   │   └── ui/              # UI 组件库
│   ├── lib/                 # 核心库
│   │   ├── auth.ts          # 认证管理
│   │   ├── moonshot.ts      # Moonshot 客户端
│   │   ├── detectors.ts     # AI 检测器
│   │   ├── taskqueue.ts     # 任务队列
│   │   └── api-client.ts    # 前端 API 客户端
│   ├── middleware/          # 中间件
│   │   └── ratelimit.ts     # 速率限制
│   └── types/               # TypeScript 类型
│       └── api.ts
├── workers/                 # Cloudflare Workers
│   ├── index.ts             # Workers 入口
│   ├── tsconfig.json
│   └── lib/                 # Workers 专用库
│       ├── auth.ts
│       ├── moonshot.ts
│       └── detectors.ts
├── wrangler.toml            # Cloudflare 配置
├── next.config.ts           # Next.js 配置
├── package.json
└── README.md
```

---

## 开发命令

```bash
# 安装依赖
npm install

# 启动 Next.js 开发服务器
npm run dev

# 启动 Cloudflare Workers 开发服务器
npm run dev:cf

# 构建生产版本
npm run build

# 部署到 Vercel
npm run deploy

# 部署到 Cloudflare Workers
npm run deploy:cf

# 配置 Cloudflare Secrets
npm run cf:secret <SECRET_NAME>

# 代码检查
npm run lint

# 运行测试
npm test
```

---

## 常见问题

### Q: 检测分数不准确？

A: 默认使用 `DETECTOR_MODE=mock`（模拟模式），会返回随机分数。生产环境请：
1. 配置真实的检测器 API 密钥
2. 设置 `DETECTOR_MODE=strict`

### Q: Vercel 部署超时？

A: Vercel 免费版函数执行时间限制 10 秒。解决方案：
1. 减少处理轮数（`rounds: 2`）
2. 使用异步任务接口
3. 升级 Vercel Pro 或使用 Cloudflare Workers

### Q: API Key 如何获取？

A: 在 `.env.local` 或部署平台配置 `ALLOWED_API_KEYS` 环境变量，格式为：
```
ALLOWED_API_KEYS=hk_key1,hk_key2,hk_key3
```
所有以 `hk_` 开头且在白名单中的 Key 都可使用。

### Q: 如何获取 Moonshot API Key？

A: 访问 [Moonshot 开放平台](https://platform.moonshot.cn/) 注册并创建 API Key。

---

## License

MIT
