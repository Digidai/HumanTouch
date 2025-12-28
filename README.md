<div align="center">

<img src="public/images/banner.svg" alt="HumanTouch Banner" width="100%"/>

# 🤚 HumanTouch

**Transform AI-Generated Text into Natural Human Writing**

将 AI 生成的文本转换为更自然的人类写作风格，有效降低 AI 检测概率

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-200%2B%20Models-green)](https://openrouter.ai/)
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
Use **any model** via OpenRouter (200+ models) or any OpenAI-compatible API. Full flexibility to choose your preferred LLM.

### 🌍 Edge Deployment
Deploy to Vercel or Cloudflare Workers for global low-latency access.

</td>
</tr>
</table>

---

## 🤖 Supported Models

HumanTouch supports **any LLM** through multiple providers. The web UI always uses the server default model, while authenticated API calls can choose models.

### OpenRouter (Recommended - Access 200+ Models)

Use any model available on [OpenRouter](https://openrouter.ai/models). Just specify the model ID in your request:

```bash
# Examples of model IDs you can use:
anthropic/claude-sonnet-4
openai/gpt-4o
google/gemini-2.0-flash-exp
meta-llama/llama-3.3-70b-instruct
deepseek/deepseek-chat
qwen/qwen-2.5-72b-instruct
mistralai/mistral-large
cohere/command-r-plus
# ... and 200+ more models
```

Browse all available models at: https://openrouter.ai/models

### Custom API (Any OpenAI-compatible endpoint)

Use any API that follows OpenAI's chat completions format (e.g., local LLMs, self-hosted models).

---

## 🚀 Quick Start

### Use Online (No Setup Required)

Visit the deployed app and start immediately (no API key required):
1. Open the app
2. Paste your text
3. Start processing (uses the server default model)

To select a model or use your own LLM key, use the API with `api_key`.

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Digidai/HumanTouch&env=OPENROUTER_API_KEY,JWT_SECRET,ALLOWED_API_KEYS)

`OPENROUTER_API_KEY` (or custom provider) powers the public web UI. `ALLOWED_API_KEYS` controls API access.

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

API calls require two keys:
- **Access key** in `Authorization: Bearer hk_...` (configured via `ALLOWED_API_KEYS`)
- **LLM key** in request body `api_key` (OpenRouter/OpenAI-compatible)

Public web requests do **not** require these keys, but only use the default model.

### Basic Request

```bash
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text here...",
    "api_key": "sk-or-your-openrouter-key",
    "options": {
      "rounds": 3,
      "style": "casual",
      "target_score": 0.1
    }
  }'
```

### Public Web Request (No Auth, Default Model Only)

```bash
curl -X POST https://your-domain.com/api/v1/process \
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

### Using Any Model (via OpenRouter)

Specify any OpenRouter model ID in the `model` parameter (authenticated API only):

```bash
# Use Claude Sonnet 4
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "api_key": "sk-or-your-openrouter-key",
    "options": {
      "model": "anthropic/claude-sonnet-4",
      "rounds": 3
    }
  }'

# Use GPT-4o
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "api_key": "sk-or-your-openrouter-key",
    "options": {
      "model": "openai/gpt-4o"
    }
  }'

# Use DeepSeek
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "api_key": "sk-or-your-openrouter-key",
    "options": {
      "model": "deepseek/deepseek-chat"
    }
  }'

# Use Llama 3.3 70B
curl -X POST https://your-domain.com/api/v1/process \
  -H "Authorization: Bearer hk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your AI-generated text...",
    "api_key": "sk-or-your-openrouter-key",
    "options": {
      "model": "meta-llama/llama-3.3-70b-instruct"
    }
  }'
```

### Response

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
These settings power the public web UI default model; authenticated API calls always use the per-request `api_key`.

#### Option 1: OpenRouter (Default - 200+ models)
```env
OPENROUTER_API_KEY=sk-or-your-openrouter-key
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free  # Default model (fast & free)
```

#### Option 2: Custom OpenAI-Compatible API
```env
CUSTOM_LLM_API_KEY=your-api-key
CUSTOM_LLM_BASE_URL=https://your-api.com/v1
CUSTOM_LLM_MODEL=your-model-name
```

### Priority Order (Public Web UI)

If multiple providers are configured:
1. **OpenRouter** (if `OPENROUTER_API_KEY` is set)
2. **Custom** (if `CUSTOM_LLM_API_KEY` and `CUSTOM_LLM_BASE_URL` are set)

### All Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **LLM - OpenRouter (Default)** |
| `OPENROUTER_API_KEY` | ✅* | - | OpenRouter API key (public web UI default model) |
| `OPENROUTER_MODEL` | ❌ | `google/gemini-2.0-flash-exp:free` | Default model |
| **LLM - Custom** |
| `CUSTOM_LLM_API_KEY` | ✅* | - | Custom API key (public web UI default model) |
| `CUSTOM_LLM_BASE_URL` | ✅* | - | Custom API base URL (public web UI default model) |
| `CUSTOM_LLM_MODEL` | ❌ | `gpt-4` | Default model |
| **Authentication** |
| `JWT_SECRET` | Production | - | JWT signing secret |
| `ALLOWED_API_KEYS` | Production | - | Comma-separated API access keys (Bearer) |
| `API_KEY_PREFIX` | ❌ | `hk_` | API key prefix |
| **Detection** |
| `DETECTOR_MODE` | ❌ | `mock` | `mock` or `strict` |
| `ZEROGPT_API_KEY` | ❌ | - | ZeroGPT API key |
| `GPTZERO_API_KEY` | ❌ | - | GPTZero API key |
| `COPYLEAKS_API_KEY` | ❌ | - | Copyleaks API key |
| **General** |
| `MAX_TEXT_LENGTH` | ❌ | `10000` | Max characters |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | ❌ | `100` | Rate limit |
| `SITE_URL` | ❌ | - | Your site URL |

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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | ✅ | Text to process (max 10000 chars) |
| `api_key` | string | ✅ (API) | LLM API key for authenticated API calls |
| `options.model` | string | ❌ | Model ID (API only; not allowed for public web) |
| `options.rounds` | number | ❌ | Processing rounds (1-5, default: 3) |
| `options.style` | string | ❌ | `casual`, `academic`, `professional`, `creative` |
| `options.target_score` | number | ❌ | Target detection score (0-1, default: 0.1) |

### POST /api/v1/validate

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
│  │  Next.js 16 │  │   React 19  │  │   Tailwind CSS 4    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Vercel)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  /api/v1/process  │  /api/v1/validate  │  /api/v1/*  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   OpenRouter    │
                    │  (200+ Models)  │
                    │ Claude, GPT-4o, │
                    │ Gemini, Llama.. │
                    └─────────────────┘
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Click the "Deploy with Vercel" button above
2. Set environment variables:
   - `OPENROUTER_API_KEY`: LLM key for the public web UI default model
   - `ALLOWED_API_KEYS`: Comma-separated API access keys (for Bearer auth)
3. Deploy!

Or deploy via CLI:
```bash
npm run deploy
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📜 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) - Multi-model API gateway (200+ models)
- [ZeroGPT](https://zerogpt.com/), [GPTZero](https://gptzero.me/), [Copyleaks](https://copyleaks.com/) - AI detection

---

<div align="center">

**[⬆ Back to Top](#-humantouch)**

Made with ❤️ by the HumanTouch Team

</div>
