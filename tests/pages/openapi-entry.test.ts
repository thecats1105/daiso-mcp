/**
 * OpenAPI 엔트리 파일 테스트
 */

import { describe, expect, it } from 'vitest';
import {
  __testOnlyJsonToYaml,
  createOpenApiJsonResponse,
  createOpenApiYamlResponse,
  generateOpenApiSpec,
} from '../../src/pages/openapi.js';

describe('openapi entry exports', () => {
  it('엔트리 export가 정상 동작한다', () => {
    expect(typeof generateOpenApiSpec).toBe('function');
    expect(typeof createOpenApiJsonResponse).toBe('function');
    expect(typeof createOpenApiYamlResponse).toBe('function');
    expect(typeof __testOnlyJsonToYaml).toBe('function');
  });
});
