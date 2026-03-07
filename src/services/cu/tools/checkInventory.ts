/**
 * CU 재고 확인 도구
 */

import * as z from 'zod';
import type { McpToolResponse, ToolRegistration } from '../../../core/types.js';
import { fetchCuStock, fetchCuStores } from '../client.js';

interface CheckInventoryArgs {
  keyword: string;
  latitude?: number;
  longitude?: number;
  storeKeyword?: string;
  size?: number;
  offset?: number;
  searchSort?: string;
  storeLimit?: number;
  timeoutMs?: number;
}

async function checkInventory(args: CheckInventoryArgs): Promise<McpToolResponse> {
  const {
    keyword,
    latitude = 37.5665,
    longitude = 126.978,
    storeKeyword = '',
    size = 20,
    offset = 0,
    searchSort = 'recom',
    storeLimit = 10,
    timeoutMs = 15000,
  } = args;

  if (!keyword || keyword.trim().length === 0) {
    throw new Error('상품 검색어(keyword)를 입력해주세요.');
  }

  const [storeResult, stockResult] = await Promise.all([
    fetchCuStores(
      {
        latitude,
        longitude,
        searchWord: storeKeyword,
      },
      {
        timeout: timeoutMs,
      },
    ),
    fetchCuStock(
      {
        keyword,
        limit: size,
        offset,
        searchSort,
      },
      {
        timeout: timeoutMs,
      },
    ),
  ]);

  const limitedStores = storeResult.stores.slice(0, storeLimit);

  const result = {
    keyword,
    searchOptions: {
      size,
      offset,
      searchSort,
      storeKeyword,
    },
    location: {
      latitude,
      longitude,
    },
    nearbyStores: {
      totalCount: storeResult.totalCount,
      count: limitedStores.length,
      stores: limitedStores,
    },
    inventory: {
      totalCount: stockResult.totalCount,
      count: stockResult.items.length,
      spellModifyYn: stockResult.spellModifyYn,
      items: stockResult.items,
    },
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export function createCheckInventoryTool(): ToolRegistration {
  return {
    name: 'cu_check_inventory',
    metadata: {
      title: 'CU 재고 확인',
      description: '상품 키워드로 CU 재고를 조회하고 주변 매장 정보를 함께 반환합니다.',
      inputSchema: {
        keyword: z.string().describe('재고를 확인할 상품 검색어 (예: 과자, 커피, 도시락)'),
        latitude: z.number().optional().default(37.5665).describe('위도 (기본값: 서울 시청 37.5665)'),
        longitude: z.number().optional().default(126.978).describe('경도 (기본값: 서울 시청 126.978)'),
        storeKeyword: z.string().optional().describe('주변 매장 필터 키워드 (예: 강남, 안산)'),
        size: z.number().optional().default(20).describe('재고 검색 결과 수 (기본값: 20)'),
        offset: z.number().optional().default(0).describe('재고 검색 시작 오프셋 (기본값: 0)'),
        searchSort: z.string().optional().default('recom').describe('재고 정렬 방식 (기본값: recom)'),
        storeLimit: z.number().optional().default(10).describe('반환할 주변 매장 최대 수 (기본값: 10)'),
        timeoutMs: z.number().optional().default(15000).describe('요청 제한 시간(ms, 기본값: 15000)'),
      },
    },
    handler: checkInventory as (args: unknown) => Promise<McpToolResponse>,
  };
}
