# 이마트24 앱 스크래핑 재현 가이드 (실측 기반)

작성일: 2026-03-08 (KST)  
기준 캡처: `captures/emart24-20260308/requests.jsonl`

## 1. 목적

이 문서는 이마트24 앱 실측 트래픽을 바탕으로,
상품 검색과 매장별 재고 조회를 `curl`로 재현하는 최소 절차를 제공합니다.

## 2. 핵심 엔드포인트

- 상품 검색: `POST /stock/stock/search`
- 상품별 재고 조회 준비: `POST /api/stock/v1/search/keyword`
- 상품 기본 재고 메타: `GET /api/stock/v1/stock/goods/{pluCd}`
- 매장별 재고 수량: `GET /api/stock/v2/stock-search/store`
- 매장 상세: `GET /api/stock/stock/store/{bizNo}`

베이스 URL:
- `https://everse.emart24.co.kr`

## 3. 공통 요청 조건

실측 기준 최소 헤더:
- `x-requested-with: XMLHttpRequest`

폼 요청(`POST`) 추가:
- `content-type: application/x-www-form-urlencoded; charset=UTF-8`

## 4. 재현 명령

### A. 상품 검색

```bash
curl -sS 'https://everse.emart24.co.kr/stock/stock/search' \
  -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \
  -H 'x-requested-with: XMLHttpRequest' \
  --data 'currentPage=1&pageCnt=10&sortType=SALE&saleProductYn=N&searchWord=%EB%91%90%EB%B0%94%EC%9D%B4' \
  | jq '{
      totalCnt,
      first: .productList[0] | {pluCd,goodsNm,originPrice,viewPrice}
    }'
```

기대 결과:
- `totalCnt` 양수
- `first.pluCd`, `first.goodsNm` 존재

### B. 상품별 재고 조회 준비 호출

```bash
curl -sS 'https://everse.emart24.co.kr/api/stock/v1/search/keyword' \
  -H 'content-type: application/x-www-form-urlencoded; charset=UTF-8' \
  -H 'x-requested-with: XMLHttpRequest' \
  --data 'pluCd=8800244010504&searchPage=STOCK_SEARCH_SERVICE' \
  -D - -o /tmp/emart24-v1-search-keyword.out | head -20
```

기대 결과:
- HTTP `200`
- 본문 길이 `0` (`Content-Length: 0`)일 수 있음

### C. 상품 기본 재고 메타

```bash
curl -sS 'https://everse.emart24.co.kr/api/stock/v1/stock/goods/8800244010504' \
  -H 'x-requested-with: XMLHttpRequest' \
  | jq '{msg, overCount, returnUrl}'
```

기대 결과:
- `msg: "success"`

### D. 매장별 재고 수량 조회

```bash
curl -sS 'https://everse.emart24.co.kr/api/stock/v2/stock-search/store?searchPluCode=8800244010504&bizNoArr=28339%2C05015%2C23233%2C29512%2C24437%2C29109%2C26137%2C29796%2C30200%2C28057%2C27928%2C29570%2C30162%2C28187%2C22579%2C00367%2C28967%2C00737' \
  -H 'x-requested-with: XMLHttpRequest' \
  | jq '{
      goods: .storeGoodsInfo | {pluCd,goodsNm,viewPrice},
      qtyCount: (.storeGoodsQty | length),
      qtySample: .storeGoodsQty[0]
    }'
```

기대 결과:
- `storeGoodsQty` 배열 존재
- `qtySample.BIZNO`, `qtySample.BIZQTY` 확인 가능

### E. 매장 상세 조회

```bash
curl -sS 'https://everse.emart24.co.kr/api/stock/stock/store/28339' \
  -H 'x-requested-with: XMLHttpRequest' \
  | jq '{
      storeNm: .storeInfo.storeNm,
      tel: .storeInfo.tel,
      storeAddr: .storeInfo.storeAddr,
      svr24: .storeInfo.svr24
    }'
```

기대 결과:
- `storeNm`, `storeAddr` 존재

## 5. 캡처 기반 분석 명령

```bash
# 총 요청 수
wc -l captures/emart24-20260308/requests.jsonl

# 상태 코드 분포
jq -r '.response.statusCode // "NA"' captures/emart24-20260308/requests.jsonl | sort | uniq -c

# 핵심 스톡 엔드포인트 추출
jq -r 'select(.request.path|test("^/api/stock|^/stock/stock/search")) | [.request.method,.request.path] | @tsv' \
  captures/emart24-20260308/requests.jsonl | sort | uniq -c | sort -nr
```

## 6. 구현 매핑 제안

- `emart24_search_products`
  - 소스: `POST /stock/stock/search`
  - 출력: `pluCd`, `goodsNm`, `originPrice/viewPrice`

- `emart24_check_inventory`
  - 소스:
    - `GET /api/stock/v2/stock-search/store` (매장별 수량)
    - `GET /api/stock/stock/store/{bizNo}` (매장 상세)
  - 조합 키: `BIZNO`(매장), `PLU_CD`(상품)

## 7. 실패 대응

1. `403/401` 발생
- 세션 의존 요청일 수 있으므로 앱 최신 캡처 기준으로 헤더/쿠키 재검증

2. `storeGoodsQty` 비어 있음
- `searchPluCode`와 `bizNoArr` 조합을 캡처값으로 다시 맞춰 재시도

3. DNS/네트워크 실패
- 실행 환경 네트워크 정책(샌드박스/사내망) 확인
