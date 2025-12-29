import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '../src/lib/taskqueue';

describe('validateWebhookUrl', () => {
  it('should accept valid http URLs', () => {
    const result = validateWebhookUrl('http://example.com/webhook');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('http://example.com/webhook');
  });

  it('should accept valid https URLs', () => {
    const result = validateWebhookUrl('https://api.example.com/hooks/123');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('https://api.example.com/hooks/123');
  });

  it('should trim whitespace', () => {
    const result = validateWebhookUrl('  https://example.com/webhook  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('https://example.com/webhook');
  });

  it('should reject empty URL', () => {
    const result = validateWebhookUrl('');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('不能为空');
  });

  it('should reject invalid URL format', () => {
    const result = validateWebhookUrl('not-a-url');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('格式无效');
  });

  it('should reject non-http protocols', () => {
    const ftpResult = validateWebhookUrl('ftp://example.com/file');
    expect(ftpResult.valid).toBe(false);
    expect(ftpResult.reason).toContain('http/https');

    const fileResult = validateWebhookUrl('file:///etc/passwd');
    expect(fileResult.valid).toBe(false);
  });

  it('should reject URLs with credentials', () => {
    const result = validateWebhookUrl('https://user:pass@example.com/webhook');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('用户名或密码');
  });

  it('should reject localhost', () => {
    const result = validateWebhookUrl('http://localhost:3000/webhook');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('本地或内网');
  });

  it('should reject private IP addresses', () => {
    // 10.x.x.x
    expect(validateWebhookUrl('http://10.0.0.1/webhook').valid).toBe(false);

    // 172.16-31.x.x
    expect(validateWebhookUrl('http://172.16.0.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('http://172.31.255.255/webhook').valid).toBe(false);

    // 192.168.x.x
    expect(validateWebhookUrl('http://192.168.1.1/webhook').valid).toBe(false);

    // 127.x.x.x
    expect(validateWebhookUrl('http://127.0.0.1:8080/webhook').valid).toBe(false);
  });

  it('should accept public IP addresses', () => {
    expect(validateWebhookUrl('http://8.8.8.8/webhook').valid).toBe(true);
    expect(validateWebhookUrl('http://203.0.113.1/webhook').valid).toBe(true);
  });

  it('should reject IPv6 loopback', () => {
    expect(validateWebhookUrl('http://[::1]/webhook').valid).toBe(false);
  });

  it('should reject IPv6 private addresses', () => {
    expect(validateWebhookUrl('http://[fc00::1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('http://[fd00::1]/webhook').valid).toBe(false);
  });

  it('should reject link-local IPv6 addresses', () => {
    expect(validateWebhookUrl('http://[fe80::1]/webhook').valid).toBe(false);
  });
});
