# cURL 使用示例

本指南提供了使用cURL命令行工具调用HumanTouch API的详细示例。

## 认证

### 获取API密钥
```bash
# 用户注册
curl -X POST https://api.humantouch.dev/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password_123",
    "name": "张三"
  }'

# 用户登录
curl -X POST https://api.humantouch.dev/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password_123"
  }'
```

## 同步处理

### 基本文本处理
```bash
# 基础处理
curl -X POST https://api.humantouch.dev/api/v1/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "text": "人工智能生成的文本通常具有高度的逻辑性和一致性，缺乏人类写作中的随机性和个性化特征。这种文本往往过于规整，句式过于完美，缺乏真实人类写作中的不规则性和思维跳跃。",
    "options": {
      "rounds": 3,
      "style": "casual",
      "target_score": 0.1
    }
  }'

# 学术风格处理
curl -X POST https://api.humantouch.dev/api/v1/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "text": "本研究通过系统性分析发现，当前人工智能技术在处理复杂语义理解方面仍存在显著局限性。",
    "options": {
      "rounds": 4,
      "style": "academic",
      "target_score": 0.05
    }
  }'
```

### 批量处理
```bash
# 批量处理多个文本
curl -X POST https://api.humantouch.dev/api/v1/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "texts": [
      "AI生成的文本往往缺乏人类写作的自然特征。",
      "机器学习模型在语言生成方面表现出色，但仍有明显的AI痕迹。",
      "人工智能在内容创作领域面临的主要挑战是如何模拟人类思维的复杂性。"
    ],
    "options": {
      "rounds": 2,
      "style": "professional"
    }
  }'
```

## 异步处理

### 创建异步任务
```bash
# 创建异步处理任务
curl -X POST https://api.humantouch.dev/api/v1/async \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "text": "这是一个需要异步处理的较长文本，我们将使用多轮处理来确保最终结果的AI检测分数低于目标值。",
    "options": {
      "rounds": 3,
      "style": "creative",
      "notify_url": "https://your-webhook.com/callback"
    }
  }'
```

### 查询任务状态
```bash
# 获取任务状态
curl -X GET https://api.humantouch.dev/api/v1/status/TASK_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 获取任务列表
```bash
# 获取所有任务
curl -X GET https://api.humantouch.dev/api/v1/tasks \
  -H "Authorization: Bearer YOUR_API_KEY"

# 获取特定状态的任务
curl -X GET "https://api.humantouch.dev/api/v1/tasks?status=completed&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## AI检测验证

### 验证文本
```bash
# 使用所有检测工具
curl -X POST https://api.humantouch.dev/api/v1/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "text": "这是一个需要检测的文本样本，用于测试AI检测工具的效果。"
  }'

# 使用特定检测工具
curl -X POST https://api.humantouch.dev/api/v1/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "text": "机器学习算法在自然语言处理领域取得了显著进展。",
    "detectors": ["zerogpt", "gptzero"]
  }'
```

## 高级用法

### 带重试的请求
```bash
#!/bin/bash

MAX_RETRIES=3
RETRY_DELAY=2

make_request() {
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        response=$(curl -s -w "%{http_code}" -X POST https://api.humantouch.dev/api/v1/process \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer YOUR_API_KEY" \
            -d '{
                "text": "测试文本",
                "options": {"rounds": 2, "style": "casual"}
            }')
        
        http_code=${response: -3}
        response_body=${response%???}
        
        if [ "$http_code" = "200" ]; then
            echo "$response_body"
            return 0
        elif [ "$http_code" = "429" ]; then
            echo "Rate limit hit, retrying..."
            sleep $((RETRY_DELAY * (retries + 1)))
            retries=$((retries + 1))
        else
            echo "Error: $http_code - $response_body"
            return 1
        fi
    done
    
    echo "Max retries exceeded"
    return 1
}

make_request
```

### 文件处理
```bash
#!/bin/bash

# 从文件读取文本并处理
process_file() {
    local input_file="$1"
    local output_file="$2"
    
    # 读取文件内容
    text=$(cat "$input_file")
    
    # 转义JSON特殊字符
    escaped_text=$(echo "$text" | jq -Rs .)
    
    # 发送请求
    response=$(curl -s -X POST https://api.humantouch.dev/api/v1/process \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer YOUR_API_KEY" \
        -d "{
            \"text\": $escaped_text,
            \"options\": {
                \"rounds\": 3,
                \"style\": \"academic\",
                \"target_score\": 0.05
            }
        }")
    
    # 提取处理后的文本
    processed_text=$(echo "$response" | jq -r '.data.processed_text')
    
    # 保存到文件
    echo "$processed_text" > "$output_file"
    echo "处理完成，结果已保存到: $output_file"
}

# 使用示例
process_file "input.txt" "output.txt"
```

### 实时监控脚本
```bash
#!/bin/bash

# 监控异步任务状态
monitor_task() {
    local task_id="$1"
    local check_interval=2
    
    echo "开始监控任务: $task_id"
    
    while true; do
        response=$(curl -s -X GET "https://api.humantouch.dev/api/v1/status/$task_id" \
            -H "Authorization: Bearer YOUR_API_KEY")
        
        status=$(echo "$response" | jq -r '.data.status')
        echo "$(date): 任务状态 - $status"
        
        case $status in
            "completed")
                echo "任务完成！"
                echo "$response" | jq '.data.result'
                break
                ;;
            "failed")
                echo "任务失败！"
                echo "$response" | jq '.data.error'
                break
                ;;
            *)
                sleep $check_interval
                ;;
        esac
    done
}

# 使用示例
# monitor_task "your_task_id"
```

## 环境变量配置

### 设置API密钥
```bash
# 临时设置
export HUMANTOUCH_API_KEY="your_api_key_here"

# 在脚本中使用
curl -X POST https://api.humantouch.dev/api/v1/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HUMANTOUCH_API_KEY" \
  -d '...'

# 创建配置文件
cat > ~/.humantouchrc << EOF
export HUMANTOUCH_API_KEY="your_api_key_here"
export HUMANTOUCH_BASE_URL="https://api.humantouch.dev"
EOF

# 加载配置
source ~/.humantouchrc
```

## 错误处理

### 检查HTTP状态码
```bash
# 检查响应状态
response=$(curl -s -w "\n%{http_code}" -X POST https://api.humantouch.dev/api/v1/process \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -d '...')

body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)

echo "HTTP状态码: $status"
echo "响应内容: $body"

if [ "$status" != "200" ]; then
    echo "请求失败"
    exit 1
fi
```

### 日志记录
```bash
#!/bin/bash

# 创建日志文件
LOG_FILE="humantouch_api.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 带日志的请求
make_logged_request() {
    local endpoint="$1"
    local data="$2"
    
    log "发送请求到: $endpoint"
    
    response=$(curl -s -X POST "https://api.humantouch.dev$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer YOUR_API_KEY" \
        -d "$data")
    
    log "响应: $response"
    echo "$response"
}
```

## 性能优化

### 并发请求
```bash
#!/bin/bash

# 使用GNU parallel进行并发处理
process_files_concurrent() {
    local input_dir="$1"
    local output_dir="$2"
    
    mkdir -p "$output_dir"
    
    # 创建处理函数
    process_file() {
        local file="$1"
        local output_file="$2"
        
        curl -s -X POST https://api.humantouch.dev/api/v1/process \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer YOUR_API_KEY" \
            -d "{\"text\": \"$(cat "$file")\", \"options\": {\"rounds\": 2, \"style\": \"casual\"}}" \
            | jq -r '.data.processed_text' > "$output_file"
    }
    
    export -f process_file
    
    # 并行处理文件
    find "$input_dir" -name "*.txt" | parallel \
        "process_file {} $output_dir/{/.}_processed.txt"
}
```