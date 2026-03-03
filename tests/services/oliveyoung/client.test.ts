/**
 * 올리브영 클라이언트 테스트
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchOliveyoungStores,
  fetchOliveyoungProducts,
} from '../../../src/services/oliveyoung/client.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.ZYTE_API_KEY;
});

function createZyteResponse(body: unknown, status = 200) {
  const encoded = Buffer.from(JSON.stringify(body), 'utf8').toString('base64');
  return new Response(
    JSON.stringify({
      statusCode: status,
      httpResponseBody: encoded,
    }),
    { status }
  );
}

describe('fetchOliveyoungStores', () => {
  it('매장 목록을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: {
          totalCount: 1,
          storeList: [
            {
              storeCode: 'D1',
              storeName: '올리브영 A',
              address: '서울',
              latitude: 37.5,
              longitude: 127.0,
              pickupYn: true,
              o2oRemainQuantity: 2,
            },
          ],
        },
      })
    );

    const result = await fetchOliveyoungStores(
      { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
      { apiKey: 'test-key' }
    );

    expect(result.totalCount).toBe(1);
    expect(result.stores[0].pickupYn).toBe(true);
  });

  it('환경 변수 API 키를 사용한다', async () => {
    process.env.ZYTE_API_KEY = 'env-key';
    mockFetch.mockResolvedValue(createZyteResponse({ status: 'SUCCESS', data: { totalCount: 0, storeList: [] } }));

    await fetchOliveyoungStores({ latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.zyte.com/v1/extract',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
  });

  it('API 키가 없으면 에러를 던진다', async () => {
    await expect(
      fetchOliveyoungStores({ latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' })
    ).rejects.toThrow('ZYTE_API_KEY가 설정되지 않았습니다. .env 또는 Cloudflare Worker Secret을 확인해주세요.');
  });

  it('Zyte HTTP 에러를 처리한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'bad request' }), { status: 400 })
    );

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('Zyte API 호출 실패: 400 bad request');
  });

  it('Zyte HTTP 에러에서 title 필드를 사용한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ title: 'bad title' }), { status: 401 })
    );

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('Zyte API 호출 실패: 401 bad title');
  });

  it('Zyte HTTP 에러에서 detail/title이 없으면 상태코드만 사용한다', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 403 }));

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('Zyte API 호출 실패: 403');
  });

  it('storeList가 없어도 기본값을 반환한다', async () => {
    mockFetch.mockResolvedValue(createZyteResponse({ status: 'SUCCESS', data: {} }));

    const result = await fetchOliveyoungStores(
      { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
      { apiKey: 'test-key' }
    );

    expect(result.totalCount).toBe(0);
    expect(result.stores).toEqual([]);
  });

  it('매장 필드가 비어있으면 기본값을 사용한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: {
          totalCount: 1,
          storeList: [{}],
        },
      })
    );

    const result = await fetchOliveyoungStores(
      { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
      { apiKey: 'test-key' }
    );

    expect(result.stores[0].storeCode).toBe('');
    expect(result.stores[0].storeName).toBe('');
  });

  it('올리브영 API 상태 오류를 처리한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({ status: 'FAIL', data: {} })
    );

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('올리브영 API 상태 오류: FAIL');
  });

  it('AbortError를 시간 초과 에러로 변환한다', async () => {
    mockFetch.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('올리브영 API 요청 시간 초과');
  });

  it('타임아웃 콜백이 실행되면 abort를 호출한다', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === 'function') {
        callback();
      }
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    mockFetch.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('올리브영 API 요청 시간 초과');
  });

  it('btoa가 없으면 Buffer 인코딩 경로를 사용한다', async () => {
    const originalBtoa = globalThis.btoa;
    vi.stubGlobal('btoa', undefined);
    mockFetch.mockResolvedValue(createZyteResponse({ status: 'SUCCESS', data: { totalCount: 0, storeList: [] } }));

    await fetchOliveyoungStores(
      { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
      { apiKey: 'test-key' }
    );

    globalThis.btoa = originalBtoa;
  });

  it('인코딩 수단이 없으면 에러를 던진다', async () => {
    const originalBtoa = globalThis.btoa;
    const originalBuffer = globalThis.Buffer;
    vi.stubGlobal('btoa', undefined);
    vi.stubGlobal('Buffer', undefined);

    await expect(
      fetchOliveyoungStores(
        { latitude: 37.5, longitude: 127.0, pageIdx: 1, searchWords: '' },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('Basic 인증 인코딩을 지원하지 않는 런타임입니다.');

    globalThis.btoa = originalBtoa;
    globalThis.Buffer = originalBuffer;
  });
});

describe('fetchOliveyoungProducts', () => {
  it('상품 목록을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: {
          totalCount: 1,
          nextPage: false,
          serachList: [
            {
              goodsNumber: 'A1',
              goodsName: '립밤',
              priceToPay: 5000,
              originalPrice: 7000,
              discountRate: 28,
              o2oStockFlag: true,
              o2oRemainQuantity: 3,
            },
          ],
        },
      })
    );

    const result = await fetchOliveyoungProducts(
      { keyword: '립밤', page: 1, size: 20, sort: '01', includeSoldOut: false },
      { apiKey: 'test-key' }
    );

    expect(result.totalCount).toBe(1);
    expect(result.products[0].goodsName).toBe('립밤');
  });

  it('searchList 대체 필드를 처리한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: {
          totalCount: 1,
          nextPage: true,
          searchList: [{ goodsNumber: 'A2', goodsName: '선크림' }],
        },
      })
    );

    const result = await fetchOliveyoungProducts(
      { keyword: '선크림', page: 1, size: 20, sort: '01', includeSoldOut: false },
      { apiKey: 'test-key' }
    );

    expect(result.nextPage).toBe(true);
    expect(result.products[0].goodsNumber).toBe('A2');
  });

  it('상품 필드가 비어있으면 기본값을 사용한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: {
          totalCount: 1,
          nextPage: false,
          serachList: [{}],
        },
      })
    );

    const result = await fetchOliveyoungProducts(
      { keyword: '선크림', page: 1, size: 20, sort: '01', includeSoldOut: false },
      { apiKey: 'test-key' }
    );

    expect(result.products[0].goodsNumber).toBe('');
    expect(result.products[0].priceToPay).toBe(0);
  });

  it('검색 리스트가 없으면 빈 배열을 반환한다', async () => {
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: { totalCount: 0, nextPage: false },
      })
    );

    const result = await fetchOliveyoungProducts(
      { keyword: '선크림', page: 1, size: 20, sort: '01', includeSoldOut: false },
      { apiKey: 'test-key' }
    );

    expect(result.products).toEqual([]);
  });

  it('httpResponseBody 누락 오류를 처리한다', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ statusCode: 200 })));

    await expect(
      fetchOliveyoungProducts(
        { keyword: '선크림', page: 1, size: 20, sort: '01', includeSoldOut: false },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('올리브영 API 응답 실패: 200');
  });

  it('statusCode가 없으면 unknown 오류를 반환한다', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ httpResponseBody: 'abc' }))
    );

    await expect(
      fetchOliveyoungProducts(
        { keyword: '선크림', page: 1, size: 20, sort: '01', includeSoldOut: false },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('올리브영 API 응답 실패: unknown');
  });

  it('status 필드가 없으면 UNKNOWN 오류를 반환한다', async () => {
    const encoded = Buffer.from(JSON.stringify({ data: {} }), 'utf8').toString('base64');
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 200,
          httpResponseBody: encoded,
        })
      )
    );

    await expect(
      fetchOliveyoungProducts(
        { keyword: '선크림', page: 1, size: 20, sort: '01', includeSoldOut: false },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('올리브영 API 상태 오류: UNKNOWN');
  });

  it('atob가 없으면 Buffer 디코딩 경로를 사용한다', async () => {
    const originalAtob = globalThis.atob;
    vi.stubGlobal('atob', undefined);
    mockFetch.mockResolvedValue(
      createZyteResponse({
        status: 'SUCCESS',
        data: { totalCount: 0, nextPage: false, serachList: [] },
      })
    );

    const result = await fetchOliveyoungProducts(
      { keyword: '테스트', page: 1, size: 20, sort: '01', includeSoldOut: false },
      { apiKey: 'test-key' }
    );

    expect(result.totalCount).toBe(0);
    globalThis.atob = originalAtob;
  });

  it('디코딩 수단이 없으면 에러를 던진다', async () => {
    const encodedBody = Buffer.from(
      JSON.stringify({
        status: 'SUCCESS',
        data: { totalCount: 0, nextPage: false, serachList: [] },
      }),
      'utf8'
    ).toString('base64');

    const originalAtob = globalThis.atob;
    const originalBuffer = globalThis.Buffer;
    vi.stubGlobal('atob', undefined);
    vi.stubGlobal('Buffer', undefined);

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        statusCode: 200,
        httpResponseBody: encodedBody,
      }),
    });

    await expect(
      fetchOliveyoungProducts(
        { keyword: '테스트', page: 1, size: 20, sort: '01', includeSoldOut: false },
        { apiKey: 'test-key' }
      )
    ).rejects.toThrow('Base64 디코딩을 지원하지 않는 런타임입니다.');

    globalThis.atob = originalAtob;
    globalThis.Buffer = originalBuffer;
  });
});
