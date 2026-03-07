/**
 * CU API 핸들러 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCuCheckInventory, handleCuFindStores } from '../../src/api/handlers.js';

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
  } as unknown as Parameters<typeof handleCuFindStores>[0];
}

describe('handleCuFindStores', () => {
  it('CU 매장 검색 결과를 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          totalCnt: 1,
          storeList: [{ storeCd: '1', storeNm: '강남점', latVal: 37.5, longVal: 127.0 }],
        }),
      ),
    );

    const ctx = createMockContext({ keyword: '강남' });
    await handleCuFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ stores: expect.any(Array) }),
      }),
    );
  });

  it('CU 매장 검색 에러를 처리한다', async () => {
    mockFetch.mockRejectedValue(new Error('cu store fail'));

    const ctx = createMockContext({ keyword: '강남' });
    await handleCuFindStores(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'CU_STORE_SEARCH_FAILED', message: 'cu store fail' },
      }),
      500,
    );
  });
});

describe('handleCuCheckInventory', () => {
  it('CU 재고 검색 결과를 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            totalCnt: 1,
            storeList: [{ storeCd: '1', storeNm: '강남점', latVal: 37.5, longVal: 127.0 }],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ areaList: [] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            spellModifyYn: 'Y',
            data: {
              stockResult: {
                result: {
                  total_count: 1,
                  rows: [
                    {
                      fields: {
                        item_cd: '8801',
                        item_nm: '감자칩',
                        hyun_maega: '1700',
                        pickup_yn: 'Y',
                        deliv_yn: 'Y',
                        reserv_yn: 'N',
                      },
                    },
                  ],
                },
              },
            },
          }),
        ),
      );

    const ctx = createMockContext({ keyword: '과자' });
    await handleCuCheckInventory(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          keyword: '과자',
          inventory: expect.objectContaining({ totalCount: 1 }),
        }),
      }),
    );
  });

  it('keyword가 없으면 에러를 반환한다', async () => {
    const ctx = createMockContext({});
    await handleCuCheckInventory(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'MISSING_QUERY', message: '검색어(keyword)를 입력해주세요.' },
      }),
      400,
    );
  });

  it('CU 재고 검색 에러를 처리한다', async () => {
    mockFetch.mockRejectedValue(new Error('cu inventory fail'));

    const ctx = createMockContext({ keyword: '과자' });
    await handleCuCheckInventory(ctx);

    expect(ctx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'CU_INVENTORY_CHECK_FAILED', message: 'cu inventory fail' },
      }),
      500,
    );
  });
});
