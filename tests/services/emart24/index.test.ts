/**
 * 이마트24 서비스 테스트
 */

import { describe, expect, it } from 'vitest';
import { createEmart24Service } from '../../../src/services/emart24/index.js';

describe('createEmart24Service', () => {
  it('ServiceProvider 인터페이스를 구현한 객체를 반환한다', () => {
    const service = createEmart24Service();

    expect(service.metadata).toBeDefined();
    expect(service.getTools).toBeDefined();
    expect(typeof service.getTools).toBe('function');
  });

  it('올바른 메타데이터를 가진다', () => {
    const service = createEmart24Service();

    expect(service.metadata.id).toBe('emart24');
    expect(service.metadata.name).toBe('이마트24');
    expect(service.metadata.version).toBe('1.0.0');
  });

  it('3개의 도구를 반환한다', () => {
    const service = createEmart24Service();
    const tools = service.getTools();

    expect(tools).toHaveLength(3);
    expect(tools.map((tool) => tool.name)).toEqual([
      'emart24_find_nearby_stores',
      'emart24_search_products',
      'emart24_check_inventory',
    ]);
  });
});
