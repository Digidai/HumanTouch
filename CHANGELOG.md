# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-model support via OpenRouter (200+ models)
- Cloudflare Workers deployment support
- API request model override (`options.model`)
- Response includes `model_used` and `provider` fields
- Project branding (logo, banner)
- Comprehensive documentation

### Changed
- Default OpenRouter model changed to `google/gemini-2.5-flash-preview`
- Improved error handling with structured `ApiError`
- Enhanced security with JWT_SECRET enforcement in production

## [1.0.0] - 2024-12-28

### Added
- Initial release
- Text humanization with multi-round processing
- Multiple AI detector support (ZeroGPT, GPTZero, Copyleaks)
- Synchronous and asynchronous processing modes
- Batch processing (up to 10 texts)
- Task queue with webhook notifications
- Rate limiting middleware
- API key authentication
- Next.js 15 + React 19 frontend
- Dashboard with real-time statistics
- JavaScript and Python SDKs

### Security
- JWT-based authentication
- API key whitelist support
- Webhook signature verification (HMAC-SHA256)
- Production environment enforcement

## [0.1.0] - 2024-07-17

### Added
- Project scaffolding
- Basic API structure
- Moonshot AI integration
- Initial UI components

---

## Release Notes Format

### Added
New features

### Changed
Changes in existing functionality

### Deprecated
Soon-to-be removed features

### Removed
Removed features

### Fixed
Bug fixes

### Security
Vulnerability fixes
