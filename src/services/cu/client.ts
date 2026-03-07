/**
 * CU API 클라이언트
 */

import { fetchJson } from '../../utils/http.js';
import { CU_API } from './api.js';
import type { CuStockItem, CuStockMainResponse, CuStore, CuStoreResponse } from './types.js';

interface RequestOptions {
  timeout?: number;
}

interface FetchCuStoresParams {
  latitude: number;
  longitude: number;
  searchWord?: string;
  itemCd?: string;
}

interface FetchCuStockParams {
  keyword: string;
  limit: number;
  offset: number;
  searchSort: string;
}

const CU_DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'X-Requested-With': 'XMLHttpRequest',
} as const;

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toYnBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    return normalized === 'Y' || normalized === 'TRUE';
  }

  return false;
}

function toStoreAddress(raw: {
  addrFst?: string | null;
  addrDetail?: string | null;
  doroStoreAddr1?: string | null;
  doroStoreAddr2?: string | null;
}): string {
  const road = [raw.doroStoreAddr1 || '', raw.doroStoreAddr2 || ''].join(' ').trim();
  if (road.length > 0) {
    return road;
  }

  return [raw.addrFst || '', raw.addrDetail || ''].join(' ').trim();
}

async function requestCuJson<T>(path: string, body: Record<string, unknown>, timeout = 15000): Promise<T> {
  return fetchJson<T>(`${CU_API.BASE_URL}${path}`, {
    method: 'POST',
    timeout,
    headers: CU_DEFAULT_HEADERS,
    body: JSON.stringify(body),
  });
}

function normalizeCuStore(raw: NonNullable<CuStoreResponse['storeList']>[number]): CuStore {
  return {
    storeCode: raw.storeCd || '',
    storeName: raw.storeNm || '',
    phone: raw.storeTelNo || '',
    address: toStoreAddress(raw),
    latitude: toNumber(raw.latVal),
    longitude: toNumber(raw.longVal),
    distanceM: toNumber(raw.distance),
    stock: toNumber(raw.stock),
    deliveryYn: toYnBoolean(raw.deliveryYn) || toYnBoolean(raw.deliveryPickYn),
    pickupYn: toYnBoolean(raw.jumpoPickYn),
    reserveYn: toYnBoolean(raw.reserveYn),
  };
}

/**
 * 좌표 기반 CU 점포 목록을 조회합니다.
 */
export async function fetchCuStores(
  params: FetchCuStoresParams,
  options: RequestOptions = {},
): Promise<{ totalCount: number; stores: CuStore[] }> {
  const { timeout = 15000 } = options;

  const payload = {
    latVal: String(params.latitude),
    longVal: String(params.longitude),
    baseLatVal: String(params.latitude),
    baseLongVal: String(params.longitude),
    tabId: '2',
    filterSvcList: [],
    filterAdtList: [],
    stockCdcYn: 'N',
    searchStock: false,
    pickupType: 'change',
    getRoute: 'IOS',
    areaTplNo: '0',
    childMealPickUpYn: 'N',
    isCurrentSearch: 'N',
    searchWord: params.searchWord || '',
    itemCd: params.itemCd || '',
    item_cd: params.itemCd || '',
    onItemNo: '',
  };

  const body = await requestCuJson<CuStoreResponse>(CU_API.STORE_PATH, payload, timeout);
  const stores = (body.storeList || []).map((store) => normalizeCuStore(store));

  return {
    totalCount: toNumber(body.totalCnt) || stores.length,
    stores,
  };
}

/**
 * 재고 검색 전 초기 화면 데이터를 조회합니다.
 * 정책 변경 시 사전 호출이 필요한 경우를 대비한 워밍업 요청입니다.
 */
export async function primeCuStockDisplay(options: RequestOptions = {}): Promise<void> {
  const { timeout = 15000 } = options;
  await requestCuJson(CU_API.STOCK_DISPLAY_PATH, {}, timeout);
}

/**
 * CU 상품 재고 검색 결과를 조회합니다.
 */
export async function fetchCuStock(
  params: FetchCuStockParams,
  options: RequestOptions = {},
): Promise<{ totalCount: number; spellModifyYn: string; items: CuStockItem[] }> {
  const { timeout = 15000 } = options;

  try {
    await primeCuStockDisplay({ timeout });
  } catch {
    // 사전 워밍업 실패는 본 검색으로 재시도합니다.
  }

  const payload = {
    searchWord: params.keyword,
    prevSearchWord: '',
    spellModifyUseYn: 'Y',
    offset: params.offset,
    limit: params.limit,
    searchSort: params.searchSort,
  };

  const body = await requestCuJson<CuStockMainResponse>(CU_API.STOCK_MAIN_PATH, payload, timeout);

  const result = body.data?.stockResult?.result;
  const rows = result?.rows || [];

  const items = rows
    .map((row) => row.fields)
    .filter((fields): fields is NonNullable<typeof fields> => Boolean(fields))
    .map((fields) => ({
      itemCode: fields.item_cd || '',
      itemName: fields.item_nm || '',
      price: toNumber(fields.hyun_maega),
      pickupYn: toYnBoolean(fields.pickup_yn),
      deliveryYn: toYnBoolean(fields.deliv_yn),
      reserveYn: toYnBoolean(fields.reserv_yn),
    }));

  return {
    totalCount: toNumber(result?.total_count) || items.length,
    spellModifyYn: body.spellModifyYn || 'N',
    items,
  };
}
