# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue
- Disclose the vulnerability publicly before it's fixed
- Exploit the vulnerability

### Do

1. **Email us** at security@humantouch.dev (or open a private security advisory on GitHub)
2. **Include details**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Resolution Timeline**: Depends on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release

### Security Best Practices for Users

#### API Keys

- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys regularly
- Use the minimum required permissions

#### Deployment

- Always use HTTPS in production
- Set `NODE_ENV=production`
- Configure proper CORS settings
- Enable rate limiting
- Use strong JWT secrets (32+ characters)

#### Configuration

```env
# Production security settings
NODE_ENV=production
JWT_SECRET=<random-32+-character-string>
ALLOWED_API_KEYS=<your-whitelisted-keys>
DETECTOR_MODE=strict
```

## Security Features

HumanTouch includes several security features:

- **API Key Authentication**: Bearer token validation
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Text length and parameter checks
- **Webhook Signatures**: HMAC-SHA256 for callbacks
- **Environment Separation**: Dev/production mode detection

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve HumanTouch's security.
