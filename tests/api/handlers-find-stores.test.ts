/**
 * API 핸들러 테스트 - 매장 검색
 */

import { describe, it, expect, vi } from 'vitest';
import { handleFindStores } from '../../src/api/handlers.js';
import { createMockContext, setupFetchMock } from './testHelpers.js';

const mockFetch = vi.fn();
setupFetchMock(mockFetch);

describe('handleFindStores', () => {
  const mockStoreHtml = `
    <div class="bx-store" data-start="0900" data-end="2200" data-lat="37.5" data-lng="127.0" data-info='{}'>
      <h4 class="place">테스트점</h4>
      <em class="phone">T.02-1234-5678</em>
      <p class="addr">서울시 테스트구</p>
    </div>
  `;

  it('매장 검색 결과를 반환한다', async () => {
    mockFetch.mockResolvedValue(new Response(mockStoreHtml));

    const ctx = createMockContext({ keyword: '테스트' });
    await handleFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ stores: expect.any(Array) }),
      }),
    );
  });

  it('keyword나 sido가 없으면 에러를 반환한다', async () => {
    const ctx = createMockContext({});
    await handleFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_PARAMS', message: '검색어(keyword) 또는 지역(sido)을 입력해주세요.' },
      }),
      400,
    );
  });

  it('sido만 있어도 검색 가능하다', async () => {
    mockFetch.mockResolvedValue(new Response(mockStoreHtml));

    const ctx = createMockContext({ sido: '서울' });
    await handleFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('limit 파라미터를 처리한다', async () => {
    const multipleStores = mockStoreHtml + mockStoreHtml + mockStoreHtml;
    mockFetch.mockResolvedValue(new Response(multipleStores));

    const ctx = createMockContext({ keyword: '테스트', limit: '2' });
    await handleFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stores: expect.any(Array) }),
        meta: expect.objectContaining({ total: 3 }),
      }),
    );
  });

  it('API 에러 시 500 에러를 반환한다', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const ctx = createMockContext({ keyword: '테스트' });
    await handleFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'SEARCH_FAILED', message: 'Network error' },
      }),
      500,
    );
  });

  it('알 수 없는 에러도 처리한다', async () => {
    mockFetch.mockRejectedValue(undefined);

    const ctx = createMockContext({ keyword: '테스트' });
    await handleFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'SEARCH_FAILED', message: '알 수 없는 오류가 발생했습니다.' },
      }),
      500,
    );
  });
});
