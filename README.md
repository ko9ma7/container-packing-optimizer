# Container Fit

컨테이너 **내측 규격**과 화물의 **외형 치수 + 실제 사용 가능한 내부 빈 공간**을 함께 계산하여 컨테이너 종류·수량·배치 좌표를 제안하는 브라우저 기반 적재 최적화 웹서비스입니다.

## Preview

20ft Standard, 40ft Standard, 40ft High Cube의 내측 규격을 기본 제공하며, 사용자 규격을 추가할 수 있습니다. 화물별 L×W×H·중량·수량·회전·적층 여부를 입력하고, 상부 개방 탱크나 프레임처럼 내부가 비어 있으면 내측 L×W×H를 별도로 등록해 작은 화물을 먼저 삽입한 뒤 남은 화물만 컨테이너에 배치합니다.

## Features

- 20STD / 40STD / 40HC 기본 내측 규격 및 사용자 컨테이너 규격 추가
- 기본 컨테이너의 문 개구부 폭·높이 통과 가능성 검사
- 화물 외형 L×W×H, 중량, 수량 관리
- 자유 회전 / 세움 유지 / 방향 고정
- 상부 적재 가능 여부 및 최소 지지면적 조건
- 좌우·앞뒤 품목 간격과 컨테이너 벽면·천장 여유 반영
- 상부 개방 탱크·프레임·빈 케이스의 내부 사용가능 공간 재활용
- 내부 공간 허용 중량 별도 설정
- 컨테이너 수량 자동 선정 및 컨테이너별 배치
- 간이 3D 등각 시각화, 정확한 X/Y/Z 좌표와 방향 표시
- 내부 삽입 화물 리스트와 절감된 외부 점유 체적 계산
- 프로젝트 JSON 저장/불러오기, 화물 CSV 불러오기
- 결과 JSON / 배치 CSV 다운로드
- LocalStorage 자동 저장
- 320 / 375 / 430 / 768 / 1024 / 1440px 반응형 대응
- GitHub Pages 자동 배포

## Tech Stack

- HTML5
- CSS3
- JavaScript ES Modules
- Node.js 빌드/개발 서버 스크립트
- Browser LocalStorage

런타임 외부 라이브러리가 없어 GitHub Pages에서 가볍게 동작합니다.

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

빌드 결과는 `dist/`에 생성됩니다. 모든 내부 경로는 상대 경로를 사용하므로 GitHub Pages의 `https://USERNAME.github.io/REPOSITORY/` 하위 경로에서도 동작합니다.

## Preview Build

```bash
npm run preview
```

기본 주소는 `http://localhost:4173/` 입니다.

## GitHub Pages Deployment

1. 새 GitHub Repository를 생성합니다.
2. 이 프로젝트 전체를 저장소에 push 합니다.
3. 저장소 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 선택합니다.
4. `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 `npm ci → npm run build → deploy-pages` 순서로 자동 배포합니다.
5. 배포 완료 후 Pages URL을 그대로 공유하면 됩니다.

## Configuration

기본 컨테이너 규격과 예제 화물은 `src/defaults.js`에서 관리합니다. 서비스명과 Open Graph 메타 정보는 `index.html`에서 변경할 수 있습니다.

실제 배포 URL이 확정되면 다음을 실제 주소에 맞추는 것을 권장합니다.

- canonical URL
- `og:url`
- `sitemap.xml`

CSV 화물 양식은 웹서비스의 **CSV 양식** 버튼에서 바로 다운로드할 수 있습니다.

## Packing Model

현재 엔진은 축 정렬(orthogonal) 직육면체를 대상으로 하는 휴리스틱입니다. 다음 요소를 계산합니다.

- 컨테이너 내측 L×W×H와 최대 적재중량
- 문 개구부 폭·높이와 선택된 화물 방향의 기본 통과 여부
- 화물 외형 점유
- 자유 회전 / 세움 유지 / 방향 고정
- 좌우·앞뒤 품목 간 최소 간격
- 벽면·천장 여유
- 적층 가능 여부와 최소 지지면적
- 화물 내부 사용가능 L×W×H 공간 및 내부 최대중량
- 내부에 삽입된 화물의 중량을 상위 화물 및 컨테이너 적재중량에 합산

내부 공간 활용은 먼저 탱크·프레임의 내측 공간을 작은 별도 Bin으로 보고 작은 화물을 배치한 뒤, 외부로 남은 화물만 컨테이너 최적화에 넘기는 방식입니다.

실제 출하 전에는 반입 중 회전 경로, 포크 진입 방향, 라싱, 제품 압축강도, 바닥 점하중, 무게중심, 위험물 격리, 법규 등을 별도로 확인해야 합니다.

## Custom Domain

GitHub Pages의 Custom domain 설정에서 도메인을 연결한 뒤 HTTPS를 활성화하세요. 필요하면 `public/CNAME`에 도메인 한 줄을 추가할 수 있습니다.

## License

사내·개인 프로젝트에 맞게 수정해서 사용할 수 있습니다. 외부 공개 배포 시 조직 정책에 맞는 LICENSE 파일을 추가하세요.
