/**
 * API 테스트 공통 유틸리티
 */

import { beforeEach, afterEach, vi } from 'vitest';
import type { ApiContext } from '../../src/api/response.js';

/**
 * 전역 fetch 목킹을 설정합니다.
 */
export function setupFetchMock(mockFetch: ReturnType<typeof vi.fn>): void {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
}

/**
 * 테스트용 Hono Context를 생성합니다.
 */
export function createMockContext(
  query: Record<string, string> = {},
  params: Record<string, string> = {},
): ApiContext {
  return {
    env: {
      ZYTE_API_KEY: 'test-key',
    },
    req: {
      query: (key: string) => query[key],
      param: (key: string) => params[key],
    },
    json: vi.fn().mockImplementation((data, status) => ({
      data,
      status: status || 200,
    })),
  } as unknown as ApiContext;
}

/**
 * 다이소 제품 검색 응답 payload를 생성합니다.
 */
export function createMockProductResponse(products: unknown[], totalSize = 100) {
  return {
    resultSet: {
      result: [{ totalSize, resultDocuments: products }],
    },
  };
}
