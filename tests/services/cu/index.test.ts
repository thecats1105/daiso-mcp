/**
 * CU 서비스 테스트
 */

import { describe, expect, it } from 'vitest';
import { createCuService } from '../../../src/services/cu/index.js';

describe('createCuService', () => {
  it('ServiceProvider 인터페이스를 구현한 객체를 반환한다', () => {
    const service = createCuService();

    expect(service.metadata).toBeDefined();
    expect(service.getTools).toBeDefined();
    expect(typeof service.getTools).toBe('function');
  });

  it('올바른 메타데이터를 가진다', () => {
    const service = createCuService();

    expect(service.metadata.id).toBe('cu');
    expect(service.metadata.name).toBe('CU 편의점');
    expect(service.metadata.version).toBe('1.0.0');
  });

  it('2개의 도구를 반환한다', () => {
    const service = createCuService();
    const tools = service.getTools();

    expect(tools).toHaveLength(2);
    expect(tools.map((tool) => tool.name)).toEqual(['cu_find_nearby_stores', 'cu_check_inventory']);
  });
});
