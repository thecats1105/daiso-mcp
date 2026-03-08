/**
 * 이마트24 재고 확인 도구 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCheckInventoryTool } from '../../../../src/services/emart24/tools/checkInventory.js';

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

    expect(tool.name).toBe('emart24_check_inventory');
    expect(tool.metadata.title).toBe('이마트24 재고 확인');
  });

  it('pluCd로 재고를 조회한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 0,
            count: 1,
            data: [{ CODE: '28339', TITLE: '강남스퀘어점', LATITUDE: 37.5, LONGITUDE: 127.0 }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            storeGoodsInfo: { pluCd: '8800244010504', goodsNm: '두바이초콜릿' },
            storeGoodsQty: [{ BIZNO: '28339', BIZQTY: '3' }],
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

    const tool = createCheckInventoryTool();
    const result = await tool.handler({ pluCd: '8800244010504', storeKeyword: '강남' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.pluCd).toBe('8800244010504');
    expect(parsed.inventory.count).toBe(1);
    expect(parsed.inventory.stores[0].bizNo).toBe('28339');
  });

  it('pluCd와 keyword가 모두 없으면 에러를 던진다', async () => {
    const tool = createCheckInventoryTool();

    await expect(tool.handler({})).rejects.toThrow('pluCd 또는 keyword 중 하나는 반드시 입력해주세요.');
  });

  it('keyword로 첫 상품을 찾아 재고를 조회한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            totalCnt: 1,
            productList: [{ pluCd: '8800244010504', goodsNm: '두바이초콜릿' }],
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 0, count: 0, data: [] })));

    const tool = createCheckInventoryTool();
    const result = await tool.handler({ keyword: '두바이' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.pluCd).toBe('8800244010504');
    expect(parsed.inventory.count).toBe(0);
  });
});
