/**
 * 메가박스 주변 지점 탐색 도구 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFindNearbyTheatersTool } from '../../../../src/services/megabox/tools/findNearbyTheaters.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createFindNearbyTheatersTool', () => {
  it('올바른 도구 정의를 반환한다', () => {
    const tool = createFindNearbyTheatersTool();

    expect(tool.name).toBe('megabox_find_nearby_theaters');
    expect(tool.metadata.title).toBe('메가박스 주변 지점 탐색');
  });

  it('주변 지점을 거리순으로 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            areaBrchList: [
              { brchNo: '1372', brchNm: '강남' },
              { brchNo: '1350', brchNm: '코엑스' },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response('<dt>도로명주소</dt><dd>서울 강남구 강남대로 438</dd><a href="?lng=127.0264&lat=37.4982">지도</a>'),
      )
      .mockResolvedValueOnce(
        new Response('<dt>도로명주소</dt><dd>서울 강남구 봉은사로 524</dd><a href="?lng=127.0592&lat=37.5121">지도</a>'),
      );

    const tool = createFindNearbyTheatersTool();
    const result = await tool.handler({ latitude: 37.4982, longitude: 127.0264, limit: 2 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(2);
    expect(parsed.theaters[0].theaterId).toBe('1372');
    expect(parsed.theaters[0].distanceKm).toBe(0);
  });

  it('지점 정보 실패/좌표 누락 항목을 제외한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            areaBrchList: [
              { brchNo: '1', brchNm: 'A' },
              { brchNo: '2', brchNm: 'B' },
            ],
          })
        )
      )
      .mockResolvedValueOnce(new Response('<dt>주소</dt><dd>좌표없음</dd>'))
      .mockRejectedValueOnce(new Error('failed'));

    const tool = createFindNearbyTheatersTool();
    const result = await tool.handler({ latitude: 37.5, longitude: 127.0 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(0);
    expect(parsed.theaters).toHaveLength(0);
  });
});
