/**
 * 앱 통합 테스트 공통 유틸리티
 */

import { afterEach, beforeEach, vi } from 'vitest';

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
