/**
 * API 핸들러 테스트 - 제품 검색
 */

import { describe, it, expect, vi } from 'vitest';
import { handleSearchProducts } from '../../src/api/handlers.js';
import {
  createMockContext,
  createMockProductResponse,
  setupFetchMock,
} from './testHelpers.js';

const mockFetch = vi.fn();
setupFetchMock(mockFetch);

describe('handleSearchProducts', () => {
  it('검색 결과를 반환한다', async () => {
    const products = [{ PD_NO: '1', PDNM: '테스트', PD_PRC: '1000' }];
    mockFetch.mockResolvedValue(new Response(JSON.stringify(createMockProductResponse(products))));

    const ctx = createMockContext({ q: '테스트' });
    await handleSearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ products: expect.any(Array) }),
      }),
    );
  });

  it('검색어가 없으면 에러를 반환한다', async () => {
    const ctx = createMockContext({});
    await handleSearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_QUERY', message: '검색어(q)를 입력해주세요.' },
      }),
      400,
    );
  });

  it('빈 검색어도 에러를 반환한다', async () => {
    const ctx = createMockContext({ q: '  ' });
    await handleSearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_QUERY', message: '검색어(q)를 입력해주세요.' },
      }),
      400,
    );
  });

  it('페이지네이션 파라미터를 처리한다', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(createMockProductResponse([]))));

    const ctx = createMockContext({ q: '테스트', page: '2', pageSize: '50' });
    await handleSearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ page: 2, pageSize: 50 }),
      }),
    );
  });

  it('API 에러 시 500 에러를 반환한다', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const ctx = createMockContext({ q: '테스트' });
    await handleSearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'SEARCH_FAILED', message: 'Network error' },
      }),
      500,
    );
  });

  it('알 수 없는 에러도 처리한다', async () => {
    mockFetch.mockRejectedValue('unknown error');

    const ctx = createMockContext({ q: '테스트' });
    await handleSearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'SEARCH_FAILED', message: '알 수 없는 오류가 발생했습니다.' },
      }),
      500,
    );
  });
});
