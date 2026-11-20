# 잇:다 (eat 多)

식이 제한이 있는 서울대학교 구성원이 학내 비학식당의 메뉴별 식재료 정보를 확인할 수 있도록 돕는 웹앱

최신 PRD와 기능정의서 v1.1.0(2026-11-20 확인)을 기준으로 한국어·영어 화면, 7개 식재료 항목, 6개 필터 태그를 제공합니다. 조회는 로그인 없이 가능하고, 구글 로그인 후 제보·신고와 내 제보 확인을 지원하며 운영진이 승인한 정보만 공개합니다. 아래 문서는 구현 대상의 요약입니다. 환경, 백엔드, 화면은 작업 3~5에서 나누어 검토합니다.

## 처음 작업을 맡으면

AI 코딩 도구에서 이 저장소 폴더를 열고 아래 한 문장에 맡은 일만 넣어 보내세요.

> 팀 규칙대로 [맡은 일] 작업해 줘.

예: “팀 규칙대로 식당 및 메뉴 검색 작업해 줘.” AI가 [팀 작업 지침](AGENTS.md)에 따라 자료 확인, 작업 등록 확인, 구현, 검사, 셀프리뷰, PR 준비를 이어서 수행합니다. 팀원은 필요한 결정에 답하고 마지막에 결과를 직접 확인하면 됩니다. 준비가 필요한 첫 사용자는 [첫 작업 안내](docs/first-task.md)를 참고하세요. PR은 성은영(`@Eun-Y0ung`)의 승인 후 병합합니다.

## 프로젝트 자료

- [팀 Google Drive](https://drive.google.com/drive/folders/161wj4bWoihZ3NlYlhuZxB8xf_3R2SZ_g) — 프로젝트 공유 자료를 찾는 시작 위치입니다.
- [설계 자료 폴더](https://drive.google.com/drive/folders/1dQFtCVjYneL9wQ7B_lJL9zVF24d1OhKj) — PRD와 기능정의서를 확인합니다.
- [PRD](https://docs.google.com/document/d/1mKtalKrWTfE0ME1OB4wfT6ntDxUADFulkBatFlnQEnU/edit) · [기능정의서](https://docs.google.com/spreadsheets/d/1gz_mPcyv0wkcNCSgEGfBRO6cN5kmBx0osrvvxVq84Rk/edit) — 작업 전 최신 원문을 확인합니다.
- [Figma 와이어프레임](https://www.figma.com/design/TWl3V8WqKMYTOxBvd6qusY/%EB%A7%90%EB%B9%9B-%EC%99%80%EC%9D%B4%EC%96%B4%ED%94%84%EB%A0%88%EC%9E%84?node-id=0-1) — 화면 작업 시 관련 화면과 흐름을 확인합니다.

자료를 읽으려면 각 서비스의 접근 권한과 AI 도구의 연결이 필요할 수 있습니다. 와이어프레임에 표시된 모든 화면이 이번 작업 범위에 포함되는 것은 아닙니다.

## 팀 문서

- [서비스 범위](docs/requirements.md)
- [기능 목록과 우선순위](docs/features.md)
- [식재료·필터·제보 정책](docs/data-policy.md)
- [작업 목록](docs/tasks.md)
- [검증 기준](docs/checklist.md)
- [개발 범위와 품질 규칙](docs/development.md)
- [실수와 재발 방지 기록](docs/mistakes.md)
- [첫 작업 안내](docs/first-task.md)
- [작업 카드 양식](docs/task-card-template.md)
- [기여 방법](AGENTS.md)

## 개발 환경

PRD를 기준으로 다음 기술을 사용해 반응형 웹앱을 개발합니다.

| 구분 | 기술과 용도 |
| --- | --- |
| 서비스 형태 | 모바일과 PC 브라우저에서 사용하는 반응형 웹앱 |
| 프론트엔드 | React · JavaScript |
| 지도 | NAVER Maps API |
| 백엔드 | Supabase — 데이터베이스, 구글 로그인, 사진 저장 |
| 배포 | Vercel |

## 설치·실행 상태

[공통 데이터 계약](docs/api-contract.md)을 기준으로 작업 4는 `backend/`에 PostgreSQL 스키마와 권한 검사를, 작업 5는 `frontend/`에 React 앱과 화면 검사를 추가합니다. 환경 PR을 먼저 검토한 뒤 각 기능 PR을 연결합니다.

Node.js 24에서 해당 작업 브랜치의 영역 디렉터리로 이동한 뒤 다음 명령을 사용합니다.

| 영역 | 설치와 검사 | 실행과 확인 |
| --- | --- | --- |
| 백엔드 | `npm ci`, `npm test` | 격리된 로컬 PostgreSQL에서 권한·제보 반영을 확인합니다. |
| 프론트엔드 | `npm ci`, `npm test` | `npm start` 후 http://127.0.0.1:4173 에서 가상 식당을 탐색합니다. 빌드 출력은 `frontend/dist/index.html`입니다. |

개발·운영 프로젝트를 각각 구성합니다. 기본 로컬 모드는 서비스 키 없이 동작합니다. 연결용 공개 설정은 프론트엔드 작업의 README를 따릅니다. PR의 영역별 검사 정의는 [워크플로](.github/workflows/checks.yml)에 있으며, 병합 차단 및 승인 강제 여부는 저장소 설정에서 별도 확인합니다.
