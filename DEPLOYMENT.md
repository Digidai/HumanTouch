# HumanTouch AI内容人性化系统 - 部署指南

## 系统概述

HumanTouch是一个完整的AI内容人性化处理系统，能够将AI生成的文本转换为更自然的人类写作风格，有效降低AI检测概率。系统采用Next.js 15.4.1构建，支持实时处理、批量处理、异步任务队列等功能。

## 核心功能

- **文本人性化处理**：将AI文本转换为自然人类写作风格
- **多检测器集成**：ZeroGPT、GPTZero、Copyleaks
- **实时处理**：单个文本快速处理
- **批量处理**：支持文件上传批量处理
- **异步任务**：任务队列系统，支持webhook通知
- **实时监控**：实时查看任务状态和处理进度
- **API认证**：基于JWT的认证系统
- **限流保护**：防止滥用和DDoS攻击

## 技术架构

### 前端
- **框架**：Next.js 15.4.1
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **状态管理**：React hooks
- **图标**：Lucide React

### 后端
- **运行时**：Vercel Edge Functions
- **API**：RESTful API (v1)
- **认证**：JWT token
- **限流**：基于IP的滑动窗口算法
- **缓存**：内存缓存（5分钟TTL）

### 核心模块
- **AI处理**：Moonshot Kimi API
- **检测验证**：ZeroGPT、GPTZero、Copyleaks
- **任务队列**：异步处理系统
- **文件处理**：文本文件上传和下载

## 部署步骤

### 1. 环境准备

#### 系统要求
- Node.js 18+ 
- npm 或 yarn
- Vercel CLI (推荐)

#### 环境变量
在项目根目录创建 `.env.local` 文件：

```bash
# Moonshot API配置
MOONSHOT_API_KEY=your_moonshot_api_key_here
MOONSHOT_MODEL=kimi-k2-0711-preview

# 系统配置
MAX_TEXT_LENGTH=30000
RATE_LIMIT_REQUESTS_PER_MINUTE=100

# 认证配置
JWT_SECRET=your_jwt_secret_here
```

### 2. 安装依赖

```bash
npm install
# 或
yarn install
```

### 3. 本地测试

```bash
npm run dev
# 或
yarn dev
```

访问 http://localhost:3000 查看应用

### 4. 构建项目

```bash
npm run build
# 或
yarn build
```

### 5. Vercel部署

#### 使用Vercel CLI

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署项目
vercel --prod
```

#### 使用GitHub集成
1. 将代码推送到GitHub仓库
2. 在Vercel控制台导入项目
3. 配置环境变量
4. 部署

### 6. API密钥配置

#### 获取Moonshot API密钥
1. 访问 [Moonshot AI](https://platform.moonshot.cn)
2. 注册账户并创建API密钥
3. 将密钥添加到环境变量 `MOONSHOT_API_KEY`

#### 生成JWT密钥
```bash
# 生成随机JWT密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API文档

### 认证
所有API请求需要包含Authorization头部：
```
Authorization: Bearer your_api_key_here
```

### 核心API端点

#### 1. 处理单个文本
```http
POST /api/v1/process
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "text": "需要处理的文本",
  "options": {
    "rounds": 3,
    "style": "casual",
    "target_score": 0.1,
    "preserve_formatting": true
  }
}
```

#### 2. 批量处理
```http
POST /api/v1/batch
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "texts": ["文本1", "文本2", "文本3"],
  "options": {
    "rounds": 3,
    "style": "professional"
  }
}
```

#### 3. 创建异步任务
```http
POST /api/v1/async
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "text": "需要处理的文本",
  "options": {
    "rounds": 3,
    "style": "academic",
    "notify_url": "https://your-webhook-url.com"
  }
}
```

#### 4. 获取任务状态
```http
GET /api/v1/status/{taskId}
Authorization: Bearer your_api_key
```

#### 5. 验证文本
```http
POST /api/v1/validate
Content-Type: application/json
Authorization: Bearer your_api_key

{
  "text": "需要验证的文本",
  "detectors": ["zerogpt", "gptzero", "copyleaks"]
}
```

## 使用示例

### 前端使用
```typescript
import { useApi, useApiKey } from '@/lib/api-client';

// 设置API密钥
const { saveApiKey } = useApiKey();
saveApiKey('your_api_key_here');

// 使用API
const { processText, loading, error } = useApi();

const handleProcess = async () => {
  try {
    const result = await processText({
      text: 'AI生成的文本...',
      options: {
        rounds: 3,
        style: 'casual',
        target_score: 0.1
      }
    });
    console.log(result);
  } catch (err) {
    console.error(err);
  }
};
```

### 命令行测试
```bash
# 测试单个文本处理
curl -X POST http://localhost:3000/api/v1/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{"text": "This is AI generated content.", "options": {"rounds": 3, "style": "casual"}}'
```

## 监控和维护

### 性能监控
- **响应时间**：正常情况下 < 5秒
- **并发处理**：支持3个并发任务
- **缓存命中率**：监控缓存效果

### 日志查看
```bash
# 查看应用日志
vercel logs
```

### 更新部署
```bash
# 更新代码后重新部署
vercel --prod
```

## 故障排除

### 常见问题

1. **API密钥无效**
   - 检查 `MOONSHOT_API_KEY` 是否正确
   - 确认API密钥有调用权限

2. **请求超时**
   - 调整 `MAX_TEXT_LENGTH` 环境变量
   - 检查网络连接

3. **构建失败**
   - 确保所有依赖已安装
   - 检查TypeScript类型错误

4. **限流错误**
   - 检查 `RATE_LIMIT_REQUESTS_PER_MINUTE` 设置
   - 确认客户端请求频率

### 性能优化

1. **缓存优化**  
   - 增加缓存TTL时间
   - 使用Redis缓存（生产环境）

2. **并发优化**
   - 增加 `maxConcurrent` 参数
   - 使用Redis队列（生产环境）

3. **CDN配置**
   - 配置Vercel Edge Network
   - 启用全球CDN加速

## 扩展开发

### 添加新检测器
1. 修改 `src/lib/detectors.ts`
2. 更新API类型定义
3. 添加前端UI支持

### 自定义处理策略
1. 修改 `src/lib/moonshot.ts` 中的处理指令
2. 调整人性化策略
3. 添加新的写作风格

## 联系支持

如有问题，请通过以下方式获取支持：
- GitHub Issues: [项目仓库](https://github.com/your-username/humantouch)
- 邮箱支持: support@humantouch.ai

## 版本信息

- **当前版本**: v1.0.0
- **最后更新**: 2025-07-18
- **兼容性**: Next.js 15.4.1+