/**
 * 메가박스 영화 목록 조회 도구 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListNowShowingTool } from '../../../../src/services/megabox/tools/listNowShowing.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createListNowShowingTool', () => {
  it('올바른 도구 정의를 반환한다', () => {
    const tool = createListNowShowingTool();

    expect(tool.name).toBe('megabox_list_now_showing');
    expect(tool.metadata.title).toBe('메가박스 영화 목록 조회');
  });

  it('영화/회차 목록을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          areaBrchList: [{ brchNo: '1372', brchNm: '강남' }],
          movieList: [{ movieNo: '25104500', movieNm: '테스트 영화', movieStatCdNm: '상영중' }],
          movieFormList: [
            {
              playSchdlNo: '2603041372011',
              movieNo: '25104500',
              movieNm: '테스트 영화',
              brchNo: '1372',
              brchNm: '강남',
              playDe: '20260304',
              playStartTime: '0930',
              playEndTime: '1120',
              restSeatCnt: 42,
              totSeatCnt: 100,
            },
          ],
        }),
      ),
    );

    const tool = createListNowShowingTool();
    const result = await tool.handler({ playDate: '20260304', theaterId: '1372' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.counts.movies).toBe(1);
    expect(parsed.counts.showtimes).toBe(1);
    expect(parsed.showtimes[0].startTime).toBe('09:30');
  });

  it('필터가 없으면 null로 반환한다', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ areaBrchList: [], movieList: [], movieFormList: [] })));

    const tool = createListNowShowingTool();
    const result = await tool.handler({ playDate: '20260304' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.filters.theaterId).toBeNull();
    expect(parsed.filters.movieId).toBeNull();
  });
});
