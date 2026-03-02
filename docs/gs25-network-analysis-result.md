# GS25 네트워크 분석 결과 (실측 기반)

작성일: 2026-03-03 (KST)  
실측 도구: Playwright MCP, curl  
대상:
- `https://gs25.gsretail.com/gscvs/ko/store-services/locations`
- `https://gs25.gsretail.com/gscvs/ko/store-services/woodongs`
- `https://gs25.gsretail.com/gscvs/ko/store-services/myrefrigerator`

## 결론 요약

- 주변 매장 조회: `가능` (웹 API 실측 성공)
- 재고 조회: `웹 기준 미확인` (우리동네GS 앱 기능으로 확인, 앱 트래픽 실측 필요)
- 구현 판정:
  - `gs25_find_nearby_stores`는 구현 가능
  - `gs25_check_inventory`는 앱 API 실측 전까지 보류

## 1) 매장 조회 API 실측 결과

GS25 매장검색 페이지의 실제 UI 조작으로 아래 API 3종을 확인했습니다.

### A. 시/도 -> 시/군/구 조회

- Endpoint: `GET /gscvs/ko/gsapi/gis/searchGungu`
- 실측 호출 URL:
  - `https://gs25.gsretail.com/gscvs/ko/gsapi/gis/searchGungu?&stb1=11&_=...`
- 요청 파라미터:
  - `stb1`: 시/도 코드 (`11` = 서울시)
- 응답 형식: JSON
- 응답 예시:
  - `{"result":[["1168","강남구"],...],"resultCode":"00000"}`

### B. 시/군/구 -> 동 조회

- Endpoint: `GET /gscvs/ko/gsapi/gis/searchDong`
- 실측 호출 URL:
  - `https://gs25.gsretail.com/gscvs/ko/gsapi/gis/searchDong?&stb1=11&stb2=1168&_=...`
- 요청 파라미터:
  - `stb1`: 시/도 코드 (`11`)
  - `stb2`: 구/군 코드 (`1168` = 강남구)
- 응답 형식: JSON
- 응답 예시:
  - `{"result":[["11680101","역삼동"],...],"resultCode":"00000"}`

### C. 매장 목록 조회

- Endpoint: `POST /gscvs/ko/store-services/locationList`
- 실측 호출 URL:
  - `https://gs25.gsretail.com/gscvs/ko/store-services/locationList?CSRFToken=...`
- 요청 방식:
  - `application/x-www-form-urlencoded`
  - 지역/매장명/서비스 필터를 form 필드로 전송
- 응답 형식:
  - 본문이 JSON 문자열 형태로 내려오며, 프론트에서 `JSON.parse(result)`로 파싱
- 응답 핵심 필드:
  - `results[].shopCode`
  - `results[].shopName`
  - `results[].address`
  - `results[].offeringService[]`
  - `results[].longs` (위도값으로 내려옴)
  - `results[].lat` (경도값으로 내려옴)
  - `pagination.totalNumberOfResults`

## 2) 실측 증거

Playwright 실측에서 아래 요청/응답을 확인했습니다.

- `GET /gscvs/ko/gsapi/gis/searchGungu` -> `200`, `강남구` 포함
- `GET /gscvs/ko/gsapi/gis/searchDong` -> `200`, `역삼동` 포함
- `POST /gscvs/ko/store-services/locationList?CSRFToken=...` -> `200`, `results[]` 다수 매장 반환

매장 목록 응답에서 `GS25강남...` 점포들과 `shopCode`, `address`, `offeringService`가 실제 포함됨을 확인했습니다.

## 3) 요청 파라미터 구조 (실측 기반)

`locationList` 주요 파라미터:

- `pageNum`, `pageSize`
- `searchShopName`
- `searchSido`, `searchGugun`, `searchDong`
- 서비스 필터:
  - `searchTypeToto`
  - `searchTypeCafe25`
  - `searchTypeInstant`
  - `searchTypeDrug`
  - `searchTypeSelf25`
  - `searchTypePost`
  - `searchTypeATM`
  - `searchTypeWithdrawal`
  - `searchTypeTaxrefund`
  - `searchTypeSmartAtm`
  - `searchTypeSelfCookingUtensils`
  - `searchTypeDeliveryService`
  - `searchTypeParcelService`
  - `searchTypePotatoes`
  - `searchTypeCardiacDefi`
  - `searchTypeFishShapedBun`
  - `searchTypeWine25`
  - `searchTypeGoPizza`
  - `searchTypeSpiritWine`
  - `searchTypeFreshGanghw`
  - `searchTypeMusinsa`
  - `searchTypePosa`

## 4) 재고 조회 실측 결과

### 웹 채널 관찰

- `woodongs` 페이지는 재고찾기 기능을 소개하지만, 실측 리소스에서 재고 API 호출은 관찰되지 않음
- 페이지 내 링크는 우리동네GS 앱 설치로 연결
  - `https://apps.apple.com/kr/app/id426644449`
  - `https://play.google.com/store/apps/details?id=com.gsr.gs25`
- `myrefrigerator` URL은 웹에서 에러 페이지 응답

### 웹 추가 점검 (2026-03-03 추가)

- 상품 페이지 API 실측:
  - `POST /gscvs/ko/products/event-goods-search?CSRFToken=...`
  - `POST /products/youus-main-search?CSRFToken=...`
- 두 API 모두 브라우저 실측 응답은 정상(200)이며 상품 정보는 제공함
  - 확인 필드 예시: `goodsNm`, `price`, `eventTypeSp`, `goodsStatNm`, `attFileNm`
- 그러나 매장 단위 재고/수량 필드는 확인되지 않음
  - 미확인 필드 예시: `storeCode`, `storeName`, `inventoryQty`, `remainQty`
- 비브라우저 직접 재현 시(`curl`, 별도 HTTP 클라이언트) `403/에러 페이지`가 발생하는 케이스가 있어
  웹 상품 API는 세션/CSRF/실행 컨텍스트 제약이 있는 것으로 보임

### 판정

- GS25 재고조회는 현재 웹보다 우리동네GS 앱 채널 중심 기능으로 보임
- `gs25_check_inventory` 구현을 위해 앱 트래픽 실측이 선행되어야 함

## 5) 구현 권장안

### 즉시 구현 가능

- `gs25_find_nearby_stores`
  - 데이터 소스: `searchGungu`, `searchDong`, `locationList`
  - 구현 방식:
    - 지역 코드 -> 매장 목록 조회
    - 사용자 현재 좌표와 각 매장 좌표 거리 계산으로 근접순 정렬
  - 참고:
    - 응답의 `longs/lat` 필드가 일반적인 명칭과 반대로 사용되므로 정규화 필요

### 실측 후 구현

- `gs25_check_inventory`
  - 선행 조건: 우리동네GS 앱 재고조회 API 실측(엔드포인트, 인증, 요청 스키마)

## 6) 다음 실측 작업

1. Android/iOS 우리동네GS 앱에서 재고조회 시나리오 네트워크 캡처
2. 재고 API 엔드포인트 및 인증 헤더/토큰 요구사항 확인
3. 비로그인/로그인 상태 재현성 비교
4. Cloudflare Worker에서 재현 가능성 판정(A/B/C)
