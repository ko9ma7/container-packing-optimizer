# GlobeHop V8 QA Report

Date: 2026-08-19

## V8 target

V7의 2D/3D 지도 동작을 유지하면서 세계 도시 탐험 데이터와 도시별 상세 정보를 대폭 확장했습니다.

## Automated checks

### Build
- `npm run build`: PASS

### JavaScript syntax
- `src/*.js`: PASS
- `src/modules/*.js`: PASS
- `public/sw.js`: PASS
- `scripts/*.mjs`: PASS

### Globe geometry verifier
- `npm run verify:globe`: PASS
- sphere winding: PASS
- route focus midpoint: PASS
- camera-facing route coordinates: PASS

### Legacy V7/V8 map verifier
- `npm run verify:v7`: PASS
- 3D texture persistent country-name text 제거: PASS
- responsive screen-space labels: PASS
- 3D programmatic zoom API: PASS
- 2D wheel/pinch/drag: PASS
- 2D pointer-anchored zoom: PASS
- drag accidental-click suppression: PASS
- UI +/- zoom controls: PASS
- build badge `V8.0`: PASS
- Service Worker cache `globehop-v8-city-explorer-20260819`: PASS

## Data validation

- country index: 232
- city index: 33,801
- city index covered country codes: 229
- city JSON parse: PASS
- bundled city index size: about 2.9 MB

Sample indexed city counts:

- South Korea: 147
- Japan: 1,300
- United States: 3,407
- France: 692
- Germany: 1,139
- United Kingdom: 865
- Italy: 660
- Spain: 735
- Thailand: 328
- Vietnam: 312

## V8 source-level feature checks

### Country → cities
- `getCountryCitySuggestions()` reads local city index
- population data is used as a primary sorting signal
- country screen displays up to 30 city choices by default
- selecting a city reuses the normal destination flow

### City location/details
- local GeoNames-derived city coordinates/timezone/population metadata
- Open-Meteo geocoding fallback/enrichment
- Wikipedia city page search and intro/image
- MediaWiki coordinate geosearch for nearby knowledge places
- Wikidata entity claims for structured city facts
- partial-source failure fallback

### Weather
- current temperature
- apparent temperature
- humidity
- precipitation/weather code
- wind speed/gust/direction
- cloud cover
- surface pressure
- visibility
- daily high/low
- precipitation probability
- sunrise/sunset

### Air quality
- U.S. AQI
- European AQI
- PM2.5
- PM10
- ozone
- nitrogen dioxide
- sulphur dioxide
- carbon monoxide
- dust
- UV index

### Derived city facts
- population density when population + area are both available
- distance to national capital
- local city time
- hemisphere

## Browser-render limitation

이 실행 컨테이너의 headless Chromium은 D-Bus/네트워크 환경 문제로 페이지 스크린샷 테스트가 제한 시간 내 완료되지 않았습니다. 또한 컨테이너의 일반 네트워크 DNS가 차단되어 런타임 외부 API 실호출을 직접 검증하지 못했습니다.

대신 Open-Meteo, MediaWiki, Wikidata의 공식 API 문서에 맞춰 요청 형식을 구성했고, 빌드·구문·데이터·기존 2D/3D 검증 스크립트를 모두 통과했습니다. 실제 GitHub Pages 배포 후에는 브라우저 DevTools의 Network 탭에서 외부 API 응답을 한 번 확인하는 것을 권장합니다.

## Deployment identity

- package version: `8.0.0`
- app badge: `V8.0`
- Service Worker cache: `globehop-v8-city-explorer-20260819`
