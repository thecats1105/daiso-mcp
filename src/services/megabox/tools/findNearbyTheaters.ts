/**
 * 메가박스 주변 지점 탐색 도구
 */

import * as z from 'zod';
import type { McpToolResponse, ToolRegistration } from '../../../core/types.js';
import { fetchMegaboxBookingList, fetchMegaboxTheaterInfo, toYyyymmdd } from '../client.js';

interface FindNearbyTheatersArgs {
  latitude?: number;
  longitude?: number;
  playDate?: string;
  areaCode?: string;
  limit?: number;
  timeoutMs?: number;
}

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

async function findNearbyTheaters(args: FindNearbyTheatersArgs): Promise<McpToolResponse> {
  const {
    latitude = 37.5665,
    longitude = 126.978,
    playDate = toYyyymmdd(),
    areaCode = '11',
    limit = 10,
    timeoutMs = 15000,
  } = args;

  const { theaters } = await fetchMegaboxBookingList({
    playDate,
    areaCode,
    timeout: timeoutMs,
  });

  const infoResults = await Promise.allSettled(
    theaters.map((theater) => fetchMegaboxTheaterInfo(theater.theaterId, timeoutMs)),
  );

  const merged = theaters
    .map((theater, index) => {
      const infoResult = infoResults[index];
      if (infoResult.status !== 'fulfilled') {
        return null;
      }

      const info = infoResult.value;
      if (info.latitude === null || info.longitude === null) {
        return null;
      }

      const distanceKm = calculateDistanceKm(latitude, longitude, info.latitude, info.longitude);

      return {
        theaterId: theater.theaterId,
        theaterName: theater.theaterName,
        address: info.address,
        latitude: info.latitude,
        longitude: info.longitude,
        distanceKm: Number(distanceKm.toFixed(2)),
      };
    })
    .filter((theater): theater is NonNullable<typeof theater> => theater !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  const result = {
    location: { latitude, longitude },
    playDate,
    areaCode,
    count: merged.length,
    theaters: merged,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
}

export function createFindNearbyTheatersTool(): ToolRegistration {
  return {
    name: 'megabox_find_nearby_theaters',
    metadata: {
      title: '메가박스 주변 지점 탐색',
      description: '사용자 좌표 기준으로 메가박스 지점을 거리순으로 조회합니다.',
      inputSchema: {
        latitude: z.number().optional().default(37.5665).describe('위도 (기본값: 서울 시청 37.5665)'),
        longitude: z.number().optional().default(126.978).describe('경도 (기본값: 서울 시청 126.978)'),
        playDate: z.string().optional().describe('조회 날짜(YYYYMMDD, 기본값: 오늘)'),
        areaCode: z.string().optional().default('11').describe('지역 코드 (기본값: 11, 서울)'),
        limit: z.number().optional().default(10).describe('반환할 최대 지점 수 (기본값: 10)'),
        timeoutMs: z.number().optional().default(15000).describe('요청 제한 시간(ms, 기본값: 15000)'),
      },
    },
    handler: findNearbyTheaters as (args: unknown) => Promise<McpToolResponse>,
  };
}
