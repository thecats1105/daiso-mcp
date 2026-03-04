/**
 * 앱 통합 테스트 - 메가박스 API
 */

import { describe, it, expect, vi } from 'vitest';
import app from '../../src/index.js';
import { setupFetchMock } from './testHelpers.js';

const mockFetch = vi.fn();
setupFetchMock(mockFetch);

describe('GET /api/megabox/theaters', () => {
  it('메가박스 주변 지점을 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ areaBrchList: [{ brchNo: '1372', brchNm: '강남' }] })),
      )
      .mockResolvedValueOnce(
        new Response('<dt>도로명주소</dt><dd>서울 강남구 강남대로</dd><a href="?lng=127.0&lat=37.5">지도</a>'),
      );

    const res = await app.request('/api/megabox/theaters?lat=37.5&lng=127.0');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.theaters)).toBe(true);
  });
});

describe('GET /api/megabox/movies', () => {
  it('메가박스 영화/회차 목록을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          areaBrchList: [{ brchNo: '1372', brchNm: '강남' }],
          movieList: [{ movieNo: '25104500', movieNm: '영화A' }],
          movieFormList: [
            {
              playSchdlNo: 'S1',
              movieNo: '25104500',
              movieNm: '영화A',
              brchNo: '1372',
              brchNm: '강남',
              playStartTime: '0930',
              playEndTime: '1120',
              restSeatCnt: 10,
              totSeatCnt: 100,
            },
          ],
        }),
      ),
    );

    const res = await app.request('/api/megabox/movies?playDate=20260304');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.movies).toHaveLength(1);
    expect(data.data.showtimes).toHaveLength(1);
  });
});

describe('GET /api/megabox/seats', () => {
  it('메가박스 잔여 좌석 목록을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          movieFormList: [
            {
              playSchdlNo: 'S1',
              movieNo: 'M1',
              movieNm: '영화A',
              brchNo: '1372',
              brchNm: '강남',
              playStartTime: '0930',
              playEndTime: '1120',
              restSeatCnt: 12,
              totSeatCnt: 100,
            },
          ],
        }),
      ),
    );

    const res = await app.request('/api/megabox/seats?playDate=20260304');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.seats).toHaveLength(1);
  });
});
