/**
 * 메가박스 서비스 프로바이더
 */

import type { ServiceProvider } from '../../core/interfaces.js';
import type { ServiceMetadata, ToolRegistration } from '../../core/types.js';
import { createFindNearbyTheatersTool } from './tools/findNearbyTheaters.js';
import { createListNowShowingTool } from './tools/listNowShowing.js';
import { createGetRemainingSeatsTool } from './tools/getRemainingSeats.js';

const MEGABOX_METADATA: ServiceMetadata = {
  id: 'megabox',
  name: '메가박스',
  version: '1.0.0',
  description: '메가박스 주변 지점 탐색, 영화 목록 조회, 잔여 좌석 조회 서비스',
};

class MegaboxService implements ServiceProvider {
  readonly metadata = MEGABOX_METADATA;

  getTools(): ToolRegistration[] {
    return [
      createFindNearbyTheatersTool(),
      createListNowShowingTool(),
      createGetRemainingSeatsTool(),
    ];
  }
}

export function createMegaboxService(): ServiceProvider {
  return new MegaboxService();
}

export * from './types.js';
