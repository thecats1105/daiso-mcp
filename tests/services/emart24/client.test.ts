/**
 * 이마트24 클라이언트 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateDistanceM,
  fetchEmart24StoreDetail,
  fetchEmart24Stores,
  searchEmart24Products,
  searchEmart24StockByStores,
} from '../../../src/services/emart24/client.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchEmart24Stores', () => {
  it('매장 목록을 정규화해서 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 0,
          count: 1,
          data: [
            {
              CODE: '28339',
              TITLE: '강남스퀘어점',
              ADDRESS: '서울특별시 강남구 강남대로 396',
              LATITUDE: '37.4982',
              LONGITUDE: '127.0276',
              SVR_24: '1',
            },
          ],
        }),
      ),
    );

    const result = await fetchEmart24Stores({ keyword: '강남' });

    expect(result.totalCount).toBe(1);
    expect(result.stores[0]).toEqual(
      expect.objectContaining({
        storeCode: '28339',
        storeName: '강남스퀘어점',
        latitude: 37.4982,
        longitude: 127.0276,
        service24h: true,
      }),
    );
  });

  it('error 값이 있으면 예외를 던진다', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ error: 1, count: 0, data: [] })));

    await expect(fetchEmart24Stores({ keyword: '강남' })).rejects.toThrow(
      '이마트24 매장 조회 실패: error=1',
    );
  });
});

describe('searchEmart24Products', () => {
  it('상품 검색 결과를 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          totalCnt: 1,
          productList: [
            {
              pluCd: '8800244010504',
              goodsNm: '두바이초콜릿',
              originPrice: 3500,
              viewPrice: 3000,
            },
          ],
        }),
      ),
    );

    const result = await searchEmart24Products({ keyword: '두바이' });

    expect(result.totalCount).toBe(1);
    expect(result.products[0].pluCd).toBe('8800244010504');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://everse.emart24.co.kr/stock/stock/search',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});

describe('searchEmart24StockByStores', () => {
  it('매장 코드가 비어 있으면 빈 결과를 반환한다', async () => {
    const result = await searchEmart24StockByStores({
      pluCd: '8800244010504',
      bizNos: ['  '],
    });

    expect(result.storeGoodsQty).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('매장별 재고 조회 결과를 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          storeGoodsInfo: { pluCd: '8800244010504', goodsNm: '두바이초콜릿' },
          storeGoodsQty: [{ BIZNO: '28339', BIZQTY: '3' }],
        }),
      ),
    );

    const result = await searchEmart24StockByStores({
      pluCd: '8800244010504',
      bizNos: ['28339'],
    });

    expect(result.storeGoodsQty).toHaveLength(1);
    expect(result.storeGoodsQty?.[0].BIZNO).toBe('28339');
  });
});

describe('fetchEmart24StoreDetail', () => {
  it('매장 상세를 반환한다', async () => {
    mockFetch.mockResolvedValue(
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

    const result = await fetchEmart24StoreDetail('28339');

    expect(result.storeInfo?.storeNm).toBe('강남스퀘어점');
  });
});

describe('calculateDistanceM', () => {
  it('동일 좌표는 0m를 반환한다', () => {
    expect(calculateDistanceM(37.5, 127.0, 37.5, 127.0)).toBe(0);
  });
});
