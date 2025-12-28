<div align="center">

<img src="public/images/banner.svg" alt="HumanTouch Banner" width="100%"/>

# 🤚 HumanTouch

**Transform AI-Generated Text into Natural Human Writing**

将 AI 生成的文本转换为更自然的人类写作风格，有效降低 AI 检测概率

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)](https://workers.cloudflare.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[English](#features) | [中文文档](#功能特性)

[Demo](https://humantouch.dev) · [Documentation](docs/) · [Report Bug](https://github.com/Digidai/HumanTouch/issues) · [Request Feature](https://github.com/Digidai/HumanTouch/issues)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔄 Multi-Round Processing
Iteratively refine text through multiple rounds of humanization, progressively lowering AI detection scores.

### 🎯 Multiple Detectors
Validate against ZeroGPT, GPTZero, and Copyleaks simultaneously for comprehensive coverage.

</td>
<td width="50%">

### 🤖 Multi-Model Support
Use Moonshot, OpenRouter (Claude, GPT-4, Gemini, Llama, etc.) or any OpenAI-compatible API.

### 🌍 Edge Deployment
Deploy to Vercel or Cloudflare Workers for global low-latency access.

</td>
</tr>
</table>

---

## 🤖 Supported Models

HumanTouch supports multiple LLM providers. Choose based on your needs:

### Moonshot (Default)
| Model | Description |
|-------|-------------|
| `kimi-k2-0711-preview` | Latest Kimi model (default) |
| `moonshot-v1-8k` | 8K context |
| `moonshot-v1-32k` | 32K context |
| `moonshot-v1-128k` | 128K context |

### OpenRouter (Recommended for variety)
Access 100+ models through [OpenRouter](https://openrouter.ai/):

| Model ID | Description |
|----------|-------------|
| `anthropic/claude-sonnet-4` | Claude Sonnet 4 |
| `openai/gpt-4o` | GPT-4o |
| `google/gemini-2.0-flash-exp` | Gemini 2.0 Flash |
| `google/gemini-exp-1206` | Gemini Experimental |
| `meta-llama/llama-3.3-70b-instruct` | Llama 3.3 70B |
| `deepseek/deepseek-chat` | DeepSeek Chat |
| `qwen/qwen-2.5-72b-instruct` | Qwen 2.5 72B |

### Custom (Any OpenAI-compatible API)
Use any API that follows OpenAI's chat completions format.

---

## 🚀 Quick Start

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Digidai/HumanTouch&env=MOONSHOT_API_KEY,JWT_SECRET,ALLOWED_API_KEYS)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Digidai/HumanTouch)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Digidai/HumanTouch.git
cd HumanTouch

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📖 API Usage

### Basic Request

```bash
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text here...",
    "options": {
      "rounds": 3,
      "style": "casual",
      "target_score": 0.1
    }
  }'
```

### Using a Specific Model

You can specify any supported model in the request:

```bash
# Use Claude Sonnet 4 via OpenRouter
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "options": {
      "model": "anthropic/claude-sonnet-4",
      "rounds": 3,
      "style": "academic"
    }
  }'

# Use GPT-4o via OpenRouter
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "options": {
      "model": "openai/gpt-4o",
      "rounds": 2
    }
  }'

# Use Gemini via OpenRouter
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "options": {
      "model": "google/gemini-2.0-flash-exp"
    }
  }'
```

### Response with Model Info

```json
{
  "success": true,
  "data": {
    "processed_text": "Humanized text...",
    "original_length": 500,
    "processed_length": 520,
    "detection_scores": {
      "zerogpt": 0.12,
      "gptzero": 0.08,
      "copyleaks": 0.15
    },
    "processing_time": 5.23,
    "rounds_used": 3,
    "model_used": "anthropic/claude-sonnet-4",
    "provider": "openrouter"
  }
}
```

---

## ⚙️ Configuration

### LLM Provider Setup

Configure ONE of the following in your environment:

#### Option 1: Moonshot (Default)
```env
MOONSHOT_API_KEY=sk-your-moonshot-key
MOONSHOT_MODEL=kimi-k2-0711-preview
```

#### Option 2: OpenRouter (Recommended)
```env
OPENROUTER_API_KEY=sk-or-your-openrouter-key
OPENROUTER_MODEL=anthropic/claude-sonnet-4
```

#### Option 3: Custom OpenAI-Compatible API
```env
CUSTOM_LLM_API_KEY=your-api-key
CUSTOM_LLM_BASE_URL=https://your-api.com/v1
CUSTOM_LLM_MODEL=your-model-name
```

### Priority Order
If multiple providers are configured, the priority is:
1. **OpenRouter** (if `OPENROUTER_API_KEY` is set)
2. **Moonshot** (if `MOONSHOT_API_KEY` is set)
3. **Custom** (if `CUSTOM_LLM_API_KEY` and `CUSTOM_LLM_BASE_URL` are set)

### All Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **LLM - Moonshot** |
| `MOONSHOT_API_KEY` | ✅* | - | Moonshot API key |
| `MOONSHOT_MODEL` | ❌ | `kimi-k2-0711-preview` | Moonshot model |
| **LLM - OpenRouter** |
| `OPENROUTER_API_KEY` | ✅* | - | OpenRouter API key |
| `OPENROUTER_MODEL` | ❌ | `anthropic/claude-sonnet-4` | Default model |
| **LLM - Custom** |
| `CUSTOM_LLM_API_KEY` | ✅* | - | Custom API key |
| `CUSTOM_LLM_BASE_URL` | ✅* | - | Custom API base URL |
| `CUSTOM_LLM_MODEL` | ❌ | `gpt-4` | Custom model name |
| **Authentication** |
| `JWT_SECRET` | Production | - | JWT signing secret |
| `ALLOWED_API_KEYS` | Production | - | Comma-separated API keys |
| `API_KEY_PREFIX` | ❌ | `hk_` | API key prefix |
| **Detection** |
| `DETECTOR_MODE` | ❌ | `mock` | `mock` or `strict` |
| `ZEROGPT_API_KEY` | ❌ | - | ZeroGPT API key |
| `GPTZERO_API_KEY` | ❌ | - | GPTZero API key |
| `COPYLEAKS_API_KEY` | ❌ | - | Copyleaks API key |
| **General** |
| `MAX_TEXT_LENGTH` | ❌ | `10000` | Max characters |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | ❌ | `100` | Rate limit |
| `SITE_URL` | ❌ | - | Your site URL (for OpenRouter) |

*At least one LLM provider must be configured.

---

## 📊 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/process` | POST | Synchronous text processing |
| `/api/v1/validate` | POST | AI detection validation only |
| `/api/v1/batch` | POST | Batch processing (max 10) |
| `/api/v1/async` | POST | Create async task |
| `/api/v1/status/:id` | GET | Get task status |
| `/api/v1/tasks` | GET | List all tasks |

### POST /api/v1/process

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | ✅ | Text to process (max 10000 chars) |
| `options.rounds` | number | ❌ | Processing rounds (1-5, default: 3) |
| `options.style` | string | ❌ | `casual`, `academic`, `professional`, `creative` |
| `options.target_score` | number | ❌ | Target detection score (0-1, default: 0.1) |
| `options.model` | string | ❌ | Override default model |

### POST /api/v1/validate

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | ✅ | Text to analyze |
| `detectors` | array | ❌ | `["zerogpt", "gptzero", "copyleaks"]` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Next.js   │  │   React 19  │  │   Tailwind CSS 4    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /api/v1/process  │  /api/v1/validate  │  /api/v1/*  │    │
│  └─────────────────────────────────────────────────────┘    │
│         Vercel Serverless    OR    Cloudflare Workers        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Moonshot     │ │   OpenRouter    │ │   Custom LLM    │
│  (Kimi Models)  │ │ (100+ Models)   │ │ (OpenAI-compat) │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 🚀 Deployment

### Vercel (Recommended for full-stack)

```bash
npm run deploy
```

### Cloudflare Workers (API only)

```bash
# Login to Cloudflare
npx wrangler login

# Configure secrets
npm run cf:secret OPENROUTER_API_KEY
npm run cf:secret JWT_SECRET
npm run cf:secret ALLOWED_API_KEYS

# Deploy
npm run deploy:cf
```

### Deployment Comparison

| Platform | Pros | Limits (Free) |
|----------|------|---------------|
| **Vercel** | Full-stack, zero config | 10s timeout, 100K/mo |
| **Cloudflare Workers** | Higher limits, faster | API only, 30s CPU |
| **Hybrid** | Best of both | Requires setup |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Moonshot AI](https://moonshot.cn/) - AI text generation
- [OpenRouter](https://openrouter.ai/) - Multi-model API gateway
- [ZeroGPT](https://zerogpt.com/) - AI detection
- [GPTZero](https://gptzero.me/) - AI detection
- [Copyleaks](https://copyleaks.com/) - AI detection

---

<div align="center">

**[⬆ Back to Top](#-humantouch)**

Made with ❤️ by the HumanTouch Team

</div>
