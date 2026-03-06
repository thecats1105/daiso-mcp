/**
 * CGV 전송 계층 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestCgv } from '../../../src/services/cgv/transport.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestCgv', () => {
  it('정상 응답을 JSON으로 파싱한다', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: 0, data: [] }), { status: 200 }));

    const result = await requestCgv<{ statusCode: number; data: unknown[] }>(
      '/cnm/atkt/searchRegnList',
      new URLSearchParams({ coCd: 'A420' }),
      1000,
    );

    expect(result.statusCode).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('200이어도 JSON 파싱 불가면 에러를 던진다', async () => {
    mockFetch.mockResolvedValueOnce(new Response('<html>bad</html>', { status: 200 }));

    await expect(
      requestCgv('/cnm/atkt/searchRegnList', new URLSearchParams({ coCd: 'A420' }), 1000),
    ).rejects.toThrow('bad');
  });

  it('403 + zyteApiKey면 Zyte fallback을 사용한다', async () => {
    const body = Buffer.from(JSON.stringify({ statusCode: 0, data: [{ siteNo: '0056' }] }), 'utf8').toString(
      'base64',
    );

    mockFetch
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 200,
            httpResponseBody: body,
          }),
          { status: 200 },
        ),
      );

    const result = await requestCgv<{ statusCode: number; data: Array<{ siteNo: string }> }>(
      '/cnm/atkt/searchRegnList',
      new URLSearchParams({ coCd: 'A420' }),
      1000,
      'test-key',
    );

    expect(result.data[0].siteNo).toBe('0056');
    expect(String(mockFetch.mock.calls[1][0])).toContain('https://api.zyte.com/v1/extract');
  });

  it('AbortError는 시간 초과 에러로 변환한다', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));

    await expect(
      requestCgv('/cnm/atkt/searchRegnList', new URLSearchParams({ coCd: 'A420' }), 1000),
    ).rejects.toThrow('CGV API 요청 시간 초과');
  });

  it('일반 HTTP 에러는 상태코드 메시지를 던진다', async () => {
    mockFetch.mockResolvedValueOnce(new Response('server error', { status: 500 }));

    await expect(
      requestCgv('/cnm/atkt/searchRegnList', new URLSearchParams({ coCd: 'A420' }), 1000),
    ).rejects.toThrow('CGV API 호출 실패: 500');
  });
});

