/**
 * CU 주변 매장 탐색 도구 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFindNearbyStoresTool } from '../../../../src/services/cu/tools/findNearbyStores.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createFindNearbyStoresTool', () => {
  it('올바른 도구 정의를 반환한다', () => {
    const tool = createFindNearbyStoresTool();

    expect(tool.name).toBe('cu_find_nearby_stores');
    expect(tool.metadata.title).toBe('CU 주변 매장 탐색');
  });

  it('CU 매장 목록을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          totalCnt: 2,
          storeList: [
            {
              storeCd: '1',
              storeNm: '강남점',
              latVal: 37.5,
              longVal: 127.0,
              distance: 100,
              stock: '5',
              deliveryYn: 'Y',
              jumpoPickYn: 'N',
              reserveYn: 'N',
            },
            {
              storeCd: '2',
              storeNm: '역삼점',
              latVal: 37.49,
              longVal: 127.02,
              distance: 200,
              stock: '3',
              deliveryYn: 'N',
              jumpoPickYn: 'Y',
              reserveYn: 'N',
            },
          ],
        }),
      ),
    );

    const tool = createFindNearbyStoresTool();
    const result = await tool.handler({ keyword: '강남', limit: 1 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.totalCount).toBe(2);
    expect(parsed.count).toBe(1);
    expect(parsed.stores[0].storeCode).toBe('1');
  });
});
