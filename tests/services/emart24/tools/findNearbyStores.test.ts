/**
 * 이마트24 주변 매장 도구 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFindNearbyStoresTool } from '../../../../src/services/emart24/tools/findNearbyStores.js';

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

    expect(tool.name).toBe('emart24_find_nearby_stores');
    expect(tool.metadata.title).toBe('이마트24 주변 매장 탐색');
  });

  it('좌표 기준 거리순으로 매장을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 0,
          count: 2,
          data: [
            { CODE: '1', TITLE: '먼매장', LATITUDE: 37.52, LONGITUDE: 127.04 },
            { CODE: '2', TITLE: '가까운매장', LATITUDE: 37.5, LONGITUDE: 127.0 },
          ],
        }),
      ),
    );

    const tool = createFindNearbyStoresTool();
    const result = await tool.handler({ latitude: 37.5, longitude: 127.0, limit: 2 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(2);
    expect(parsed.stores[0].storeCode).toBe('2');
    expect(parsed.stores[0].distanceM).toBe(0);
  });
});
