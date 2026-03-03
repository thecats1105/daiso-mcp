/**
 * 메가박스 GET API 핸들러
 */

import type { Context } from 'hono';
import {
  fetchMegaboxBookingList,
  fetchMegaboxTheaterInfo,
  toYyyymmdd,
} from '../services/megabox/client.js';

interface AppBindings {
  ZYTE_API_KEY?: string;
}

type ApiContext = Context<{ Bindings: AppBindings }>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

function successResponse<T>(c: ApiContext, data: T, meta?: ApiResponse<T>['meta']) {
  return c.json<ApiResponse<T>>({
    success: true,
    data,
    meta,
  });
}

function errorResponse(c: ApiContext, code: string, message: string, status: 400 | 404 | 500 = 400) {
  return c.json<ApiResponse<never>>(
    {
      success: false,
      error: { code, message },
    },
    status
  );
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

/**
 * 메가박스 주변 지점 조회 API 핸들러
 * GET /api/megabox/theaters?lat={위도}&lng={경도}&playDate={YYYYMMDD}&areaCode={지역코드}
 */
export async function handleMegaboxFindNearbyTheaters(c: ApiContext) {
  const lat = parseFloat(c.req.query('lat') || '37.5665');
  const lng = parseFloat(c.req.query('lng') || '126.978');
  const playDate = c.req.query('playDate') || toYyyymmdd();
  const areaCode = c.req.query('areaCode') || '11';
  const limit = parseInt(c.req.query('limit') || '10');
  const timeoutMs = parseInt(c.req.query('timeoutMs') || '15000');

  try {
    const { theaters } = await fetchMegaboxBookingList({
      playDate,
      areaCode,
      timeout: timeoutMs,
    });

    const infoResults = await Promise.allSettled(
      theaters.map((theater) => fetchMegaboxTheaterInfo(theater.theaterId, timeoutMs))
    );

    const merged = theaters
      .map((theater, index) => {
        const infoResult = infoResults[index];
        if (infoResult.status !== 'fulfilled') {
          return null;
        }

        if (infoResult.value.latitude === null || infoResult.value.longitude === null) {
          return null;
        }

        const distanceKm = calculateDistanceKm(
          lat,
          lng,
          infoResult.value.latitude,
          infoResult.value.longitude
        );

        return {
          theaterId: theater.theaterId,
          theaterName: theater.theaterName,
          address: infoResult.value.address,
          latitude: infoResult.value.latitude,
          longitude: infoResult.value.longitude,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .filter((theater): theater is NonNullable<typeof theater> => theater !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return successResponse(
      c,
      {
        location: { latitude: lat, longitude: lng },
        playDate,
        areaCode,
        theaters: merged,
      },
      { total: merged.length, pageSize: limit }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return errorResponse(c, 'MEGABOX_THEATER_SEARCH_FAILED', message, 500);
  }
}

/**
 * 메가박스 영화/회차 목록 조회 API 핸들러
 * GET /api/megabox/movies?playDate={YYYYMMDD}&theaterId={지점ID}&movieId={영화ID}
 */
export async function handleMegaboxListNowShowing(c: ApiContext) {
  const playDate = c.req.query('playDate') || toYyyymmdd();
  const theaterId = c.req.query('theaterId') || undefined;
  const movieId = c.req.query('movieId') || undefined;
  const areaCode = c.req.query('areaCode') || '11';
  const timeoutMs = parseInt(c.req.query('timeoutMs') || '15000');

  try {
    const result = await fetchMegaboxBookingList({
      playDate,
      theaterId,
      movieId,
      areaCode,
      timeout: timeoutMs,
    });

    return successResponse(
      c,
      {
        playDate,
        filters: {
          theaterId: theaterId || null,
          movieId: movieId || null,
          areaCode,
        },
        theaters: result.theaters,
        movies: result.movies,
        showtimes: result.showtimes,
      },
      { total: result.showtimes.length }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return errorResponse(c, 'MEGABOX_MOVIE_LIST_FAILED', message, 500);
  }
}

/**
 * 메가박스 잔여 좌석 조회 API 핸들러
 * GET /api/megabox/seats?playDate={YYYYMMDD}&theaterId={지점ID}&movieId={영화ID}
 */
export async function handleMegaboxGetRemainingSeats(c: ApiContext) {
  const playDate = c.req.query('playDate') || toYyyymmdd();
  const theaterId = c.req.query('theaterId') || undefined;
  const movieId = c.req.query('movieId') || undefined;
  const areaCode = c.req.query('areaCode') || '11';
  const limit = parseInt(c.req.query('limit') || '50');
  const timeoutMs = parseInt(c.req.query('timeoutMs') || '15000');

  try {
    const { showtimes } = await fetchMegaboxBookingList({
      playDate,
      theaterId,
      movieId,
      areaCode,
      timeout: timeoutMs,
    });

    const seats = showtimes
      .filter((item) => (theaterId ? item.theaterId === theaterId : true))
      .filter((item) => (movieId ? item.movieId === movieId : true))
      .sort((a, b) => {
        if (a.startTime === b.startTime) {
          return a.theaterName.localeCompare(b.theaterName);
        }
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, limit);

    return successResponse(
      c,
      {
        playDate,
        filters: {
          theaterId: theaterId || null,
          movieId: movieId || null,
          areaCode,
        },
        seats,
      },
      { total: seats.length, pageSize: limit }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    return errorResponse(c, 'MEGABOX_SEAT_LIST_FAILED', message, 500);
  }
}
