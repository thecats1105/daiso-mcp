/**
 * OpenAPI 컴포넌트 스키마 정의 (이마트24)
 */

export const OPENAPI_EMART24_COMPONENT_SCHEMAS = {
  Emart24Store: {
    type: 'object',
    properties: {
      storeCode: { type: 'string', example: '28339' },
      storeName: { type: 'string', example: '강남스퀘어점' },
      address: { type: 'string', example: '서울특별시 강남구 강남대로 396' },
      phone: { type: 'string', example: '02-000-0000' },
      latitude: { type: 'number', format: 'float', example: 37.4982 },
      longitude: { type: 'number', format: 'float', example: 127.0276 },
      service24h: { type: 'boolean', example: true },
      distanceM: { type: 'number', nullable: true, example: 120 },
    },
  },
  Emart24Product: {
    type: 'object',
    properties: {
      pluCd: { type: 'string', example: '8800244010504' },
      goodsName: { type: 'string', example: '두바이초콜릿' },
      originPrice: { type: 'integer', example: 3500 },
      viewPrice: { type: 'integer', example: 3000 },
      category: { type: 'string', example: '간식' },
      kind: { type: 'string', example: '초콜릿' },
    },
  },
  Emart24StoreSearchResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          stores: {
            type: 'array',
            items: { $ref: '#/components/schemas/Emart24Store' },
          },
        },
      },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
        },
      },
    },
  },
  Emart24ProductSearchResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: { $ref: '#/components/schemas/Emart24Product' },
          },
        },
      },
      meta: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
        },
      },
    },
  },
  Emart24InventoryResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          pluCd: { type: 'string', example: '8800244010504' },
          goodsInfo: { type: 'object' },
          stores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bizNo: { type: 'string', example: '28339' },
                bizQty: { type: 'integer', example: 3 },
                storeName: { type: 'string', example: '강남스퀘어점' },
                address: { type: 'string' },
                phone: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;
