import { describe, it, expect } from 'vitest';
import { validateUrl, extractDomain } from '@/lib/url-validator';

describe('url-validator', () => {
  describe('validateUrl', () => {
    it('should accept valid https URL', () => {
      const result = validateUrl('https://example.com/article');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid http URL', () => {
      const result = validateUrl('http://example.com/article');
      expect(result.isValid).toBe(true);
    });

    it('should reject empty URL', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URLが空です');
    });

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URLの形式が不正です');
    });

    it('should reject non-http protocols', () => {
      const result = validateUrl('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('http または https のURLのみ許可されています');
    });

    it('should reject file protocol', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(result.isValid).toBe(false);
    });

    // SSRF protection tests
    describe('SSRF protection', () => {
      it('should reject localhost', () => {
        const result = validateUrl('http://localhost:3000');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('内部アドレスへのアクセスは許可されていません');
      });

      it('should reject 127.0.0.1', () => {
        const result = validateUrl('http://127.0.0.1:8080');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('内部アドレスへのアクセスは許可されていません');
      });

      it('should reject 0.0.0.0', () => {
        const result = validateUrl('http://0.0.0.0');
        expect(result.isValid).toBe(false);
      });

      it('should reject private IP 10.x.x.x', () => {
        const result = validateUrl('http://10.0.0.1');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('プライベートIPへのアクセスは許可されていません');
      });

      it('should reject private IP 172.16.x.x', () => {
        const result = validateUrl('http://172.16.0.1');
        expect(result.isValid).toBe(false);
      });

      it('should reject private IP 192.168.x.x', () => {
        const result = validateUrl('http://192.168.1.1');
        expect(result.isValid).toBe(false);
      });

      it('should accept valid external IP', () => {
        const result = validateUrl('http://8.8.8.8');
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/article/123')).toBe('example.com');
    });

    it('should extract domain with subdomain', () => {
      expect(extractDomain('https://blog.example.com/post')).toBe('blog.example.com');
    });

    it('should return "unknown" for invalid URL', () => {
      expect(extractDomain('not-a-url')).toBe('unknown');
    });

    it('should handle URL with port', () => {
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
    });
  });
});
