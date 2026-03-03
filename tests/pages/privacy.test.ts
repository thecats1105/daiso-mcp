/**
 * 개인정보 처리방침 페이지 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  generatePrivacyText,
  generatePrivacyHtml,
  createPrivacyResponse,
  createPrivacyTextResponse,
} from '../../src/pages/privacy.js';

describe('개인정보 처리방침 페이지', () => {
  it('텍스트 버전을 생성한다', () => {
    const text = generatePrivacyText('https://example.com');

    expect(text).toContain('# 개인정보 처리방침');
    expect(text).toContain('https://example.com');
    expect(text).toContain('수집하지 않습니다');
  });

  it('HTML 버전을 생성한다', () => {
    const html = generatePrivacyHtml('https://example.com');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<h1>개인정보 처리방침</h1>');
    expect(html).toContain('https://example.com');
  });

  it('HTML 응답을 생성한다', async () => {
    const response = createPrivacyResponse('https://example.com');

    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');

    const body = await response.text();
    expect(body).toContain('개인정보 처리방침');
  });

  it('텍스트 응답을 생성한다', async () => {
    const response = createPrivacyTextResponse('https://example.com');

    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');

    const body = await response.text();
    expect(body).toContain('개인정보 처리방침');
  });
});
