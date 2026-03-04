/**
 * API 핸들러 테스트 - 제품 상세
 */

import { describe, it, expect, vi } from 'vitest';
import { handleGetProduct } from '../../src/api/handlers.js';
import {
  createMockContext,
  createMockProductResponse,
  setupFetchMock,
} from './testHelpers.js';

const mockFetch = vi.fn();
setupFetchMock(mockFetch);

describe('handleGetProduct', () => {
  it('제품 정보를 반환한다', async () => {
    const product = {
      PD_NO: '12345',
      PDNM: '테스트상품',
      PD_PRC: '5000',
      ATCH_FILE_URL: '/img.jpg',
      BRND_NM: '다이소',
      SOLD_OUT_YN: 'N',
      NEW_PD_YN: 'Y',
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(createMockProductResponse([product]))));

    const ctx = createMockContext({}, { id: '12345' });
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: '12345',
          name: '테스트상품',
          price: 5000,
          currency: 'KRW',
          soldOut: false,
          isNew: true,
        }),
      }),
    );
  });

  it('제품 ID가 없으면 에러를 반환한다', async () => {
    const ctx = createMockContext({}, {});
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_ID', message: '제품 ID가 필요합니다.' },
      }),
      400,
    );
  });

  it('제품을 찾지 못하면 404를 반환한다', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ resultSet: { result: [{}] } })));

    const ctx = createMockContext({}, { id: 'notfound' });
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'NOT_FOUND', message: '제품을 찾을 수 없습니다.' },
      }),
      404,
    );
  });

  it('PDNM이 없으면 EXH_PD_NM을 사용한다', async () => {
    const product = {
      PD_NO: '12345',
      PDNM: '',
      EXH_PD_NM: '대체이름',
      PD_PRC: '5000',
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(createMockProductResponse([product]))));

    const ctx = createMockContext({}, { id: '12345' });
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: '대체이름' }),
      }),
    );
  });

  it('PD_PRC가 숫자가 아니면 0을 사용한다', async () => {
    const product = {
      PD_NO: '12345',
      PDNM: '테스트',
      PD_PRC: 'invalid',
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(createMockProductResponse([product]))));

    const ctx = createMockContext({}, { id: '12345' });
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ price: 0 }),
      }),
    );
  });

  it('API 에러 시 500 에러를 반환한다', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'));

    const ctx = createMockContext({}, { id: '12345' });
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'FETCH_FAILED', message: 'API Error' },
      }),
      500,
    );
  });

  it('알 수 없는 에러도 처리한다', async () => {
    mockFetch.mockRejectedValue(null);

    const ctx = createMockContext({}, { id: '12345' });
    await handleGetProduct(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'FETCH_FAILED', message: '알 수 없는 오류가 발생했습니다.' },
      }),
      500,
    );
  });
});
