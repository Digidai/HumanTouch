import { describe, it, expect } from 'vitest';
import {
  validateProcessTextInput,
  sanitizeString,
  isValidUrl,
  isValidEmail,
} from '../src/lib/validation';

describe('validateProcessTextInput', () => {
  it('should pass with valid input', () => {
    const result = validateProcessTextInput({
      text: 'Hello, this is a test.',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data?.text).toBe('Hello, this is a test.');
  });

  it('should fail with missing text', () => {
    const result = validateProcessTextInput({});
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'text')).toBe(true);
  });

  it('should fail with empty text', () => {
    const result = validateProcessTextInput({ text: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'REQUIRED')).toBe(true);
  });

  it('should fail with whitespace-only text', () => {
    const result = validateProcessTextInput({ text: '   \n\t  ' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'EMPTY')).toBe(true);
  });

  it('should fail with invalid text type', () => {
    const result = validateProcessTextInput({ text: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
  });

  it('should validate options.rounds', () => {
    const validResult = validateProcessTextInput({
      text: 'Test',
      options: { rounds: 3 },
    });
    expect(validResult.valid).toBe(true);

    const invalidResult = validateProcessTextInput({
      text: 'Test',
      options: { rounds: 15 },
    });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.some(e => e.field === 'options.rounds')).toBe(true);
  });

  it('should validate options.style', () => {
    const validResult = validateProcessTextInput({
      text: 'Test',
      options: { style: 'casual' },
    });
    expect(validResult.valid).toBe(true);

    const invalidResult = validateProcessTextInput({
      text: 'Test',
      options: { style: 'invalid-style' },
    });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.some(e => e.field === 'options.style')).toBe(true);
  });

  it('should validate options.target_score', () => {
    const validResult = validateProcessTextInput({
      text: 'Test',
      options: { target_score: 0.1 },
    });
    expect(validResult.valid).toBe(true);

    const invalidResult = validateProcessTextInput({
      text: 'Test',
      options: { target_score: 150 },
    });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.some(e => e.field === 'options.target_score')).toBe(true);
  });

  it('should fail with invalid body type', () => {
    const result = validateProcessTextInput(null);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'INVALID_BODY')).toBe(true);
  });
});

describe('sanitizeString', () => {
  it('should remove control characters', () => {
    const input = 'Hello\x00World\x1F!';
    const result = sanitizeString(input);
    expect(result).toBe('HelloWorld!');
  });

  it('should preserve newlines and tabs', () => {
    const input = 'Hello\nWorld\tTest';
    const result = sanitizeString(input);
    expect(result).toBe('Hello\nWorld\tTest');
  });

  it('should handle empty string', () => {
    expect(sanitizeString('')).toBe('');
  });
});

describe('isValidUrl', () => {
  it('should accept valid http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('http://example.com/path?query=1')).toBe(true);
  });

  it('should accept valid https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://sub.example.com:8080/path')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('file:///etc/passwd')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@no-local.com')).toBe(false);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
