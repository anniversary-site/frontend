# frontend.

URLUV 기념일 주문서·운영자 프런트엔드

피그마와 사용자·운영자 API 명세서를 기준으로 구현합니다.

## 실행

- 개발: `npm run dev`
- 빌드: `npm run build`
- 타입 검사: `npm run typecheck`
- 테스트: `node --test tests/*.test.mjs`

## 화면 흐름

- 사용자: MAIN → 주문 시작 → 템플릿 선택 → 주문자 정보·수령 기간 → 콘텐츠 입력 → 주문 확인 → 접수 화면
- 큐피드(템플릿 1)와 크리스마스(템플릿 3): 템플릿 시작 안내를 확인하고 주문자 이름·전화번호·수령 기간을 입력합니다. 이어 실제 사이트의 로그인 화면에서 받는 분 이름·비밀번호·힌트를 입력하고 INFORMATION → LETTER(AI 도움 포함) → 사진 → 영상 → 음악 → 링크 순서로 사이트 창 안에서 초안을 작성합니다. 각 단계의 예시는 저장값이 아니며, 저장·다음 시 기존 주문 초안 API를 사용합니다.
- 운영자: `/admin` 로그인 → 주문 일정·주문 목록·문자 관리·운영자 관리
- 디자인: [사용자 주문 사이트](https://www.figma.com/design/LKFvy02tc2OrdE7dtLAUdf?node-id=123-821), [운영자 사이트](https://www.figma.com/design/LKFvy02tc2OrdE7dtLAUdf?node-id=123-822)

## 구현 범위

### 사용자

- 템플릿·기념일 선택, 주문자 정보·수령 기간 입력, 필수값 검증
- 메인·서브 문구, AI 문구 생성·적용, 사진·영상 업로드·삭제 및 캡션·제목 저장
- 템플릿별 document·슬롯 수·최소 사진 수와 API의 입력·파일 제한 반영
- 주문서 생성·저장·불러오기, 이름·전화번호 조회 및 여러 주문서 중 선택
- 주문 제출·접수 결과·납품 링크 표시, 요구사항 등록·조회
- 주문서 ID·토큰을 localStorage에 보관하고 백엔드 모드에서 새로고침 후 복원
- 반응형 화면, 토스트·바텀시트·미리보기·키보드 포커스 처리

### 운영자

- 이메일·비밀번호 로그인, 로그아웃·비밀번호 변경
- 관리자 토큰을 sessionStorage에 보관하고 만료·401 응답 시 로그인 화면으로 복귀
- 로그인 확인 후 관리자 본문을 별도 컴포넌트로 로딩
- 이번 주 마감 일정·사용 기간 달력, 월 이동·오늘 이동·주문 상세 확인
- 주문 검색·상태/입금 필터·페이지 이동, 작성 내용·요구사항·문자·처리 기록 조회
- 입금 확인·납품·취소, 버전 충돌 시 상세 재조회
- 문자 내용 복사 및 보냄·안 보냄·실패 상태 기록. 실제 발송은 운영자가 직접 수행
- 운영자 목록·추가·정지/해제, 모달 바깥 회색 배경 클릭 시 닫기

## API 연결

- 사용자: `src/services/API.js`에 API 15개, `mockup.js`에 사용자 목업.
- 운영자: `src/services/AdminAPI.js`에 API 13개, `adminMockup.ts`에 운영자 목업.
- 사용자와 운영자 요청 주소·사용 여부·토큰은 각각 분리합니다.

| 환경변수              | 용도                                                |
| --------------------- | --------------------------------------------------- |
| `VITE_API_URL`        | 사용자 API 주소 (`/api/v1` 포함)                    |
| `VITE_USE_BACKEND`    | `true`: 사용자 실제 서버, `false` 또는 미설정: 목업 |
| `VITE_ADMIN_BACK_URL` | 관리자 API 주소 (`/api/admin/v1` 포함)              |
| `VITE_USE_ADMIN`      | `true`: 관리자 실제 서버, `false` 또는 미설정: 목업 |
| `VITE_CHRISTMAS_EDITOR_URL` | 크리스마스 제작 모드 iframe 주소. 로컬에서는 같은 작업 공간의 템플릿을 자동 제공하고, 스테이징은 템플릿의 `develop` Vercel Preview 주소, 운영은 `santa.urluv.shop`을 기본으로 사용합니다. |
| `VITE_CUPID_EDITOR_URL` | 큐피드 제작 모드 iframe 주소. 로컬에서는 같은 작업 공간의 큐피드 템플릿을 자동 제공하고, 스테이징은 템플릿의 `develop` Vercel Preview 주소, 운영은 `cupid.urluv.shop`을 기본으로 사용합니다. |

- `.env`는 Git에서 제외합니다. 환경변수 변경 후 개발 서버 재시작 또는 재배포가 필요합니다.
- 목업은 메모리 기반으로 새로고침 시 초기화됩니다. 관리자도 다시 로그인해야 합니다.
- 목업 관리자 계정: `admin@urluv.local` / `demo-password`.
- 실제 관리자 계정은 백엔드에서 발급하며 `VITE_ADMIN_PW`는 사용하지 않습니다.
- 기존 IndexedDB 저장 구현인 `draftRepository.ts`는 현재 화면에서 사용하지 않습니다.

## 주문서 저장·기간

- 이름·전화번호 입력 전에도 저장할 수 있으며 같은 브라우저에서 이어서 작성합니다.
- 다른 기기에서는 이름·전화번호로 조회합니다. 조회 시 토큰이 재발급되며 문자 본인 인증은 없습니다.
- 사진·영상은 선택 즉시, 캡션·제목은 팝업 완료 시, 일반 입력값은 저장·다음에서 저장합니다.
- 최소 시작일은 API 설정을 사용하며 기본 7일을 선택합니다.
- 기존 기간 추가 요금은 7일까지 무료, 이후 7일 단위로 1,000원입니다. 예상 금액에 합산하며 제출 후 확정 금액은 서버 응답을 표시합니다.

## 라우팅 구조

| URL               | 화면                    |
| ----------------- | ----------------------- |
| `/`               | 메인                    |
| `/order`          | 주문 시작               |
| `/order/load`     | 이름·전화번호 조회      |
| `/order/template` | 템플릿·기념일 선택      |
| `/order/info`     | 주문자 정보·수령 기간   |
| `/order/content`  | 문구·미디어 입력        |
| `/order/review`   | 주문 확인               |
| `/order/done`     | 접수 결과·요구사항      |
| `/admin`          | 운영자 로그인·관리 화면 |

- `src/routes/RootRoutes.tsx`: 사용자·운영자 화면 분리.
- `src/routes/AppRoutes.tsx`, `paths.ts`: 사용자 페이지와 URL 연결.
- `src/context/OrderContext.tsx`: 사용자 주문서 공통 상태.
- `src/pages/admin/`: 운영자 화면과 모달.
- 배포 시 `/order/*`, `/admin` 직접 접속·새로고침을 위한 SPA fallback 설정이 필요합니다.

## 검증·남은 작업

- 타입 검사·프로덕션 빌드 및 테스트 13개 통과. 목업 흐름·인증·상태 전이·버전 충돌·요청 형식을 확인했습니다.
- 실제 백엔드와의 통합 검증 및 브라우저 시각 검증은 남아 있습니다.
- 운영자 배포 도메인은 명세의 `ADMIN_FRONTEND_ORIGIN`과 맞춰야 합니다.
- 기간 추가 요금의 서버 정책 일치 여부 확인 및 완성 기념일 웹사이트 제작이 필요합니다.
- Vercel의 `develop` 미리보기 배포 주소는 `urluv-order.vercel.app`입니다. 필요하면 이 배포에 `edit.urluv.shop`을 별칭으로 연결합니다.

## 테스트 배포와 운영 반영

- `develop`은 Vercel 미리보기 배포 대상입니다(`vercel.json`). 현재 스테이징 주소 `urluv-order.vercel.app`에서 먼저 확인합니다. `edit.urluv.shop`이 필요하면 Vercel 프로젝트의 Domains에서 Preview 환경 `develop` 브랜치에 연결하고, Vercel이 안내하는 DNS 레코드를 추가합니다.
- 큐피드와 크리스마스 템플릿의 `develop` Vercel Preview 주소가 주문 프론트에 기본값으로 연결돼 있습니다. 두 주소의 `/order-editor.js`가 200으로 응답해야 튜토리얼이 열립니다. 현재 템플릿 Preview는 Vercel Authentication으로 보호돼 있어 로그인 페이지로 리디렉션됩니다. Vercel 프로젝트의 Deployment Protection 설정에서 스테이징 접근 방법을 결정해야 합니다. 다른 공개 주소를 쓸 때는 주문 프론트 Preview 환경의 `VITE_CUPID_EDITOR_URL`, `VITE_CHRISTMAS_EDITOR_URL`을 설정하고 재배포합니다.
- 기존 운영 백엔드를 함께 쓰므로 서버 `FRONTEND_ORIGIN`에 `https://urluv-order.vercel.app`을 추가해야 합니다. `edit.urluv.shop`이나 `santa-edit.urluv.shop`도 실제로 쓸 때만 추가합니다. 스테이징에서 만든 주문 초안과 제출 주문은 운영 DB에 저장됩니다. 테스트 주문을 구분할 이름을 사용하고 실제 입금 확인·문자 발송 단계는 주의해 진행합니다.
- 테스트가 끝나면 두 템플릿을 각각 운영 배포하고, 프론트 변경을 `main`에 반영합니다. 운영 프론트는 Vercel이 아니라 `main` 푸시 시 GitHub Actions가 S3·CloudFront에 배포합니다.

## 컨벤션

- `main`: GitHub Actions가 S3·CloudFront에 배포하는 운영(prod) 브랜치.
- `develop`: 개발 기준 브랜치. 최신 develop에서 작업 브랜치를 만들어 작업 후 develop에 머지해 주세요.
- 배포할 변경사항은 develop에서 확인한 뒤 main에 머지합니다.
- 브랜치: `feat/기능명`, `fix/수정내용`, `docs/문서내용`, `chore/작업내용`.
- 커밋: `feat: message`, `fix: message`, `docs: message`, `chore: message`.

## 코드 스타일과 타입

- `src/index.css`: 공통 디자인 토큰·기본 스타일.
- `src/App.css`, `src/pages/admin/AdminPage.css`: 사용자·운영자 화면 스타일.
- `src/types/`, `src/services/*.d.ts`: 주문서·운영자·API 공통 타입.
- TypeScript strict 모드, 빌드 전 타입 검사.
- Prettier: 2칸 들여쓰기, 작은따옴표, 세미콜론 생략, 최대 줄 길이 100자.
- `npm run format`, `npm run format:check`: 코드 정렬 및 확인.
