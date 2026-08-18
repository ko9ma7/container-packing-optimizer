# Container Fit

컨테이너 **내측 규격**, 제품/장비의 **실치수**, 실제 출하 시의 **포장 후 외형**, 그리고 탱크·프레임 등의 **사용 가능한 내부 빈 공간**을 함께 계산하여 컨테이너 종류·수량·배치 좌표를 제안하는 브라우저 기반 적재 최적화 웹서비스입니다.

## Preview

20ft Standard, 40ft Standard, 40ft High Cube의 내측 규격을 기본 제공하며 사용자 규격을 추가할 수 있습니다. 제품 실치수와 포장 외형을 분리하여 관리하고, 우드 고정·우드 스키드·우드 크레이트·팔레트·철제 프레임·방수/진공 포장·사용자 지정 포장을 각각 적용할 수 있습니다.

상부 개방 탱크나 빈 프레임처럼 실제 사용 가능한 내부가 있으면 별도 L×W×H 공간으로 등록하여 작은 화물을 먼저 삽입한 뒤, 외부에 남은 포장 단위만 컨테이너에 배치합니다.

## Features

- 20STD / 40STD / 40HC 기본 내측 규격
- 사용자 컨테이너 내측 규격 및 문 개구 규격 추가
- 제품/장비 실치수 L×W×H와 실제 포장 후 외형 분리 관리
- 장비 직접 적재
- 우드 고정·블로킹
- 우드 스키드
- 우드 크레이트·박스
- 팔레트 적재
- 철제 프레임
- 방수·진공 포장
- 사용자 지정 포장
- 포장별 L/W/H 추가 치수 및 포장 자중 편집
- 실제 완성 포장 외형 직접 입력(override)
- **바닥 90° 회전 / 옆 눕힘 / 앞 눕힘을 독립 체크** (모두 안전 기본값 OFF)
- 상부 적재 가능 여부 및 최소 지지면적 조건
- 화물 간 간격 / 수직 적층 간격
- 문측 작업 여유 / 후면 여유 / 좌우 벽면 여유 / 천장 여유 / 바닥 받침 높이
- 측면 통로 예약 폭
- 문 개구 통과 여유
- 최대 적재 높이 제한
- 평균 바닥하중 경고값
- 상부 개방 탱크·프레임·빈 케이스의 내부 사용가능 공간 재활용
- 내부 공간 허용 중량 설정
- 컨테이너 수량 자동 선정 및 컨테이너별 배치
- **최적화 전략 자동 비교**: 대수 최소 / 40ft 중심+잔량 최소 / 20ft 중심 / 활용률 우선 / 40ft만 / 20ft만
- 자동 모드에서 동률이면 더 작은 총 컨테이너 용량과 높은 활용률을 우선
- 화물 표에서 **수량과 90°/옆 눕힘/앞 눕힘 조건을 즉시 수정**
- 계산 전 **입력 진단**: 특정 품목이 총 체적의 과반을 차지하거나, 세움 유지/중량 미입력으로 결과가 왜곡될 가능성을 사전 표시
- 화물 수정 모달에 **세움 / 눕힘 A / 눕힘 B 실제 L×W×H 미리보기** 제공
- 3D 등각 보기 / 평면 배치 보기
- 정확한 X/Y/Z 좌표와 배치 방향
- 컨테이너별 무게중심 X/Y/Z 계산
- 평균 바닥하중 계산 및 경고
- 내부 삽입 화물 리스트와 외부 점유 절감 체적 계산
- 프로젝트 JSON 저장/불러오기
- 확장 CSV 화물 불러오기
- 결과 JSON / CSV 좌표 다운로드
- **PDF 보고서 다운로드**
- **Excel XLSX 다운로드**
- **PNG 결과 이미지 다운로드**
- LocalStorage 자동 저장
- 메뉴 클릭 스크롤 + 현재 섹션 Active 표시
- 320 / 375 / 430 / 768 / 1024 / 1440px 반응형 대응
- GitHub Pages 자동 배포

## Tech Stack

- HTML5
- CSS3
- JavaScript ES Modules
- Canvas API (PNG/PDF 보고서)
- 자체 경량 XLSX ZIP 생성기
- Node.js 빌드/개발 서버 스크립트
- Browser LocalStorage

런타임 외부 라이브러리가 없어 GitHub Pages에서 정적으로 동작합니다.

## Project Structure

```text
/
├─ public/
│  ├─ favicon.svg
│  ├─ favicon-16x16.png
│  ├─ favicon-32x32.png
│  ├─ apple-touch-icon.png
│  ├─ icon-192.png
│  ├─ icon-512.png
│  ├─ og-image.png
│  ├─ manifest.webmanifest
│  ├─ robots.txt
│  ├─ sitemap.xml
│  ├─ 404.html
│  └─ .nojekyll
├─ examples/
│  └─ cad-layout-3-container-example.csv
├─ src/
│  ├─ app.js
│  ├─ defaults.js
│  ├─ packing.js
│  └─ styles.css
├─ scripts/
│  ├─ build.mjs
│  ├─ dev-server.mjs
│  └─ preview-server.mjs
├─ .github/workflows/deploy.yml
├─ index.html
├─ package.json
└─ README.md
```

## Local Development

```bash
npm install
npm run dev
```

개발 주소는 `http://localhost:5173/` 입니다.

## Build

```bash
npm run build
```

빌드 결과는 `dist/`에 생성됩니다. 내부 자원은 상대 경로를 사용하므로 GitHub Pages의 `https://USERNAME.github.io/REPOSITORY/` 하위 경로에서도 동작합니다.

## Preview Build

```bash
npm run preview
```

기본 주소는 `http://localhost:4173/` 입니다.

## GitHub Pages Deployment

### 권장: GitHub Actions

1. 새 GitHub Repository를 생성합니다.
2. 이 프로젝트 전체를 저장소에 push 합니다.
3. 저장소 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 선택합니다.
4. `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 `npm ci → npm run build → deploy-pages` 순서로 자동 배포합니다.
5. 배포 완료 후 Pages URL을 그대로 공유하면 됩니다.

### Deploy from a branch를 사용하는 경우

`Deploy from a branch / (root)`를 선택해도 `manifest.webmanifest`, favicon, 404 등 핵심 정적 파일이 404가 나지 않도록 동일 자산을 저장소 루트에도 포함했습니다. 다만 빌드 결과와 소스가 섞이지 않도록 **GitHub Actions 방식이 권장**됩니다.

## Configuration

기본 컨테이너, 예제 화물, 포장 방식 시작값은 `src/defaults.js`에서 관리합니다.

포장 방식의 추가 치수와 자중은 **설계/제작 표준값이 아니라 입력을 빠르게 시작하기 위한 기본값**입니다. 실제 출하 계산에서는 포장 도면, 제작업체 확정 치수 또는 현장 측정값으로 수정하세요. 실제 완성 포장 규격이 확정된 경우 화물 편집 화면의 **완성 포장 외형 직접 입력**을 사용하는 것이 가장 정확합니다.

CSV 화물 양식은 웹서비스의 **CSV 양식** 버튼에서 다운로드할 수 있습니다.

### 수량·눕힘 입력에서 자주 생기는 오류

- `quantity`는 **포장 단위 개수**입니다. `35`를 `3`으로 바꾸려는 경우 화물 표의 수량 칸에서 바로 수정할 수 있습니다.
- `rotation=upright`는 **입력한 H를 항상 높이로 유지**하므로 눕혀 적재하지 않습니다.
- 눕혀 적재할 수 있는 품목은 `rotation=free` 또는 화면의 **자동 최적(눕힘 포함)**을 선택하세요. 6개 축 방향을 모두 비교합니다.
- 특정 방향으로만 눕혀야 하면 `layWidth` 또는 `layLength`를 선택할 수 있습니다.
- CSV의 중량이 비어 있으면 0 kg으로 취급합니다. 공간/대수 계산은 가능하지만 총중량·CG·바닥하중은 실제 중량 입력 전까지 참고값입니다.

첨부 CAD 사례의 핵심은 `4단 수세 35 → 3 Set` 수정뿐 아니라 **1단 수세를 눕혀 상부 공간에 배치하는지 여부**입니다. v1.3부터는 위험한 자동 눕힘을 없애고 `90°`, `옆 눕힘`, `앞 눕힘`을 각각 명시적으로 켭니다. 또한 CAD처럼 다른 장비 위에 1단 수세를 올리는 배치는 `다른 화물 위에 올릴 수 있음`(상부 화물)과 `이 화물 위에 다른 화물 적재 가능`(하부 화물)을 모두 켠 경우에만 계산합니다. 아무 옵션도 켜지 않으면 모든 화물은 입력 방향 그대로 바닥 배치를 우선하므로 안전하지만 CAD보다 컨테이너가 더 많이 필요할 수 있습니다.

`examples/cad-layout-v5-orientation-example.csv`는 수량을 바로잡고 **1단 수세의 앞 눕힘만 명시적으로 허용**한 비교용 입력입니다. 상부 적재 허용은 실제 장비 강도/고정 구조 확인이 필요하므로 예제에서도 기본 OFF입니다. 기본 컨테이너 후보를 모두 허용하고 `자동 추천` 또는 `40ft 중심 + 잔량 최적`을 사용하면 같은 대수일 때 40STD 3대보다 **40STD 2대 + 20STD 1대처럼 작은 잔량 컨테이너를 우선**합니다.

## Packing Model

현재 엔진은 축 정렬(orthogonal) 직육면체를 대상으로 하는 휴리스틱입니다. 다음 요소를 계산합니다.

- 컨테이너 내측 L×W×H와 최대 적재중량
- 문 개구부 폭·높이와 통과 여유
- 제품 실치수 → 포장 후 외형 변환
- 포장 자중의 총 적재중량 반영
- **바닥 90° 회전 / 옆 눕힘 / 앞 눕힘을 독립 체크** (모두 안전 기본값 OFF)
- 화물 간 최소 간격과 수직 간격
- 문측·후면·측벽·천장·바닥 여유
- 작업 통로 예약
- **위에 올라갈 수 있는지 / 위에서 지지할 수 있는지를 별도 지정**, 최대 적층 단수와 최소 지지면적
- 화물 내부 사용가능 L×W×H 공간 및 내부 최대중량
- 내부 삽입 화물 중량을 상위 화물 및 컨테이너 중량에 합산
- 컨테이너별 무게중심
- 평균 바닥하중 및 사용자 경고값

내부 공간 활용은 탱크·프레임의 내측 공간을 작은 별도 Bin으로 계산해 작은 포장 단위를 우선 배치한 뒤, 외부에 남은 포장 단위만 컨테이너 최적화에 넘기는 방식입니다.

## Export

계산 완료 후 다음 형식으로 저장할 수 있습니다.

- `container-fit-report.pdf` — 요약 + 컨테이너별 A4 이미지 보고서
- `container-fit-result.xlsx` — Summary / Cargo / Placement / Nested / Unpacked 시트
- `container-fit-report.png` — 요약 + 배치 이미지
- `container-fit-placement.csv` — 컨테이너별 좌표 데이터
- `container-fit-result.json` — 계산 결과 원본
- `container-fit-project.json` — 입력 프로젝트 저장/복원

## Practical Safety Note

이 서비스는 선적 계획과 견적을 돕는 계산 도구입니다. 실제 출하 전에는 다음을 별도 검토해야 합니다.

- 라싱 포인트 및 라싱 강도
- 우드/철제 고정재 강도
- 집중하중 및 바닥 점하중
- 실제 반입 중 회전 경로
- 포크/크레인 진입 방향
- 제품별 허용 상부하중
- 위험물·격리·통관 조건
- 선사 및 현장 작업 기준

## Custom Domain

GitHub Pages의 Custom domain 설정에서 도메인을 연결한 뒤 HTTPS를 활성화하세요. 필요하면 `public/CNAME`에 도메인 한 줄을 추가할 수 있습니다.

## License

사내·개인 프로젝트에 맞게 수정해서 사용할 수 있습니다. 외부 공개 배포 시 조직 정책에 맞는 LICENSE 파일을 추가하세요.

## v1.4 / CAD 적층 반영 개선

- 화물 목록에서 `방향전환`, `눕힘`, `위 적층`, `받침`을 즉시 체크할 수 있습니다.
- 체크하지 않은 기능은 계산기가 임의로 사용하지 않습니다.
- `위 적층` 화물은 `받침`이 허용된 화물의 상부 빈 공간을 먼저 탐색하는 CAD형 적층 휴리스틱을 추가했습니다.
- 큰 받침 화물을 먼저 배치하고 작은 적층 화물을 후순위로 배치하는 탐색 순서를 추가했습니다.
- High Cube가 필요하지 않은 경우 `40ft Standard + 20ft Standard` 후보 풀을 별도로 계산하여 같은 대수라면 더 작은 총 컨테이너 용량을 우선합니다.
- CSV v5 양식은 `allowRotate`, `allowLay`, `allowStackOn`, `allowSupport` 열을 지원합니다.
- 상세 수정 화면에서는 옆/앞 눕힘과 위 적층/받침 역할을 각각 더 세밀하게 지정할 수 있습니다.
