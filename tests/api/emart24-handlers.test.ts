/**
 * 이마트24 API 핸들러 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleEmart24CheckInventory,
  handleEmart24FindStores,
  handleEmart24SearchProducts,
} from '../../src/api/emart24Handlers.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createMockContext(query: Record<string, string> = {}) {
  return {
    env: {},
    req: {
      query: (key: string) => query[key],
      param: () => undefined,
    },
    json: vi.fn().mockImplementation((data, status) => ({
      data,
      status: status || 200,
    })),
  } as unknown as Parameters<typeof handleEmart24FindStores>[0];
}

describe('handleEmart24FindStores', () => {
  it('매장 검색 결과를 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 0,
          count: 1,
          data: [{ CODE: '28339', TITLE: '강남스퀘어점', LATITUDE: 37.5, LONGITUDE: 127.0 }],
        }),
      ),
    );

    const ctx = createMockContext({ keyword: '강남', lat: '37.5', lng: '127.0' });
    await handleEmart24FindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          stores: expect.any(Array),
        }),
      }),
    );
  });

  it('예외 발생 시 에러를 반환한다', async () => {
    mockFetch.mockRejectedValue(new Error('store fail'));

    const ctx = createMockContext({ keyword: '강남' });
    await handleEmart24FindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'EMART24_STORE_SEARCH_FAILED', message: 'store fail' },
      }),
      500,
    );
  });
});

describe('handleEmart24SearchProducts', () => {
  it('keyword가 없으면 에러를 반환한다', async () => {
    const ctx = createMockContext({});
    await handleEmart24SearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_QUERY', message: '검색어(keyword)를 입력해주세요.' },
      }),
      400,
    );
  });

  it('상품 검색 결과를 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ totalCnt: 1, productList: [{ pluCd: '8801', goodsNm: '과자' }] })),
    );

    const ctx = createMockContext({ keyword: '과자' });
    await handleEmart24SearchProducts(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          products: expect.any(Array),
        }),
      }),
    );
  });
});

describe('handleEmart24CheckInventory', () => {
  it('필수 파라미터가 없으면 에러를 반환한다', async () => {
    const ctx = createMockContext({});
    await handleEmart24CheckInventory(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_PLU_CD', message: '상품 PLU 코드(pluCd)를 입력해주세요.' },
      }),
      400,
    );
  });

  it('재고 조회 결과를 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            storeGoodsInfo: { pluCd: '8801', goodsNm: '과자' },
            storeGoodsQty: [{ BIZNO: '28339', BIZQTY: '2' }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            storeInfo: {
              storeNm: '강남스퀘어점',
              tel: '02-000-0000',
              storeAddr: '서울특별시 강남구 강남대로 396',
            },
          }),
        ),
      );

    const ctx = createMockContext({ pluCd: '8801', bizNoArr: '28339' });
    await handleEmart24CheckInventory(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          pluCd: '8801',
          count: 1,
        }),
      }),
    );
  });
});
