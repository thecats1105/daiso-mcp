/**
 * 메가박스 서비스 테스트
 */

import { describe, it, expect } from 'vitest';
import { createMegaboxService } from '../../../src/services/megabox/index.js';

describe('createMegaboxService', () => {
  it('ServiceProvider 인터페이스를 구현한 객체를 반환한다', () => {
    const service = createMegaboxService();

    expect(service.metadata).toBeDefined();
    expect(service.getTools).toBeDefined();
    expect(typeof service.getTools).toBe('function');
  });

  it('올바른 메타데이터를 가진다', () => {
    const service = createMegaboxService();

    expect(service.metadata.id).toBe('megabox');
    expect(service.metadata.name).toBe('메가박스');
    expect(service.metadata.version).toBe('1.0.0');
    expect(service.metadata.description).toBeDefined();
  });

  it('3개의 도구를 반환한다', () => {
    const service = createMegaboxService();
    const tools = service.getTools();

    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual([
      'megabox_find_nearby_theaters',
      'megabox_list_now_showing',
      'megabox_get_remaining_seats',
    ]);
  });
});
