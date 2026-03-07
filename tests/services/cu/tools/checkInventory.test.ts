/**
 * CU 재고 확인 도구 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCheckInventoryTool } from '../../../../src/services/cu/tools/checkInventory.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createCheckInventoryTool', () => {
  it('올바른 도구 정의를 반환한다', () => {
    const tool = createCheckInventoryTool();

    expect(tool.name).toBe('cu_check_inventory');
    expect(tool.metadata.title).toBe('CU 재고 확인');
  });

  it('keyword가 없으면 에러를 던진다', async () => {
    const tool = createCheckInventoryTool();

    await expect(tool.handler({ keyword: '' })).rejects.toThrow('상품 검색어(keyword)를 입력해주세요.');
  });

  it('주변 매장과 재고 검색 결과를 함께 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            totalCnt: 1,
            storeList: [
              {
                storeCd: '1',
                storeNm: '강남점',
                latVal: 37.5,
                longVal: 127.0,
                distance: 100,
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ areaList: [] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            spellModifyYn: 'N',
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

    const tool = createCheckInventoryTool();
    const result = await tool.handler({ keyword: '과자', storeLimit: 5, size: 8 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.nearbyStores.totalCount).toBe(1);
    expect(parsed.inventory.totalCount).toBe(1);
    expect(parsed.inventory.items[0].itemCode).toBe('8801');
  });
});
