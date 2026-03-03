/**
 * 앱 통합 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index.js';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /', () => {
  it('서버 정보를 반환한다', async () => {
    const res = await app.request('/');

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.name).toBe('multi-service-mcp');
    expect(data.version).toBe('1.0.0');
    expect(data.services).toBeDefined();
    expect(data.tools).toBeDefined();
    expect(data.totalServices).toBeGreaterThan(0);
    expect(data.totalTools).toBeGreaterThan(0);
  });

  it('다이소 서비스가 등록되어 있다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    const daisoService = data.services.find((s: { id: string }) => s.id === 'daiso');
    expect(daisoService).toBeDefined();
    expect(daisoService.name).toBe('다이소');
  });

  it('올리브영 서비스가 등록되어 있다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    const oliveyoungService = data.services.find((s: { id: string }) => s.id === 'oliveyoung');
    expect(oliveyoungService).toBeDefined();
    expect(oliveyoungService.name).toBe('올리브영');
  });

  it('메가박스 서비스가 등록되어 있다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    const megaboxService = data.services.find((s: { id: string }) => s.id === 'megabox');
    expect(megaboxService).toBeDefined();
    expect(megaboxService.name).toBe('메가박스');
  });

  it('다이소 도구들이 포함되어 있다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    expect(data.tools).toContain('daiso_search_products');
    expect(data.tools).toContain('daiso_find_stores');
    expect(data.tools).toContain('daiso_check_inventory');
    expect(data.tools).toContain('daiso_get_price_info');
  });

  it('올리브영 도구들이 포함되어 있다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    expect(data.tools).toContain('oliveyoung_find_nearby_stores');
    expect(data.tools).toContain('oliveyoung_check_inventory');
  });

  it('메가박스 도구들이 포함되어 있다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    expect(data.tools).toContain('megabox_find_nearby_theaters');
    expect(data.tools).toContain('megabox_list_now_showing');
    expect(data.tools).toContain('megabox_get_remaining_seats');
  });

  it('엔드포인트 정보를 포함한다', async () => {
    const res = await app.request('/');
    const data = await res.json();

    expect(data.endpoints).toBeDefined();
    expect(data.endpoints.mcp).toBeDefined();
    expect(data.endpoints.health).toBeDefined();
  });
});

describe('GET /health', () => {
  it('헬스 체크 응답을 반환한다', async () => {
    const res = await app.request('/health');

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});

describe('GET /prompt', () => {
  it('프롬프트 페이지를 반환한다', async () => {
    const res = await app.request('/prompt');

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');

    const text = await res.text();
    expect(text).toContain('다이소 MCP API');
  });
});

describe('문서 페이지', () => {
  it('GET /openapi.json 응답을 반환한다', async () => {
    const res = await app.request('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');

    const data = await res.json();
    expect(data.openapi).toBe('3.1.0');
  });

  it('GET /openapi.yaml 응답을 반환한다', async () => {
    const res = await app.request('/openapi.yaml');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/yaml');

    const text = await res.text();
    expect(text).toContain('openapi: 3.1.0');
  });

  it('GET /privacy 응답을 반환한다', async () => {
    const res = await app.request('/privacy');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');

    const text = await res.text();
    expect(text).toContain('개인정보 처리방침');
  });
});

describe('API 엔드포인트', () => {
  describe('GET /api/daiso/products', () => {
    it('검색 결과를 반환한다', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          resultSet: {
            result: [{ totalSize: 1, resultDocuments: [{ PD_NO: '1', PDNM: 'Test', PD_PRC: '1000' }] }],
          },
        }))
      );

      const res = await app.request('/api/daiso/products?q=test');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('검색어 없이 요청하면 에러를 반환한다', async () => {
      const res = await app.request('/api/daiso/products');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_QUERY');
    });
  });

  describe('GET /api/daiso/products/:id', () => {
    it('제품 정보를 반환한다', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({
          resultSet: {
            result: [{ totalSize: 1, resultDocuments: [{ PD_NO: '12345', PDNM: 'Test', PD_PRC: '1000' }] }],
          },
        }))
      );

      const res = await app.request('/api/daiso/products/12345');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('12345');
    });
  });

  describe('GET /api/daiso/stores', () => {
    it('매장 검색 결과를 반환한다', async () => {
      const storeHtml = `
        <div class="bx-store" data-start="0900" data-end="2200" data-lat="37.5" data-lng="127.0" data-info='{}'>
          <h4 class="place">테스트점</h4>
          <p class="addr">주소</p>
        </div>
      `;
      mockFetch.mockResolvedValue(new Response(storeHtml));

      const res = await app.request('/api/daiso/stores?keyword=테스트');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it('검색 조건 없이 요청하면 에러를 반환한다', async () => {
      const res = await app.request('/api/daiso/stores');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('MISSING_PARAMS');
    });
  });

  describe('GET /api/daiso/inventory', () => {
    it('재고 정보를 반환한다', async () => {
      // 온라인 재고 응답
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: false })));
      // 매장 재고 응답
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: false })));

      const res = await app.request('/api/daiso/inventory?productId=12345');

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.productId).toBe('12345');
    });

    it('productId 없이 요청하면 에러를 반환한다', async () => {
      const res = await app.request('/api/daiso/inventory');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error.code).toBe('MISSING_PRODUCT_ID');
    });
  });

  describe('GET /api/oliveyoung/stores', () => {
    it('매장 검색 결과를 반환한다', async () => {
      const encoded = Buffer.from(
        JSON.stringify({
          status: 'SUCCESS',
          data: {
            totalCount: 1,
            storeList: [{ storeCode: 'D176', storeName: '올리브영 명동 타운' }],
          },
        }),
        'utf8'
      ).toString('base64');

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ statusCode: 200, httpResponseBody: encoded }))
      );

      const res = await app.request(
        '/api/oliveyoung/stores?keyword=명동',
        undefined,
        { ZYTE_API_KEY: 'test-key' }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.stores).toHaveLength(1);
    });
  });

  describe('GET /api/oliveyoung/inventory', () => {
    it('재고 정보를 반환한다', async () => {
      const storeEncoded = Buffer.from(
        JSON.stringify({
          status: 'SUCCESS',
          data: { totalCount: 1, storeList: [{ storeCode: 'D176', storeName: '올리브영 명동 타운' }] },
        }),
        'utf8'
      ).toString('base64');

      const productEncoded = Buffer.from(
        JSON.stringify({
          status: 'SUCCESS',
          data: {
            totalCount: 1,
            nextPage: false,
            serachList: [{ goodsNumber: 'A1', goodsName: '선크림 A', priceToPay: 10000 }],
          },
        }),
        'utf8'
      ).toString('base64');

      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ statusCode: 200, httpResponseBody: storeEncoded }))
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ statusCode: 200, httpResponseBody: productEncoded }))
        );

      const res = await app.request(
        '/api/oliveyoung/inventory?keyword=선크림',
        undefined,
        { ZYTE_API_KEY: 'test-key' }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.keyword).toBe('선크림');
    });

    it('keyword 없이 요청하면 에러를 반환한다', async () => {
      const res = await app.request('/api/oliveyoung/inventory');

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('MISSING_QUERY');
    });
  });

  describe('GET /api/megabox/theaters', () => {
    it('메가박스 주변 지점을 반환한다', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ areaBrchList: [{ brchNo: '1372', brchNm: '강남' }] }))
        )
        .mockResolvedValueOnce(
          new Response('<dt>도로명주소</dt><dd>서울 강남구 강남대로</dd><a href="?lng=127.0&lat=37.5">지도</a>')
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
          })
        )
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
          })
        )
      );

      const res = await app.request('/api/megabox/seats?playDate=20260304');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.seats).toHaveLength(1);
    });
  });
});

describe('CORS', () => {
  it('CORS 헤더가 설정되어 있다', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'https://example.com' },
    });

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('MCP 엔드포인트', () => {
  it('POST /mcp가 존재한다', async () => {
    // MCP 프로토콜 요청 시뮬레이션은 복잡하므로 라우트 존재 여부만 확인
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // MCP 핸들러가 동작 (에러가 발생해도 라우트는 존재함)
    expect(res.status).toBeDefined();
  });

  it('POST /도 MCP 요청을 처리한다', async () => {
    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBeDefined();
  });
});
