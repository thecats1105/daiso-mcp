/**
 * CGV 클라이언트 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCgvMovies,
  fetchCgvTheaters,
  fetchCgvTimetable,
  toYyyymmdd,
} from '../../../src/services/cgv/client.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchCgvTheaters', () => {
  it('극장 목록을 정규화한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 0,
          statusMessage: '조회 되었습니다.',
          data: [
            {
              regnGrpCd: '01',
              regnGrpNm: '서울',
              siteList: [
                { siteNo: '0056', siteNm: '강남' },
                { siteNo: '0001', siteNm: '강변' },
              ],
            },
          ],
        }),
      ),
    );

    const result = await fetchCgvTheaters({ playDate: '20260304', regionCode: '01' });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ theaterCode: '0056', theaterName: '강남', regionCode: '01' });
  });

  it('403이면 Zyte fallback을 사용한다', async () => {
    const zyteBody = Buffer.from(
      JSON.stringify({
        statusCode: 0,
        statusMessage: '조회 되었습니다.',
        data: [
          {
            regnGrpCd: '01',
            regnGrpNm: '서울',
            siteList: [{ siteNo: '0056', siteNm: '강남' }],
          },
        ],
      }),
      'utf8',
    ).toString('base64');

    mockFetch
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 200,
            httpResponseBody: zyteBody,
          }),
        ),
      );

    const result = await fetchCgvTheaters({ zyteApiKey: 'test-key' });

    expect(result).toHaveLength(1);
    expect(result[0].theaterCode).toBe('0056');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('HTTP 에러를 처리한다', async () => {
    mockFetch.mockResolvedValue(new Response('fail', { status: 500 }));

    await expect(fetchCgvTheaters({})).rejects.toThrow('CGV API 호출 실패: 500');
  });

  it('JSON 파싱 실패를 처리한다', async () => {
    mockFetch.mockResolvedValue(new Response('<html>not-json</html>', { status: 200 }));

    await expect(fetchCgvTheaters({})).rejects.toThrow('not-json');
  });

  it('AbortError를 시간 초과 에러로 변환한다', async () => {
    mockFetch.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(fetchCgvTheaters({})).rejects.toThrow('CGV API 요청 시간 초과');
  });
});

describe('fetchCgvMovies', () => {
  it('영화 목록을 정규화한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 0,
          statusMessage: '조회 되었습니다.',
          data: [
            { movNo: '30000985', movNm: '테스트 영화', cratgClsNm: '전체관람가' },
            { movNo: '30000986', movNm: '테스트 영화2', cratgClsNm: null },
          ],
        }),
      ),
    );

    const result = await fetchCgvMovies({ playDate: '20260304', theaterCode: '0056' });

    expect(result).toHaveLength(2);
    expect(result[0].movieCode).toBe('30000985');
    expect(result[0].rating).toBe('전체관람가');
    expect(result[1].rating).toBeUndefined();
  });

  it('극장 코드가 없으면 극장 목록에서 첫 극장을 사용한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 0,
            statusMessage: '조회 되었습니다.',
            data: [
              { regnGrpCd: '01', siteList: [{ siteNo: '0056', siteNm: '강남' }] },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 0,
            statusMessage: '조회 되었습니다.',
            data: [{ movNo: '30000985', movNm: '테스트 영화' }],
          }),
        ),
      );

    const result = await fetchCgvMovies({ playDate: '20260304' });

    expect(result).toHaveLength(1);
    expect(result[0].movieCode).toBe('30000985');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('fetchCgvTimetable', () => {
  it('시간표를 정규화하고 시간 포맷을 변환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 0,
          statusMessage: '조회 되었습니다.',
          data: [
            {
              siteNo: '0056',
              siteNm: 'CGV 강남',
              scnYmd: '20260304',
              scnSseq: '2',
              movNo: '30000985',
              movNm: '테스트 영화',
              scnsrtTm: '1230',
              scnendTm: '1443',
              stcnt: '123',
              frSeatCnt: '118',
            },
          ],
        }),
      ),
    );

    const result = await fetchCgvTimetable({
      playDate: '20260304',
      theaterCode: '0056',
      movieCode: '30000985',
    });

    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBe('12:30');
    expect(result[0].endTime).toBe('14:43');
    expect(result[0].totalSeats).toBe(123);
    expect(result[0].remainingSeats).toBe(118);
  });

  it('movieCode가 없으면 영화 목록에서 첫 영화를 사용한다', async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 0,
            statusMessage: '조회 되었습니다.',
            data: [{ movNo: '30000985', movNm: '테스트 영화' }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 0,
            statusMessage: '조회 되었습니다.',
            data: [
              {
                siteNo: '0056',
                siteNm: 'CGV 강남',
                scnYmd: '20260304',
                scnSseq: '2',
                movNo: '30000985',
                movNm: '테스트 영화',
                scnsrtTm: '1230',
                scnendTm: '1443',
                stcnt: '123',
                frtmpSeatCnt: '99',
              },
            ],
          }),
        ),
      );

    const result = await fetchCgvTimetable({ playDate: '20260304', theaterCode: '0056' });

    expect(result).toHaveLength(1);
    expect(result[0].remainingSeats).toBe(99);
  });

  it('Zyte 응답이 실패 상태면 에러를 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            title: 'Bad Request',
            detail: 'zyte fail',
          }),
          { status: 400 },
        ),
      );

    await expect(fetchCgvTheaters({ zyteApiKey: 'test-key' })).rejects.toThrow(
      'Zyte API 호출 실패: 400 zyte fail',
    );
  });

  it('Zyte 응답 본문이 비어 있으면 에러를 반환한다', async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            statusCode: 200,
          }),
          { status: 200 },
        ),
      );

    await expect(fetchCgvTheaters({ zyteApiKey: 'test-key' })).rejects.toThrow(
      'Zyte HTTP 응답 본문이 비어 있습니다.',
    );
  });

  it('Zyte API 키가 비어 있으면 에러를 반환한다', async () => {
    const original = process.env.ZYTE_API_KEY;
    process.env.ZYTE_API_KEY = '';

    mockFetch.mockResolvedValue(new Response('forbidden', { status: 403 }));

    await expect(fetchCgvTheaters({ zyteApiKey: '   ' })).rejects.toThrow(
      'ZYTE_API_KEY가 설정되지 않았습니다.',
    );

    process.env.ZYTE_API_KEY = original;
  });

});

describe('toYyyymmdd', () => {
  it('Date를 YYYYMMDD로 변환한다', () => {
    const value = toYyyymmdd(new Date('2026-03-04T00:00:00.000Z'));
    expect(value).toBe('20260304');
  });
});
