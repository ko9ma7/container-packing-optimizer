# Container Fit

컨테이너 **내측 규격**, 제품/장비의 **실치수**, 실제 출하 시의 **포장 후 외형**, 그리고 탱크·프레임 등의 **사용 가능한 내부 빈 공간**을 함께 계산하여 컨테이너 종류·수량·배치 좌표를 제안하는 브라우저 기반 적재 최적화 웹서비스입니다.

## Preview

20ft Standard, 40ft Standard, 40ft High Cube의 내측 규격을 기본 제공하며 사용자 규격을 추가할 수 있습니다. 제품 실치수와 포장 외형을 분리하여 관리하고, 우드 고정·우드 스키드·우드 크레이트·팔레트·철제 프레임·방수/진공 포장·사용자 지정 포장을 각각 적용할 수 있습니다.

상부 개방 탱크나 빈 프레임처럼 실제 사용 가능한 내부가 있으면 별도 L×W×H 공간으로 등록하여 작은 화물을 먼저 삽입한 뒤, 외부에 남은 포장 단위만 컨테이너에 배치합니다.

## Features

- 20STD / 40STD / 40HC 기본 내측 규격 및 사용자 컨테이너 규격 추가
- 제품/장비 실치수 L×W×H와 실제 포장 후 외형 분리 관리
- 포장 방식별 치수·자중 편집 및 실제 완성 포장 외형 직접 입력(override)
- **적재 방향 3단계**: 입력 방향 고정 / 세움 유지 방향전환 / 모든 방향 허용(눕힘 포함)
- **적층 역할 4단계**: 적층 안 함 / 위에 올릴 수 있음 / 받침으로 사용 가능 / 위·아래 모두 가능
- 작업 여유 공간 (도어, 후면, 벽면, 천장, 통로, 도어 개구부 통과 마진)
- 상부 개방 탱크·프레임·빈 케이스 내부 사용가능 공간(Nested Space) 재활용
- **블록 적재 최적화**: Web Worker 기반 비동기 계산 및 다중 컨테이너 선정
- **3D 인터랙티브 뷰어 (Orbit Control)**: 마우스 360° 드래그 회전, 휠 줌, 우클릭 팬, 시점 프리셋
- **적재 단계별 시뮬레이터 (Step-by-Step Sequence Player)**: 지게차 상차 순서 재생/일시정지/슬라이더 시연
- **검증 시각화 레이어**: 무게중심(C.G.) 구체 + ISO 1496 안전 영역, 바닥 하중 히트맵, 여유 공간 가이드 박스
- **물리 & 규정 안전성 정밀 검증 센터 (Safety & Compliance)**:
  - 종합 안전 점수(100점 만점) 및 판정 등급 (출하 적합/주의/위험)
  - 무게중심(C.G.) 전후(X축) / 좌우(Y축) 실시간 밸런스 게이지
  - ISO 1496 및 물류 표준 7대 핵심 안전 기준 검증표 (PASS/WARN/FAIL)
- **현장 상차 순서 지시서 (Loading Sequence Manifest)**: 현장 작업용 Step 1~N 순서표 및 지시서 인쇄
- **미적재 화물 정밀 진단 시스템**: 규격 초과/도어 진입 불가/중량 초과 등 구체적 사유 및 맞춤 해결 가이드 제공
- **보고서 및 데이터 내보내기**:
  - **PDF 보고서**: 종합 안전 점수, ISO 1496 C.G. 적합 판정, 3D/2D 배치도 인쇄
  - **Excel (XLSX)**: 요약, 안전검증 체크리스트, 상차 순서 지시서, 화물, 좌표, 내부적재 시트 포함
  - **PNG 이미지** 및 **CSV / JSON 원본 데이터**
- LocalStorage 자동 저장 및 반응형 대응

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
│  ├─ cad-layout-3-container-example.csv
│  ├─ nested-deck-project.json
│  └─ user-cad-block-v7.json
├─ src/
│  ├─ app.js
│  ├─ defaults.js
│  ├─ packing.js
│  ├─ packing-fast.js
│  ├─ packing-worker.js
│  ├─ viewer-3d.js
│  └─ styles.css
├─ scripts/
│  ├─ build.mjs
│  ├─ dev-server.mjs
│  ├─ preview-server.mjs
│  ├─ regression-nested-deck.mjs
│  └─ verify-all.mjs
├─ .github/workflows/deploy.yml
├─ index.html
├─ package.json
└─ README.md
```

## Verification & Testing

```bash
# 종합 정밀 검증 스위트 실행 (16개 핵심 검증 항목 자동 테스트)
npm test
# 또는
node scripts/verify-all.mjs
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

화물 목록 상단의 **CSV 저장**은 현재 화면에 등록된 화물·포장·회전·적층 설정을 그대로 CSV로 내보냅니다. 신규 접속은 빈 화물 목록으로 시작하며, **예제 불러오기**를 누르면 고정 자세·90° 회전·3축 회전·상부 적재·하중 지지·탱크 내부 삽입을 각각 확인할 수 있는 시험 데이터를 불러옵니다. **목록 비우기**는 컨테이너와 적재 조건을 유지한 채 화물만 삭제하고, **새 프로젝트**는 전체 작업을 빈 상태로 초기화합니다. 모든 다운로드 파일명에는 브라우저 현지시간 기준 `YYYY-MM-DD_HH-mm-ss` 저장 시각이 자동으로 붙습니다.

### 방향·적층 입력 방법

- `기본 자세 고정`: 입력한 L×W×H 자세만 사용합니다.
- `수직 유지 · 90° 회전`: 높이 H를 유지한 채 바닥면 L/W를 교환할 수 있습니다.
- `3축 회전 · 눕힘 허용`: 눕힘을 포함한 최대 6개 직교 자세를 자동 비교합니다. 실제 운송 자세 제한이 없는 품목에만 사용하세요.
- `적층 불가`: 다른 화물 위 적재와 하중 지지에 사용하지 않습니다.
- `상부 적재 가능`: 지지 가능한 하부 화물의 상부면에 배치할 수 있습니다.
- `하중 지지 가능`: 이 화물의 윗면을 다른 화물의 지지면으로 사용할 수 있습니다.
- `상·하 적층 가능`: 상부 적재와 하중 지지를 모두 허용합니다.

`도면 밀착 블록` 프리셋은 품목 사이의 블록 맞댐, 상부 간격 0 mm, 지지율 75%를 시작값으로 사용합니다. 사용자가 제공한 CAD 사례처럼 큰 장비를 하부 블록으로 만들고 1단 수세를 상부에 반복 배치할 때 적합합니다. 다만 실제 받침재/우드 프레임 구조가 75% 지지를 보장하는지 현장에서 확인해야 합니다.

`examples/user-cad-block-v7.json`은 사용자가 제공한 치수·수량을 기준으로 40HC를 후보에서 제외하고 `도면 밀착 블록` 조건을 적용한 회귀 테스트 사례입니다. `npm run test:cad`는 **40STD + 40STD + 20STD**, 마지막 20STD에 **1단 수세 2개**, 미적재 0개, 배치 검증 통과를 자동 확인합니다.

## Packing Model

현재 엔진은 축 정렬(orthogonal) 직육면체를 대상으로 하는 휴리스틱입니다. 다음 요소를 계산합니다.

- 컨테이너 내측 L×W×H와 최대 적재중량
- 문 개구부 폭·높이와 통과 여유
- 제품 실치수 → 포장 후 외형 변환
- 포장 자중의 총 적재중량 반영
- **적재 방향 3단계**: 입력 방향 고정 / 세움 유지 방향전환 / 모든 방향 허용(눕힘 포함)
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

## v1.5 / 블록 최적화·입력 단순화

- `90° / 옆 눕힘 / 앞 눕힘` 용어를 제거하고 **적재 방향 3단계**로 정리했습니다.
- 한 개의 모호한 적층 체크 대신 **적층 역할 4단계**로 하부 받침과 상부 적재 가능 여부를 구분합니다.
- 동일 품목을 반복 블록으로 만들기 위해 여러 화물 그룹 순서를 자동 비교하는 **multi-start 블록 패킹**을 추가했습니다.
- 같은 높이의 여러 받침 화물 상부면을 합산하여, 하나의 상부 화물이 품목 경계에 걸쳐도 설정한 지지율을 만족하면 배치 후보로 사용합니다.
- **도면 밀착 블록** 프리셋을 추가했습니다.
- 컨테이너별 `블록 밀도`, `블록 외곽 체적`, `블록 내부 공극`, `배치 검증` 결과를 제공합니다.
- 회귀 테스트 `npm run test:cad`를 추가했습니다.
