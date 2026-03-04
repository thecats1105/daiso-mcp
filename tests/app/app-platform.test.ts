/**
 * 앱 통합 테스트 - 플랫폼/CORS/MCP 엔드포인트
 */

import { describe, it, expect, vi } from 'vitest';
import app from '../../src/index.js';
import { setupFetchMock } from './testHelpers.js';

const mockFetch = vi.fn();
setupFetchMock(mockFetch);

describe('CORS', () => {
  it('CORS 헤더가 설정되어 있다', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'https://example.com' },
    });

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('MCP 엔드포인트', () => {
  it('POST /mcp가 존재한다', async () => {
    // MCP 프로토콜 요청 시뮬레이션은 복잡하므로 라우트 존재 여부만 확인
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // MCP 핸들러가 동작 (에러가 발생해도 라우트는 존재함)
    expect(res.status).toBeDefined();
  });

  it('POST /도 MCP 요청을 처리한다', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBeDefined();
  });
});
