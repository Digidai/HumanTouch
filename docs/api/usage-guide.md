# HumanTouch API 使用指南与最佳实践

## 概述

本指南帮助开发者快速上手HumanTouch API，提供最佳实践和常见问题的解决方案。

## 快速开始

### 1. 获取API密钥

首先注册账户并获取API密钥：

```bash
curl -X POST https://api.humantouch.dev/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your_password",
    "name": "Your Name"
  }'
```

### 2. 选择集成方式

#### 选项A：使用SDK（推荐）

**JavaScript/Node.js**
```javascript
import { HumanTouchClient } from 'humantouch-sdk';

const client = new HumanTouchClient({
  apiKey: 'your_api_key',
  baseURL: 'https://api.humantouch.dev'
});

const result = await client.process(
  "AI生成的文本...",
  { rounds: 3, style: 'casual', target_score: 0.1 }
);
```

**Python**
```python
from humantouch import HumanTouchClient

client = HumanTouchClient(api_key="your_api_key")
result = client.process(
    "AI生成的文本...",
    rounds=3,
    style="casual",
    target_score=0.1
)
```

#### 选项B：直接API调用

```bash
curl -X POST https://api.humantouch.dev/api/v1/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "text": "AI生成的文本...",
    "options": {
      "rounds": 3,
      "style": "casual",
      "target_score": 0.1
    }
  }'
```

## 核心概念

### 1. 处理轮数 (rounds)

- **范围**: 1-5轮
- **默认值**: 3轮
- **作用**: 每轮都会进一步优化文本，降低AI检测分数
- **建议**: 对于长文本或要求极低的检测分数，使用4-5轮

### 2. 写作风格 (style)

| 风格 | 适用场景 | 特征 |
|------|----------|------|
| `casual` | 日常对话、社交媒体 | 轻松、口语化 |
| `academic` | 学术论文、报告 | 正式、逻辑清晰 |
| `professional` | 商务文档、报告 | 专业、简洁 |
| `creative` | 创意写作、故事 | 生动、富有表现力 |

### 3. 目标分数 (target_score)

- **范围**: 0.0-1.0
- **默认值**: 0.1
- **推荐值**: 0.05-0.15（越低越难检测为AI）
- **注意**: 极低分数可能影响文本质量

## 使用场景与最佳实践

### 场景1：实时内容处理

**适用**: 聊天机器人、实时写作助手
**推荐配置**:
- 使用同步API (`/api/v1/process`)
- 轮数：2-3轮
- 目标分数：0.1-0.2
- 超时设置：30秒

```javascript
// 实时处理示例
async function processRealTime(text) {
  const start = Date.now();
  try {
    const result = await client.process(text, {
      rounds: 2,
      style: 'casual',
      target_score: 0.15
    });
    
    console.log(`处理完成 (${Date.now() - start}ms)`);
    console.log('AI检测分数:', result.detection_scores);
    return result.processed_text;
  } catch (error) {
    console.error('处理失败:', error.message);
    return null;
  }
}
```

### 场景2：批量内容处理

**适用**: 内容管理系统、批量文章处理
**推荐配置**:
- 使用批量API (`/api/v1/batch`)
- 每批最多10个文本
- 轮数：3-4轮
- 目标分数：0.05-0.1

```python
# 批量处理示例
def process_batch(texts):
    # 分批处理，每批最多10个
    batch_size = 10
    results = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        result = client.batch(batch, rounds=3, style='academic')
        results.extend(result.results)
    
    return results
```

### 场景3：长时间任务

**适用**: 大文本、复杂处理
**推荐配置**:
- 使用异步API (`/api/v1/async`)
- 轮数：4-5轮
- 目标分数：0.05
- 使用webhook通知

```javascript
// 异步处理示例
async function processLargeText(text) {
  // 创建异步任务
  const task = await client.createAsyncTask(text, {
    rounds: 4,
    style: 'academic',
    target_score: 0.05
  });

  console.log('任务已创建:', task.task_id);

  // 等待任务完成
  const result = await client.waitForTask(task.task_id, {
    interval: 5000, // 每5秒检查一次
    timeout: 600000 // 10分钟超时
  });

  return result.result.processed_text;
}
```

## 错误处理与重试

### 常见错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| `INVALID_PARAMETERS` | 参数错误 | 检查输入参数格式和范围 |
| `INVALID_TEXT_LENGTH` | 文本过长 | 分割文本或联系支持提升限制 |
| `RATE_LIMITED` | 频率限制 | 实现指数退避重试 |
| `TASK_NOT_FOUND` | 任务不存在 | 检查任务ID是否正确 |
| `INTERNAL_ERROR` | 服务器错误 | 稍后重试或联系支持 |

### 重试策略

```python
import time
import random

class RetryHandler:
    def __init__(self, max_retries=3, base_delay=1):
        self.max_retries = max_retries
        self.base_delay = base_delay

    def execute_with_retry(self, func, *args, **kwargs):
        for attempt in range(self.max_retries):
            try:
                return func(*args, **kwargs)
            except RateLimitError as e:
                if attempt == self.max_retries - 1:
                    raise e
                
                # 指数退避 + 随机抖动
                delay = self.base_delay * (2 ** attempt) + random.uniform(0, 1)
                time.sleep(delay)
            except NetworkError as e:
                if attempt == self.max_retries - 1:
                    raise e
                time.sleep(self.base_delay * (attempt + 1))

# 使用示例
retry_handler = RetryHandler(max_retries=3)
result = retry_handler.execute_with_retry(
    client.process, text, options
)
```

## 性能优化

### 1. 缓存策略

对于重复或相似的请求，实现本地缓存：

```python
import hashlib
import time
from functools import lru_cache

class CachedClient(HumanTouchClient):
    def __init__(self, *args, cache_ttl=3600, **kwargs):
        super().__init__(*args, **kwargs)
        self.cache_ttl = cache_ttl
        self.cache = {}

    def _get_cache_key(self, text, options):
        key_data = f"{text}{sorted(options.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def process(self, text, options=None):
        cache_key = self._get_cache_key(text, options or {})
        
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return cached_result

        result = super().process(text, options)
        self.cache[cache_key] = (result, time.time())
        return result
```

### 2. 并发处理

```javascript
// 使用Promise.all处理多个请求
async function processMultipleTexts(texts) {
  const batches = [];
  const batchSize = 10;
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    batches.push(client.batch(batch, { rounds: 3 }));
  }
  
  const results = await Promise.all(batches);
  return results.flatMap(r => r.results);
}
```

### 3. 连接池优化

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class OptimizedClient(HumanTouchClient):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # 配置连接池
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=20, pool_maxsize=20)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
```

## 监控与调试

### 1. 日志记录

```javascript
class LoggingClient extends HumanTouchClient {
  async process(text, options) {
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] Processing text (${text.length} chars)`);
    
    try {
      const result = await super.process(text, options);
      console.log(`[${new Date().toISOString()}] Completed in ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error:`, error.message);
      throw error;
    }
  }
}
```

### 2. 性能监控

```python
import time
import logging

class MonitoredClient(HumanTouchClient):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = logging.getLogger(__name__)

    def process(self, text, options=None):
        start_time = time.time()
        
        try:
            result = super().process(text, options)
            
            self.logger.info(
                f"Processed text: length={len(text)}, "
                f"time={time.time() - start_time:.2f}s, "
                f"score={result.detection_scores.zerogpt:.3f}"
            )
            
            return result
        except Exception as e:
            self.logger.error(f"Processing failed: {str(e)}")
            raise
```

## Webhook集成

### 1. 设置Webhook端点

```javascript
// Express.js 示例
const express = require('express');
const app = express();

app.post('/webhook/humantouch', express.json(), (req, res) => {
  const { task_id, status, result, error } = req.body;
  
  if (status === 'completed') {
    console.log(`Task ${task_id} completed`);
    console.log('Result:', result.processed_text);
    console.log('Scores:', result.detection_scores);
    
    // 处理结果
    saveToDatabase(task_id, result);
  } else if (status === 'failed') {
    console.error(`Task ${task_id} failed:`, error);
  }
  
  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### 2. 验证Webhook签名

```python
import hmac
import hashlib

class WebhookHandler:
    def __init__(self, secret_key):
        self.secret_key = secret_key.encode()

    def verify_signature(self, payload, signature):
        expected_signature = hmac.new(
            self.secret_key,
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)

    def handle_webhook(self, payload, signature):
        if not self.verify_signature(payload, signature):
            raise ValueError("Invalid signature")
        
        data = json.loads(payload)
        # 处理webhook数据
        return data
```

## 常见问题

### Q1: 如何处理超长文本？
**A**: 文本长度限制为10,000字符。对于超长文本：
1. 分割为多个段落
2. 使用批量API处理
3. 考虑使用异步API

### Q2: 为什么检测分数没有达到目标值？
**A**: 可能原因：
1. 文本内容AI特征过于明显
2. 轮数设置过低
3. 目标分数设置过低

**解决方案**：
- 增加处理轮数
- 降低目标分数要求
- 手动调整输出文本

### Q3: 如何处理API限制？
**A**: 
- 实现指数退避重试
- 使用批量处理减少请求次数
- 联系支持提升配额

### Q4: 如何保证处理质量？
**A**: 
- 选择合适的写作风格
- 设置合理的目标分数
- 对结果进行人工审核

## 部署建议

### 1. 环境配置

```bash
# 生产环境变量
export HUMANTOUCH_API_KEY="your_production_key"
export HUMANTOUCH_BASE_URL="https://api.humantouch.dev"
export HUMANTOUCH_TIMEOUT="30"
export HUMANTOUCH_MAX_RETRIES="3"
```

### 2. 监控设置

```yaml
# Prometheus 指标
- name: humantouch_requests_total
  help: Total number of API requests
  type: counter
  
- name: humantouch_request_duration_seconds
  help: Request duration in seconds
  type: histogram
  
- name: humantouch_response_score
  help: AI detection score
  type: gauge
```

### 3. 健康检查

```javascript
async function healthCheck() {
  try {
    const result = await client.validate("健康检查测试");
    return result.success;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}
```

## 支持联系

- **文档**: https://docs.humantouch.dev
- **支持邮箱**: support@humantouch.dev
- **Discord**: https://discord.gg/humantouch
- **GitHub**: https://github.com/humantouch/docs